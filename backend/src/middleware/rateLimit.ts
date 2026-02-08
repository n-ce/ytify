/**
 * ============================================================================
 * YTFY Backend Rate Limiting Middleware
 * ============================================================================
 * Purpose: Request rate limiting for API protection
 * Platform: Deno with Hono framework
 * Algorithms: Sliding window, Token bucket
 * ============================================================================
 */

import { Context, MiddlewareHandler, Next } from 'hono';

// ==========================================================================
// Types
// ==========================================================================

export interface RateLimitConfig {
  /** Maximum requests per window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key generator function */
  keyGenerator?: (c: Context) => string;
  /** Skip function */
  skip?: (c: Context) => boolean;
  /** Handler when rate limit exceeded */
  handler?: (c: Context) => Response;
  /** Headers to include */
  headers?: boolean;
  /** Custom message */
  message?: string;
  /** Status code for rate limited responses */
  statusCode?: number;
  /** Store type */
  store?: 'memory' | 'redis';
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

// ==========================================================================
// In-Memory Store
// ==========================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: number | null = null;
  
  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000) as unknown as number;
  }
  
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }
    
    // Increment existing
    entry.count++;
    return entry;
  }
  
  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry || entry.resetTime <= Date.now()) {
      return null;
    }
    return entry;
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// ==========================================================================
// Sliding Window Rate Limiter
// ==========================================================================

class SlidingWindowStore {
  private store = new Map<string, number[]>();
  
  async increment(key: string, windowMs: number, max: number): Promise<{
    allowed: boolean;
    count: number;
    oldestTimestamp: number | null;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create timestamps array
    let timestamps = this.store.get(key) || [];
    
    // Remove timestamps outside window
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Check if allowed
    if (timestamps.length >= max) {
      return {
        allowed: false,
        count: timestamps.length,
        oldestTimestamp: timestamps[0] || null,
      };
    }
    
    // Add new timestamp
    timestamps.push(now);
    this.store.set(key, timestamps);
    
    return {
      allowed: true,
      count: timestamps.length,
      oldestTimestamp: timestamps[0] || null,
    };
  }
  
  async get(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = this.store.get(key) || [];
    return timestamps.filter(t => t > windowStart).length;
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ==========================================================================
// Token Bucket Rate Limiter
// ==========================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

class TokenBucketStore {
  private store = new Map<string, TokenBucket>();
  
  async consume(
    key: string,
    maxTokens: number,
    refillRate: number, // tokens per second
    tokensToConsume: number = 1
  ): Promise<{
    allowed: boolean;
    remainingTokens: number;
  }> {
    const now = Date.now();
    let bucket = this.store.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
      };
    }
    
    // Calculate tokens to add based on time elapsed
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Try to consume tokens
    if (bucket.tokens >= tokensToConsume) {
      bucket.tokens -= tokensToConsume;
      this.store.set(key, bucket);
      return {
        allowed: true,
        remainingTokens: Math.floor(bucket.tokens),
      };
    }
    
    this.store.set(key, bucket);
    return {
      allowed: false,
      remainingTokens: Math.floor(bucket.tokens),
    };
  }
  
