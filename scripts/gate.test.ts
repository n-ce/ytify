import { describe, expect, test } from "bun:test";
import { StreamGateDO } from "../src/backend/StreamGateDO";
import { fakeDurableState, postJson, readJson } from "./durableFixture";

describe("StreamGateDO", () => {
  test("acquires a lease for a new session key", async () => {
    const gate = new StreamGateDO(fakeDurableState() as any);
    const res = await postJson(gate, "/acquire", {
      key: "session-1",
      ip: "192.0.2.1",
      ttlMs: 5000,
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.granted).toBe(true);
    expect(typeof body.leaseUntil).toBe("number");
    expect(body.leaseUntil).toBeGreaterThan(Date.now());
    expect(body.keyIndex).toBe(0);
    expect(body.keyRemaining).toBe(500);
  });

  test("rejects concurrent request for the same lease key", async () => {
    const gate = new StreamGateDO(fakeDurableState() as any);
    await postJson(gate, "/acquire", {
      key: "session-concurrent",
      ip: "192.0.2.2",
      ttlMs: 5000,
    });

    const second = await postJson(gate, "/acquire", {
      key: "session-concurrent",
      ip: "192.0.2.3",
      ttlMs: 5000,
    });
    expect(second.status).toBe(200);

    const body = await second.json();
    expect(body.granted).toBe(false);
    expect(body.reason).toBe("leased");
    expect(typeof body.retryAfterMs).toBe("number");
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  test("enforces cooldown for requests from the same IP", async () => {
    const gate = new StreamGateDO(fakeDurableState() as any);
    const ip = "192.0.2.4";

    await postJson(gate, "/acquire", {
      key: "session-ip-1",
      ip,
      ttlMs: 5000,
    });

    const second = await postJson(gate, "/acquire", {
      key: "session-ip-2",
      ip,
      ttlMs: 5000,
    });
    expect(second.status).toBe(200);

    const body = await second.json();
    expect(body.granted).toBe(false);
    expect(body.reason).toBe("cooldown");
    expect(typeof body.retryAfterMs).toBe("number");
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  test("releases a lease and updates key remaining/resetAt telemetry", async () => {
    const gate = new StreamGateDO(fakeDurableState() as any);
    const key = "session-release-test";

    await postJson(gate, "/acquire", {
      key,
      ip: "192.0.2.5",
      ttlMs: 5000,
    });

    const releaseRes = await postJson(gate, "/release", {
      key,
      ip: "192.0.2.5",
      keyIndex: 0,
      remaining: 450,
      resetAt: Date.now() + 60000,
    });
    expect(releaseRes.status).toBe(200);
    expect(await releaseRes.json()).toEqual({ ok: true });

    // Acquire on a different IP using the same key now succeeds because the lease was released
    const reacquire = await postJson(gate, "/acquire", {
      key,
      ip: "192.0.2.6",
      ttlMs: 5000,
    });
    const reacquireBody = await reacquire.json();
    expect(reacquireBody.granted).toBe(true);
    expect(reacquireBody.keyRemaining).toBe(450);
  });

  test("exposes state endpoint with leases, keys, and cooldowns", async () => {
    const gate = new StreamGateDO(fakeDurableState() as any);
    await postJson(gate, "/acquire", {
      key: "session-state",
      ip: "192.0.2.7",
      ttlMs: 5000,
    });

    const state = await readJson(gate, "/state");
    expect(Array.isArray(state.leases)).toBe(true);
    expect(state.leases.some((l: any) => l.lease_key === "session-state")).toBe(
      true,
    );
    expect(Array.isArray(state.cooldowns)).toBe(true);
    expect(state.cooldowns.some((c: any) => c.ip === "192.0.2.7")).toBe(true);
  });
});
