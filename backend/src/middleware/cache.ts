/**
 * ============================================================================
 * YTFY Backend Cache Middleware
 * ============================================================================
 * Purpose: Response caching with ETags and conditional requests
 * Platform: Deno with Hono framework
 * ============================================================================
 */

import { Context, MiddlewareHandler, Next } from 'hono';

// ==========================================================================
// Types
// ==========================================================================

export interface CacheConfig {
  /** Default cache TTL in seconds */
  defaultTTL?: number;
  /** Cache key prefix */
  prefix?: string;
  /** Routes with custom TTLs */
  routeTTLs?: Record<string, number>;
  /** Headers to include in cache key */
  varyHeaders?: string[];
  /** Enable stale-while-revalidate */
  staleWhileRevalidate?: number;
  /** Methods to cache */
  cacheMethods?: string[];
  /** Status codes to cache */
  cacheStatuses?: number[];
}

export interface CacheEntry {
  body: string;
  headers: Record<string, string>;
  status: number;
  etag: string;
  timestamp: number;
  ttl: number;
}

// ==========================================================================
// Constants
// ==========================================================================

const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTTL: 300, // 5 minutes
  prefix: 'ytfy:cache:',
  routeTTLs: {
    '/api/v1/videos/': 1800, // 30 minutes
    '/s/': 3600, // 1 hour (link previews)
    '/ss/': 86400, // 24 hours (static storage)
  },
  varyHeaders: ['accept', 'accept-encoding', 'accept-language'],
  staleWhileRevalidate: 60,
  cacheMethods: ['GET', 'HEAD'],
  cacheStatuses: [200, 301, 304],
};

// In-memory cache (use Redis in production)
const memoryCache = new Map<string, CacheEntry>();

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Generate cache key from request
 */
function generateCacheKey(c: Context, config: Required<CacheConfig>): string {
  const url = new URL(c.req.url);
  const varyParts = config.varyHeaders
    .map(h => c.req.header(h) || '')
    .join('|');
  
  return `${config.prefix}${c.req.method}:${url.pathname}${url.search}:${varyParts}`;
}

/**
 * Generate ETag from content
 */
async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `"${hashHex.substring(0, 32)}"`;
}

/**
 * Get TTL for a specific route
 */
function getRouteTTL(pathname: string, config: Required<CacheConfig>): number {
  for (const [route, ttl] of Object.entries(config.routeTTLs)) {
    if (pathname.startsWith(route)) {
      return ttl;
    }
  }
  return config.defaultTTL;
}

/**
 * Check if cache entry is fresh
 */
function isFresh(entry: CacheEntry): boolean {
  const age = Date.now() - entry.timestamp;
  return age < entry.ttl * 1000;
}

/**
 * Check if cache entry is stale but within revalidation window
 */
function isStaleWhileRevalidate(entry: CacheEntry, swr: number): boolean {
  const age = Date.now() - entry.timestamp;
  const maxAge = (entry.ttl + swr) * 1000;
  return age >= entry.ttl * 1000 && age < maxAge;
}

// ==========================================================================
// Cache Middleware
// ==========================================================================

/**
 * Create cache middleware
 */
