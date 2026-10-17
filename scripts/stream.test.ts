import { describe, expect, test } from "bun:test";
import { signSession, verifySignedSession } from "../netlify/edge-functions/stream";

const SECRET = "unit-test-secret";
const NOW = 1_700_000_000_000;
const IP = "203.0.113.7";

const SESSION_MIN_AGE_MS = 10_000;
const SESSION_TTL_MS = 30 * 60 * 1000;

async function token(secret: string, issuedAt: number, ip: string) {
  return signSession(secret, issuedAt, ip);
}

describe("stream/signed sessions", () => {
  test("a token issued for an IP verifies for that IP", async () => {
    const signed = await token(SECRET, NOW, IP);
    expect(signed.startsWith(`${NOW}.`)).toBe(true);
    expect(await verifySignedSession(SECRET, signed, IP, NOW + SESSION_MIN_AGE_MS)).toBe(true);
  });

  test("the warm-up window is enforced server-side", async () => {
    const signed = await token(SECRET, NOW, IP);
    // Too young: the client cannot fake the wait by claiming it passed.
    expect(await verifySignedSession(SECRET, signed, IP, NOW + SESSION_MIN_AGE_MS - 1)).toBe(false);
    expect(await verifySignedSession(SECRET, signed, IP, NOW + SESSION_MIN_AGE_MS)).toBe(true);
  });

  test("expired tokens are rejected", async () => {
    const signed = await token(SECRET, NOW, IP);
    expect(await verifySignedSession(SECRET, signed, IP, NOW + SESSION_TTL_MS + 1)).toBe(false);
  });

  test("a token is bound to its issuing IP", async () => {
    const signed = await token(SECRET, NOW, IP);
    expect(await verifySignedSession(SECRET, signed, "198.51.100.4", NOW + SESSION_MIN_AGE_MS)).toBe(false);
  });

  test("a token is bound to its signing secret", async () => {
    const signed = await token(SECRET, NOW, IP);
    expect(await verifySignedSession("another-secret", signed, IP, NOW + SESSION_MIN_AGE_MS)).toBe(false);
  });

  test("tampering with the timestamp or the signature is detected", async () => {
    const signed = await token(SECRET, NOW, IP);
    const [, sig] = signed.split(".");

    const movedForward = `${NOW + 60_000}.${sig}`;
    expect(await verifySignedSession(SECRET, movedForward, IP, NOW + 120_000)).toBe(false);

    const flipped = `${NOW}.${sig.slice(0, -1)}${sig.at(-1) === "A" ? "B" : "A"}`;
    expect(await verifySignedSession(SECRET, flipped, IP, NOW + SESSION_MIN_AGE_MS)).toBe(false);
  });

  test("malformed tokens are rejected without throwing", async () => {
    for (const broken of ["", "notatoken", ".abc", "12345", "abc.def", `${NOW}.!!!`]) {
      expect(await verifySignedSession(SECRET, broken, IP, NOW + SESSION_MIN_AGE_MS)).toBe(false);
    }
  });

  test("IPv6 clients are supported (the token is not colon-split)", async () => {
    const ipv6 = "2001:db8::1";
    const signed = await token(SECRET, NOW, ipv6);
    expect(await verifySignedSession(SECRET, signed, ipv6, NOW + SESSION_MIN_AGE_MS)).toBe(true);
    expect(await verifySignedSession(SECRET, signed, "2001:db8::2", NOW + SESSION_MIN_AGE_MS)).toBe(false);
  });
});
