// Tests for LRU Cache implementation

import { assertEquals } from "@std/assert";
import { LRUCache } from "../services/cache.ts";

Deno.test("LRUCache - set and get value", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  cache.set("a", 1);
  assertEquals(cache.get("a"), 1);
});

Deno.test("LRUCache - returns undefined for missing key", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  assertEquals(cache.get("missing"), undefined);
});

Deno.test("LRUCache - delete removes entry", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  cache.set("a", 1);
  assertEquals(cache.delete("a"), true);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("LRUCache - delete returns false for missing key", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  assertEquals(cache.delete("missing"), false);
});

Deno.test("LRUCache - clear removes all entries", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.clear();
  assertEquals(cache.size, 0);
});

Deno.test("LRUCache - size returns correct count", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  assertEquals(cache.size, 0);
  cache.set("a", 1);
  assertEquals(cache.size, 1);
  cache.set("b", 2);
  assertEquals(cache.size, 2);
});

Deno.test("LRUCache - evicts oldest when at capacity", () => {
  const cache = new LRUCache<string, number>(3, 60000);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  // At capacity, adding new entry should evict "a"
  cache.set("d", 4);
  
  assertEquals(cache.get("a"), undefined); // Evicted
  assertEquals(cache.get("d"), 4); // New entry
  assertEquals(cache.size, 3);
});

Deno.test("LRUCache - updates existing key", () => {
  const cache = new LRUCache<string, number>(10, 60000);
  cache.set("a", 1);
  cache.set("a", 2);
  assertEquals(cache.get("a"), 2);
  assertEquals(cache.size, 1);
});

Deno.test("LRUCache - accessing key updates LRU order", () => {
  const cache = new LRUCache<string, number>(3, 60000);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  
  // Access "a" to make it recent
  cache.get("a");
  
  // Add new entry, should evict "b" (oldest not accessed)
  cache.set("d", 4);
  
  assertEquals(cache.get("a"), 1); // Still present (was accessed)
  assertEquals(cache.get("b"), undefined); // Evicted
});

Deno.test("LRUCache - cleanup removes expired entries", () => {
  // Very short TTL for testing
  const cache = new LRUCache<string, number>(10, 1);
  cache.set("a", 1);
  
  // Wait for TTL to expire
  const start = Date.now();
  while (Date.now() - start < 10) { /* spin */ }
  
  const removed = cache.cleanup();
  assertEquals(removed, 1);
  assertEquals(cache.size, 0);
});
