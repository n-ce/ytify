# Briefing for Agent: IP Abuse Mitigation — History, Learnings, and Final Design

## 1. Context

The user operates a Netlify Edge Function at path `/s/:id` (the "ytify fallback service") that acts as a proxy to RapidAPI's `yt-api.p.rapidapi.com/dl` endpoint. It's used for:
- **Link previews** (HTML response for social media bots + browsers)
- **JSON API responses** (for the ytify app, gated behind a 20-second per-IP cooldown tracked in Netlify Blobs)

The function has been suffering sustained abuse from a small number of IPs making high-volume or high-concurrency requests. The user is on **Netlify's legacy free plan** — no native `rateLimit` config, and Netlify Blobs has no atomic operations.

---

## 2. History of the Conversation

### Phase 1 — Expanding the ban list
User had a `HARD_BANNED_SUBNETS` array of ~22 entries and wanted to add new offenders from a violations dataset. Provided data:

```
167.7.248.164: 57 violations
45.4.36.18: 1147 violations  ← worst ever encountered
76.81.148.73: 35, 76.81.148.72: 39
105.114.36.194: 151
199.27.134.241: 114
201.28.218.83: 132
179.50.2.2: 103
156.200.109.165: 66
...and several sub-50 IPs
```

**Action taken:** Added 100+ violators as full IPs, aggregated `76.81.148.72` + `.73` into subnet `76.81.148.`, and used `startsWith()` matching (which naturally handles both full IPs and prefixes).

### Phase 2 — Threshold tuning
User asked to "add all 50+". Final additions:
- `45.4.36.18` (1147)
- `105.114.36.194` (151)
- `201.28.218.83` (132)
- `199.27.134.241` (114)
- `179.50.2.2` (103)
- `156.200.109.165` (66)
- `167.7.248.164` (57)

### Phase 3 — Subnet aggregation analysis
User asked whether aggregating individual IPs into `/24` subnets would reveal hidden 50+ offenders. Analysis of full dataset by `/24`:

| Subnet | Sum | Status |
|---|---|---|
| `76.81.148.` | 74 | ✅ Already added as subnet |
| All others | <50 or single-IP | Already covered individually |

**No new subnets qualified.** The only case where aggregation pushed a group over 50 was `76.81.148.` — already handled.

### Phase 4 — Old dataset review
User provided a second, older dataset dominated by Cloudflare anycast IPs (`162.158.x`, `172.68.x`, `172.69.x`, `172.70.x`, `172.71.x`, `104.22.x`, `104.23.x`). Aggregation revealed:
- **One new candidate:** `162.158.193.` (sum 56) — but flagged as Cloudflare WARP/proxy anycast, risky to block
- **`203.28.67.`** — user already banned this subnet, but old data showed only 30 violations. Flagged as possibly stale.

**Conclusion:** Old data is dramatically more Cloudflare-heavy than new data, suggesting the existing Cloudflare bans are working as intended and pushing abusers toward direct-connect IPs.

### Phase 5 — CDN rules review
User had two site-wide CDN block rules:

**Rule 1:** `203.28.67.142`, `210.14.11.154`, `190.107.19.30`
**Rule 2:** `190.217.64.170`, `41.224.2.11`, `47.150.43.97`

**Finding:** 5 of 6 were already in `HARD_BANNED_SUBNETS`. Only `47.150.43.97` was unaccounted for — not in either dataset. Ghost entry.

### Phase 6 — Live log analysis
User provided one day of live `[FAST-DROP]` logs:
- `50.86.10.234` — 6 hits
- `103.161.250.10` — 5 hits
- `173.235.97.34` — 1 hit

**Key observations:**
- Only 3 of 30 banned entries triggered in 24 hours
- Zero Cloudflare-range hits — supports removing them
- One `[VALIDATION ERROR]` from RapidAPI returning `{"status":"fail","error":"Retry","code":504}` — transient upstream failure being logged as validation error
- Both top offenders hit repeatedly in bursts (08:30, 08:47, 08:50, 08:51, 08:53) — automated retry loop

### Phase 7 — The `45.4.36.18` mystery
User questioned why 1147 violations didn't decay. **Analysis of the decay mechanism:**

```ts
const periodsPassed = Math.floor(timePassed / SIX_HOURS_MS);
const newViolations = Math.max(0, record.totalViolations - periodsPassed);
```

- Decay is **1 violation per 6 hours**
- 1147 violations would take **~287 days** to clear
- Decay **only fires when IP is quiet** — active abusers keep resetting `lastSeen`
- **Potential bug:** if `lastSeen` is `NaN` (legacy numeric schema), decay silently never fires

