// Tests for ETag generation and validation

import { assertEquals, assertNotEquals } from "@std/assert";
import { generateEtag, validateEtag } from "../services/etag.ts";

Deno.test("generateEtag - returns quoted string format", () => {
  const etag = generateEtag({ foo: "bar" });
  assertEquals(etag.startsWith('"'), true);
  assertEquals(etag.endsWith('"'), true);
});

Deno.test("generateEtag - same data produces consistent hash prefix", () => {
  const data = { tracks: { "abc": { title: "Test" } } };
  const etag1 = generateEtag(data);
  const etag2 = generateEtag(data);
  
  // Both should have valid format but different timestamps
  assertEquals(etag1.startsWith('"'), true);
  assertEquals(etag2.startsWith('"'), true);
  
  // Hash part (before timestamp) should be consistent
  const hash1 = etag1.split("-")[0];
  const hash2 = etag2.split("-")[0];
  assertEquals(hash1, hash2);
});

Deno.test("generateEtag - different data produces different hashes", () => {
  const etag1 = generateEtag({ a: 1 });
  const etag2 = generateEtag({ b: 2 });
  
  const hash1 = etag1.split("-")[0];
  const hash2 = etag2.split("-")[0];
  assertNotEquals(hash1, hash2);
});

Deno.test("generateEtag - handles string input", () => {
  const etag = generateEtag("simple string");
  assertEquals(etag.startsWith('"'), true);
});

Deno.test("validateEtag - returns false for null client etag", () => {
  const result = validateEtag(null, '"abc-123"');
  assertEquals(result, false);
});

Deno.test("validateEtag - returns true for matching etags", () => {
  const etag = '"abc-123"';
  const result = validateEtag(etag, etag);
  assertEquals(result, true);
});

Deno.test("validateEtag - handles weak etag prefix", () => {
  const result = validateEtag('W/"abc-123"', '"abc-123"');
  assertEquals(result, true);
});

Deno.test("validateEtag - returns false for non-matching etags", () => {
  const result = validateEtag('"abc-123"', '"xyz-456"');
  assertEquals(result, false);
});
