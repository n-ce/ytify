import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

interface IPRecord {
  lastSeen: number;
  totalViolations: number;
}

interface RapidAPIState {
  keys: Array<{
    remaining: number;
    resetsat: number;
  }>;
  ips: Record<string, IPRecord>;
}

// 🛡️ The Heavy Offender Wall - Kicked out before any database or API interaction
const HARD_BANNED_SUBNETS = [
  "190.217.64.",
  "190.107.19.",
  "203.28.67.",
  "210.14.11.",
  "162.158.179.",
  "172.68.211.",
  "172.71.215.",
  "162.159.98.",
  "172.68.225.",
  "27.121.41.",
  "27.121.6.",
];

function getClientIp(request: Request, context: Context): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
}

async function getRapidAPIState() {
  const store = getStore("rapidapi");
  try {
    return (await store.get("data", { type: "json" })) as RapidAPIState | null;
  } catch (e) {
    return null;
  }
}

function selectBestKey(state: RapidAPIState | null, allKeys: string[]): { key: string; index: number } {
  const now = Date.now();

  const available = allKeys.map((k, idx) => {
    const entry = state?.keys[idx];
    if (!entry) return { key: k, index: idx, remaining: 500, resetsat: 0 };
    if (now > entry.resetsat) return { key: k, index: idx, remaining: 500, resetsat: 0 };
    return { key: k, index: idx, remaining: entry.remaining, resetsat: entry.resetsat };
  });

  available.sort((a, b) => b.remaining - a.remaining || a.resetsat - b.resetsat);
  return { key: available[0].key, index: available[0].index };
}

async function updateRapidAPIState(index: number, remaining: number, resetsat: number, ip: string) {
  const store = getStore("rapidapi");
  const state = (await getRapidAPIState()) || { keys: [], ips: {} };

  while (state.keys.length <= index) {
    state.keys.push({ remaining: 500, resetsat: 0 });
  }

  state.keys[index] = { remaining, resetsat };
  
  // Clean request: Safely resolve historical totals if transitioning from a raw numerical schema
  const existingRecord = state.ips[ip];
  const historicalViolations = existingRecord && typeof existingRecord === 'object' 
    ? existingRecord.totalViolations 
    : 0;

  state.ips[ip] = {
    lastSeen: Date.now(),
    totalViolations: historicalViolations
  };

  try {
    await store.setJSON("data", state);
  } catch (e) {
    console.error("Failed to update RapidAPI state:", e);
  }
}

export default async (request: Request, context: Context) => {
  const { id } = context.params;
  if (!id || id.length < 11) return new Response("Invalid ID", { status: 400 });

  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json");

  const clientIp = getClientIp(request, context);

  // Fast gateway firewall drop
  const isBanned = HARD_BANNED_SUBNETS.some(subnet => clientIp.startsWith(subnet));
  if (isBanned) {
    console.warn(`[FAST-DROP] Blocked heavy abuser ${clientIp} at the gate.`);
    return new Response(
      isJson ? JSON.stringify({ error: "Access denied" }) : "Access Denied",
      {
        status: 403,
        headers: { "content-type": isJson ? "application/json" : "text/plain" }
      }
    );
  }

  const rawKeys = Netlify.env.get("rkeys") || "";
  const allKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);

  if (!allKeys.length) {
    return new Response(JSON.stringify({ error: "No API keys configured" }), { status: 500 });
  }

  let selectedKey = "";
  let selectedIndex = 0;
  let state: RapidAPIState | null = null;

  if (isJson) {
    state = await getRapidAPIState();
    const now = Date.now();
    const BASE_COOLDOWN = 60000; 

    if (state && state.ips[clientIp]) {
      const record = state.ips[clientIp];
      
      // ✅ STRUCTURAL PROTECTION FALLBACK: Handle transitions from raw numbers to objects cleanly
      const lastSeenTime = record && typeof record === 'object' ? record.lastSeen : Number(record || 0);
      const timePassed = now - lastSeenTime;

      // 🛑 The Simple Rule: If they hit the server within less than 60 seconds, drop them.
      if (timePassed <= BASE_COOLDOWN) {
        // Guarantee structure allocation before setting internal values
        if (!state.ips[clientIp] || typeof state.ips[clientIp] !== 'object') {
          state.ips[clientIp] = { lastSeen: now, totalViolations: 0 };
        }

        // Increment tracking values safely for your metrics
        state.ips[clientIp].totalViolations += 1;
        state.ips[clientIp].lastSeen = now;

        const store = getStore("rapidapi");
        await store.setJSON("data", state);

        console.warn(`[VIOLATION] IP ${clientIp} requested early. Metrics Accumulator: ${state.ips[clientIp].totalViolations}. Sinking into noise pipe.`);

        // Infinite lazy-loading cryptographic entropy dump stream
        let chunksSent = 0;
        const chunkSize = 64 * 1024;
        const chunk = new Uint8Array(chunkSize);
        const totalChunks = Math.ceil((50 * 1024 * 1024) / chunkSize);

        const stream = new ReadableStream({
          async pull(controller) {
            if (chunksSent >= totalChunks) {
              controller.close();
              return;
            }
            crypto.getRandomValues(chunk);
            controller.enqueue(new Uint8Array(chunk));
            chunksSent++;
          }
        });

        return new Response(stream, {
          headers: { 'content-type': 'application/octet-stream' }
        });
      }
    }

    const selection = selectBestKey(state, allKeys);
    selectedKey = selection.key;
    selectedIndex = selection.index;
  } else {
    selectedIndex = Math.floor(Math.random() * allKeys.length);
    selectedKey = allKeys[selectedIndex];
  }

  try {
    const res = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${id}`, {
      headers: {
        "X-RapidAPI-Key": selectedKey,
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    const remaining = parseInt(res.headers.get("x-ratelimit-requests-remaining") || "0");
    const resetSec = parseInt(res.headers.get("x-ratelimit-requests-reset") || "0");

    const rawResponseText = await res.text();

    if (!res.ok) {
      console.error(`[RAPIDAPI ERROR] Key Index: ${selectedIndex}, Status: ${res.status}. Raw Payload: ${rawResponseText}`);
      if (isJson) {
        await updateRapidAPIState(selectedIndex, remaining, Date.now() + resetSec * 1000, clientIp);
      }
      throw new Error(`RapidAPI HTTP