### Phase 8 — The rate limiting impossibility
User proposed alternatives to fix abuse:
1. **Add "matched subnet" logging** — accepted
2. **Tiered promotion system** (tier 1 cooldown → tier 2 soft-ban → tier 3 hard-ban → tier 4 permanent) — good design, but doesn't solve bursts
3. **Two-blob lock system** (Blob A main, Blob B lock) — user's idea to prevent stampedes

**Critical finding:** The two-blob idea **cannot work** because Netlify Blobs has no atomic operations. Timeline of a 1000-request burst:

```
t=0ms    Req 1:  read BlobB → empty → proceed → write BlobB
t=1ms    Req 2:  read BlobB → empty → proceed → write BlobB
t=2ms    Req 3:  read BlobB → empty → proceed → write BlobB
...
t=200ms  Req 1000: read BlobB → empty → proceed → write BlobB
```

**By the time BlobB is written, all 1000 requests have already passed the check.** Reads aren't linearizable across edge isolates, and Blob writes are async/buffered. The lock arrives after the stampede.

Netlify official docs explicitly state:
> **Do not build counters, balances, or read-modify-write logic on a blob key — even with `onlyIfMatch` retries.**

The only true fixes were:
- **Upstash Redis** with atomic `INCR` (paid external service)
- **Netlify's native rateLimit config** (not on legacy free plan)

Neither was acceptable to the user.

### Phase 9 — The breakthrough
User proposed a fundamentally different approach:

> "We can introduce a blob writer which temporarily allows an IP address using the app after 10 seconds of opening. For link previews we specifically only allow the social media bots."