  async getTokens(key: string, maxTokens: number, refillRate: number): Promise<number> {
    const now = Date.now();
    const bucket = this.store.get(key);
    
    if (!bucket) return maxTokens;
    
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    return Math.min(maxTokens, Math.floor(bucket.tokens + tokensToAdd));
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ==========================================================================
// Default Configuration
// ==========================================================================

const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (c) => {
    // Use IP address as key
    const forwarded = c.req.header('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               c.req.header('x-real-ip') || 
               'unknown';
    return `ratelimit:${ip}`;
  },
  skip: () => false,
  handler: (c) => {
    return c.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
      429
    );
  },
  headers: true,
  message: 'Too Many Requests',
  statusCode: 429,
  store: 'memory',
};

// ==========================================================================
// Rate Limit Middleware
// ==========================================================================

/**
 * Create rate limit middleware
 */
export function rateLimitMiddleware(options: RateLimitConfig): MiddlewareHandler {
  const config = { ...DEFAULT_CONFIG, ...options };
  const store = new MemoryStore();
  
  return async (c: Context, next: Next) => {
    // Check if should skip
    if (config.skip(c)) {
      return next();
    }
    
    // Generate key
    const key = config.keyGenerator(c);
    
    // Increment counter
    const entry = await store.increment(key, config.windowMs);
    
    // Calculate rate limit info
    const info: RateLimitInfo = {
      limit: config.max,
      current: entry.count,
      remaining: Math.max(0, config.max - entry.count),
      resetTime: entry.resetTime,
    };
    
    // Add headers
    if (config.headers) {
      c.header('X-RateLimit-Limit', String(info.limit));
      c.header('X-RateLimit-Remaining', String(info.remaining));
      c.header('X-RateLimit-Reset', String(Math.ceil(info.resetTime / 1000)));
      c.header('RateLimit-Limit', String(info.limit));
      c.header('RateLimit-Remaining', String(info.remaining));
      c.header('RateLimit-Reset', String(Math.ceil(info.resetTime / 1000)));
    }
    
    // Check if rate limited
    if (entry.count > config.max) {
      c.header('Retry-After', String(Math.ceil((info.resetTime - Date.now()) / 1000)));
      return config.handler(c);
    }
    
    return next();
  };
}

/**
 * Create sliding window rate limiter
 */
export function slidingWindowRateLimiter(options: RateLimitConfig): MiddlewareHandler {
  const config = { ...DEFAULT_CONFIG, ...options };
  const store = new SlidingWindowStore();
  
  return async (c: Context, next: Next) => {
    if (config.skip(c)) {
      return next();
    }
    
    const key = config.keyGenerator(c);
    const result = await store.increment(key, config.windowMs, config.max);
    
    // Add headers
    if (config.headers) {
      c.header('X-RateLimit-Limit', String(config.max));
      c.header('X-RateLimit-Remaining', String(Math.max(0, config.max - result.count)));
      if (result.oldestTimestamp) {
        const resetTime = result.oldestTimestamp + config.windowMs;
        c.header('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
      }
    }
    
    if (!result.allowed) {
      const retryAfter = result.oldestTimestamp 
        ? Math.ceil((result.oldestTimestamp + config.windowMs - Date.now()) / 1000)
        : config.windowMs / 1000;
      c.header('Retry-After', String(retryAfter));
      return config.handler(c);
    }
    
    return next();
  };
}

/**
 * Create token bucket rate limiter
 */
export function tokenBucketRateLimiter(options: RateLimitConfig & {
  refillRate?: number; // tokens per second
}): MiddlewareHandler {
  const config = { ...DEFAULT_CONFIG, ...options };
  const refillRate = options.refillRate ?? config.max / (config.windowMs / 1000);
  const store = new TokenBucketStore();
  
  return async (c: Context, next: Next) => {
    if (config.skip(c)) {
      return next();
    }
    
    const key = config.keyGenerator(c);
    const result = await store.consume(key, config.max, refillRate);
    
    // Add headers
    if (config.headers) {
      c.header('X-RateLimit-Limit', String(config.max));
      c.header('X-RateLimit-Remaining', String(result.remainingTokens));
    }
    
    if (!result.allowed) {
      // Calculate retry time (time to get 1 token)
      const retryAfter = Math.ceil(1 / refillRate);
      c.header('Retry-After', String(retryAfter));
      return config.handler(c);
    }
    
    return next();
  };
}

// ==========================================================================
// Route-Specific Rate Limiters
// ==========================================================================

/**
 * Create rate limiters for different route groups
 */
export const rateLimiters = {
  // General API endpoints
  api: rateLimitMiddleware({
    max: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  }),
  
  // Search endpoints (more restrictive)
  search: rateLimitMiddleware({
    max: 30,
    windowMs: 60 * 1000, // 30 searches per minute
  }),
  
  // Authentication endpoints (very restrictive)
  auth: rateLimitMiddleware({
    max: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
  }),
  
  // Heavy endpoints (streaming, downloads)
  heavy: rateLimitMiddleware({
    max: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  }),
  
  // Webhook/callback endpoints
  webhook: rateLimitMiddleware({
    max: 1000,
    windowMs: 60 * 1000, // 1000 requests per minute
  }),
};

// ==========================================================================
// IP-based Rate Limiter with Trust Proxy
// ==========================================================================

/**
 * Create IP-based rate limiter with proxy trust
 */
export function createIpRateLimiter(
  options: RateLimitConfig & {
    trustProxy?: boolean;
    proxyHeaders?: string[];
  }
): MiddlewareHandler {
  const { trustProxy = true, proxyHeaders = ['x-forwarded-for', 'x-real-ip'], ...rateLimitOptions } = options;
  
  return rateLimitMiddleware({
    ...rateLimitOptions,
    keyGenerator: (c) => {
      let ip = 'unknown';
      
      if (trustProxy) {
        for (const header of proxyHeaders) {
          const value = c.req.header(header);
          if (value) {
            ip = value.split(',')[0].trim();
            break;
          }
        }
      }
      
      // Fallback to connection info (Deno-specific)
      // const connInfo = c.env?.connInfo;
      // if (!ip && connInfo?.remoteAddr) {
      //   ip = connInfo.remoteAddr.hostname;
      // }
      
      return `ratelimit:ip:${ip}`;
    },
  });
}

// ==========================================================================
// User-based Rate Limiter
// ==========================================================================

/**
 * Create user-based rate limiter
 */
export function createUserRateLimiter(
  options: RateLimitConfig & {
    getUserId: (c: Context) => string | null;
    fallbackToIp?: boolean;
  }
): MiddlewareHandler {
  const { getUserId, fallbackToIp = true, ...rateLimitOptions } = options;
  
  return rateLimitMiddleware({
    ...rateLimitOptions,
    keyGenerator: (c) => {
      const userId = getUserId(c);
      
      if (userId) {
        return `ratelimit:user:${userId}`;
      }
      
      if (fallbackToIp) {
        const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
                   c.req.header('x-real-ip') ||
                   'unknown';
        return `ratelimit:ip:${ip}`;
      }
      
      return 'ratelimit:anonymous';
    },
  });
}

// ==========================================================================
// Endpoint-based Rate Limiter
// ==========================================================================

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(
  endpointConfigs: Record<string, { max: number; windowMs: number }>
): MiddlewareHandler {
  const stores = new Map<string, MemoryStore>();
  
  // Create store for each endpoint
  for (const endpoint of Object.keys(endpointConfigs)) {
    stores.set(endpoint, new MemoryStore());
  }
  
  return async (c: Context, next: Next) => {
    const pathname = new URL(c.req.url).pathname;
    
    // Find matching endpoint config
    let matchedEndpoint: string | null = null;
    let config: { max: number; windowMs: number } | null = null;
    
    for (const [endpoint, cfg] of Object.entries(endpointConfigs)) {
      if (pathname.startsWith(endpoint) || new RegExp(endpoint).test(pathname)) {
        matchedEndpoint = endpoint;
        config = cfg;
        break;
      }
    }
    
    if (!matchedEndpoint || !config) {
      return next();
    }
    
    const store = stores.get(matchedEndpoint)!;
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
               c.req.header('x-real-ip') ||
               'unknown';
    const key = `${matchedEndpoint}:${ip}`;
    
    const entry = await store.increment(key, config.windowMs);
    
    c.header('X-RateLimit-Limit', String(config.max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, config.max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));
    
    if (entry.count > config.max) {
      c.header('Retry-After', String(Math.ceil((entry.resetTime - Date.now()) / 1000)));
      return c.json(
        { error: 'Too Many Requests', endpoint: matchedEndpoint },
        429
      );
    }
    
    return next();
  };
}