export function cacheMiddleware(options: CacheConfig = {}): MiddlewareHandler {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  return async (c: Context, next: Next) => {
    // Skip non-cacheable methods
    if (!config.cacheMethods.includes(c.req.method)) {
      return next();
    }
    
    const cacheKey = generateCacheKey(c, config);
    const cached = memoryCache.get(cacheKey);
    
    // Check for conditional request (If-None-Match)
    const ifNoneMatch = c.req.header('if-none-match');
    
    if (cached) {
      // Handle conditional request
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new Response(null, {
          status: 304,
          headers: {
            'ETag': cached.etag,
            'Cache-Control': `public, max-age=${cached.ttl}`,
            'X-Cache': 'HIT',
          },
        });
      }
      
      // Return cached response if fresh
      if (isFresh(cached)) {
        const headers = new Headers(cached.headers);
        headers.set('X-Cache', 'HIT');
        headers.set('Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));
        
        return new Response(cached.body, {
          status: cached.status,
          headers,
        });
      }
      
      // Stale-while-revalidate: return stale and update in background
      if (isStaleWhileRevalidate(cached, config.staleWhileRevalidate)) {
        // Trigger background revalidation
        setTimeout(async () => {
          try {
            await revalidateCache(c, next, cacheKey, config);
          } catch (e) {
            console.error('[Cache] Background revalidation failed:', e);
          }
        }, 0);
        
        const headers = new Headers(cached.headers);
        headers.set('X-Cache', 'STALE');
        headers.set('Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));
        
        return new Response(cached.body, {
          status: cached.status,
          headers,
        });
      }
    }
    
    // Cache miss - execute handler
    await next();
    
    const response = c.res;
    
    // Only cache successful responses
    if (!config.cacheStatuses.includes(response.status)) {
      return;
    }
    
    // Clone response body
    const clonedResponse = response.clone();
    const body = await clonedResponse.text();
    
    // Generate ETag
    const etag = await generateETag(body);
    const ttl = getRouteTTL(new URL(c.req.url).pathname, config);
    
    // Store in cache
    const cacheEntry: CacheEntry = {
      body,
      headers: Object.fromEntries(response.headers),
      status: response.status,
      etag,
      timestamp: Date.now(),
      ttl,
    };
    
    memoryCache.set(cacheKey, cacheEntry);
    
    // Add cache headers to response
    c.header('ETag', etag);
    c.header('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${config.staleWhileRevalidate}`);
    c.header('X-Cache', 'MISS');
  };
}

/**
 * Revalidate cache entry
 */
async function revalidateCache(
  c: Context,
  next: Next,
  cacheKey: string,
  config: Required<CacheConfig>
): Promise<void> {
  // Create a minimal context for revalidation
  // Note: This is a simplified version - production should use proper request cloning
  await next();
  
  const response = c.res;
  
  if (!config.cacheStatuses.includes(response.status)) {
    return;
  }
  
  const clonedResponse = response.clone();
  const body = await clonedResponse.text();
  const etag = await generateETag(body);
  const ttl = getRouteTTL(new URL(c.req.url).pathname, config);
  
  const cacheEntry: CacheEntry = {
    body,
    headers: Object.fromEntries(response.headers),
    status: response.status,
    etag,
    timestamp: Date.now(),
    ttl,
  };
  
  memoryCache.set(cacheKey, cacheEntry);
}

// ==========================================================================
// ETag Middleware
// ==========================================================================

/**
 * ETag middleware for responses
 */
export function etagMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    await next();
    
    // Skip if already has ETag
    if (c.res.headers.has('ETag')) {
      return;
    }
    
    // Skip non-cacheable responses
    if (c.res.status !== 200) {
      return;
    }
    
    // Generate ETag from response body
    const clonedResponse = c.res.clone();
    const body = await clonedResponse.text();
    
    if (body.length > 0) {
      const etag = await generateETag(body);
      
      // Check conditional request
      const ifNoneMatch = c.req.header('if-none-match');
      if (ifNoneMatch === etag) {
        return c.body(null, 304);
      }
      
      c.header('ETag', etag);
    }
  };
}

// ==========================================================================
// Cache Control Headers Middleware
// ==========================================================================

/**
 * Add cache control headers based on route
 */
export function cacheControlMiddleware(
  routeConfigs: Record<string, { maxAge: number; public?: boolean; immutable?: boolean }>
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    await next();
    
    const pathname = new URL(c.req.url).pathname;
    
    for (const [route, config] of Object.entries(routeConfigs)) {
      if (pathname.startsWith(route) || new RegExp(route).test(pathname)) {
        const directives: string[] = [];
        
        if (config.public !== false) directives.push('public');
        directives.push(`max-age=${config.maxAge}`);
        if (config.immutable) directives.push('immutable');
        
        c.header('Cache-Control', directives.join(', '));
        break;
      }
    }
  };
}

// ==========================================================================
// Cache Utilities
// ==========================================================================

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Clear cache entries matching a pattern
 */
export function clearCacheByPattern(pattern: string | RegExp): number {
  let cleared = 0;
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  totalSize: number;
  hitRate: number;
} {
  let totalSize = 0;
  
  for (const entry of memoryCache.values()) {
    totalSize += entry.body.length + JSON.stringify(entry.headers).length;
  }
  
  return {
    entries: memoryCache.size,
    totalSize,
    hitRate: 0, // Would need tracking to calculate
  };
}

/**
 * Prune expired cache entries
 */
export function pruneCacheExpired(): number {
  let pruned = 0;
  const now = Date.now();
  
  for (const [key, entry] of memoryCache.entries()) {
    const age = now - entry.timestamp;
    if (age > entry.ttl * 1000) {
      memoryCache.delete(key);
      pruned++;
    }
  }
  
  return pruned;
}

// ==========================================================================
// Export Redis Cache Implementation (for production)
// ==========================================================================

/**
 * Redis cache implementation
 * Use this in production instead of in-memory cache
 */
export class RedisCacheStore {
  private client: any; // Redis client
  private prefix: string;
  
  constructor(redisClient: any, prefix = 'ytfy:cache:') {
    this.client = redisClient;
    this.prefix = prefix;
  }
  
  async get(key: string): Promise<CacheEntry | null> {
    const data = await this.client.get(this.prefix + key);
    if (!data) return null;
    return JSON.parse(data);
  }
  
  async set(key: string, entry: CacheEntry): Promise<void> {
    await this.client.set(
      this.prefix + key,
      JSON.stringify(entry),
      'EX',
      entry.ttl
    );
  }
  
  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
  
  async clear(): Promise<void> {
    const keys = await this.client.keys(this.prefix + '*');
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