**Why this works:**
- It's not a **rate limiter** — it's an **admission gate**
- The gate writes only **one boolean per session**, not a counter per request
- Race conditions become **benign** — 1000 concurrent "opens" all read `null` and all write "opened", but the outcome is identical regardless of who wins
- The actual RapidAPI call happens **after** the gate is confirmed, not during the burst
- The burst becomes 1000 cheap gate-writes (which don't matter) instead of 1000 expensive RapidAPI calls

**Social bot fast-path:** Link preview fetchers (facebookexternalhit, twitterbot, whatsapp, telegrambot, discordbot, slackbot, linkedinbot) are identifiable by User-Agent and are naturally low-volume. They bypass the gate entirely.

---

## 3. Key Learnings

1. **IP ban lists are whack-a-mole** — residential/mobile/Cloudflare ranges rotate. `45.4.36.18` proved the cooldown loop has serious gaps.

2. **Netlify Blobs is fundamentally unsuitable for rate limiting** — no atomic ops, no CAS, no INCR. "Last write wins" is the only model. Don't fight it.

3. **Multi-blob "lock" schemes don't work** — they only lengthen the race window. The read-then-write gap is not atomic regardless of how many keys you add.

4. **Concurrency is the real enemy, not frequency** — the 20-second cooldown handles sequential abuse. It does nothing against 1000 parallel requests.

5. **`onlyIfMatch` / `onlyIfNew` are optimistic concurrency primitives** — designed for preventing overwrites, not for counting. Do not use them for rate limiting.

6. **Linear decay is effectively permanent for high counts** — 1 per 6 hours means a 1147-count entry takes 287 days to clear. Consider percentage-based decay instead.

7. **Rate limiting must run before the handler** — either at the CDN/edge platform level, or through a pre-check gate. In-handler rate limiting via non-atomic storage is theater.

8. **Separate legitimate bot traffic from user traffic** — social media link preview bots are identifiable, predictable, and safe to fast-path.

9. **A session gate beats a rate limiter** — requiring one serializable "open" event before access is concurrency-proof because it's a boolean, not a counter.

10. **Cloudflare anycast ranges are dangerous to ban** — `162.158.x`, `172.68.x`, etc. are shared WARP/proxy ranges. Blocking them catches innocent users. Prefer single-IP bans on these ranges.

---

## 4. Final Design — Session Gate with Cryptographic ID

### Concept

When a user "opens the app," a **cryptographically random session ID** is generated at runtime and stored in Netlify Blobs with a 10-second TTL. Only after the TTL expires (verified against the stored timestamp) does the ID grant access to the edge function. Without a valid, unexpired session ID, requests to `/s/:id` are rejected.

### Why cryptographic randomness matters
- **Unguessable** — prevents clients from fabricating valid IDs
- **Unique per session** — no collisions, no accidental shares
- **Server-verified** — the blob is the source of truth, not the client

### Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Client opens app                                     │
│    → POST /open (or GET /open)                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Edge function generates session ID                   │
│    const sessionId = crypto.randomUUID();               │
│    (or: crypto.getRandomValues(new Uint8Array(16))      │
│     → hex string)                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Write to Blobs with timestamp                        │
│    key:   `session:${sessionId}`                        │
│    value: { createdAt: Date.now(), ip: clientIp }       │
│    TTL:   none (self-managed via createdAt check)       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Return sessionId to client                           │
│    (e.g. in a cookie, or as JSON response)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Client waits 10 seconds (UX: loading screen)         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Client requests /s/:id?s=<id> with session ID header │
│    or cookie                                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Edge function verifies:                              │
│    - session ID exists in Blobs                         │
│    - Date.now() - createdAt >= 10_000                   │
│    - (optional) IP matches                              │
│    - (optional) not expired (e.g. < 30 minutes old)     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 8. If valid → proceed to RapidAPI call                  │
│    If invalid → 403                                     │
└─────────────────────────────────────────────────────────┘
```

### Social bot fast-path

```
If User-Agent matches /facebookexternalhit|twitterbot|whatsapp|
  telegrambot|discordbot|slackbot|linkedinbot/i
→ Skip session check entirely
→ Serve HTML link preview directly
```

### Why this is concurrency-safe

- **Opening burst:** 1000 concurrent `/open` requests each generate a unique ID and write to Blobs. Last-write-wins doesn't matter — they're **different keys**. No collision, no lost data.
- **Access burst:** 1000 concurrent `/s/:id` requests each carry their own session ID. Blob reads are per-key, so no shared state race. Each request independently validates.
- **One session per user:** even if the same client calls `/open` 100 times, each gets a distinct ID. They can only use one. The 10-second delay still applies to each.
- **The 10-second wait is enforced server-side** by comparing `Date.now()` against the stored `createdAt`. Client-side timers are irrelevant — the client can't fake the wait because they don't control the blob.

### Why this stops the abuse

The abuser's pattern was: **1000 concurrent requests to `/s/:id`**. Now:

1. Abuser must first call `/open` — one new session ID per call
2. Even if they call `/open` 1000 times in parallel, they get 1000 session IDs — but each has a fresh `createdAt`
3. They **cannot use any of them** until 10 seconds have passed (server-enforced)
4. By the time 10 seconds pass, their session IDs are stale — they'd need to spam `/open` again, endlessly

To abuse the system now, they'd need to:
- Call `/open` 10 seconds ahead of time, hold the ID, then burst
- Which means **they can only burst once every 10 seconds**
- Which is exactly the throttle you want

### Optional hardening

- **IP binding:** store `clientIp` with the session; reject if a different IP uses it
- **Session TTL:** reject if `createdAt` is older than, say, 30 minutes — prevents hoarding pre-opened sessions
- **Rate limit `/open` itself** with the existing `HARD_BANNED_SUBNETS` gate — the abuser can't even get a session
- **Cryptographic signature:** instead of storing the ID in Blobs, sign `{id, createdAt, ip}` with HMAC and return the signed token — stateless verification, no blob write per session

### Tradeoffs

- **Adds ~10 seconds of UX latency** on first app open — mitigated by a loading screen
- **Requires a client change** to call `/open` and store the session ID
- **Session IDs accumulate in Blobs** — need periodic cleanup, or use HMAC-signed stateless tokens instead
- **Does not replace the existing cooldown** — the 20-second cooldown still applies during the session

---

## 5. Summary for Agent

**Problem:** Netlify Edge Function at `/s/:id` is being abused by concurrent bursts from a small set of IPs. Existing `HARD_BANNED_SUBNETS` + 20-second cooldown is insufficient because Netlify Blobs has no atomic operations, so concurrent requests all pass the check before any write lands.

**Solution:** Replace the per-request rate limiter with a **session admission gate**:
1. Client calls `/open`
2. Server generates `crypto.randomUUID()` (cryptographic session ID)
3. Server stores `{sessionId, createdAt, ip}` in Blobs
4. Client waits 10 seconds (server-enforced via `createdAt`)
5. Client calls `/s/:id` with session ID
6. Server verifies: ID exists, 10s elapsed, IP matches, not expired
7. Only then does the RapidAPI call proceed

**Why it works:** The gate converts N per-request writes into 1 session write per user, eliminating the counter race entirely. Concurrent access is safe because each session has a unique key.

**Social bots:** Fast-pathed by User-Agent match — no session required for link previews.

**Legacy plan constraint:** No native rate limit, no atomic Blobs ops. This design works entirely within those constraints because it never needs atomic counting — only unique-key writes.

**Next steps:** Implement `/open` endpoint, session verification middleware in `/s/:id`, and a client change to call `/open` before rendering the app.