/**
 * ============================================================================
 * YTFY Backend Compression Middleware
 * ============================================================================
 * Purpose: Response compression (Brotli, Gzip, Deflate)
 * Platform: Deno with Hono framework
 * ============================================================================
 */

import { Context, MiddlewareHandler, Next } from 'hono';

// ==========================================================================
// Types
// ==========================================================================

export interface CompressionConfig {
  /** Minimum size to compress (bytes) */
  threshold?: number;
  /** Preferred encoding order */
  encodings?: ('br' | 'gzip' | 'deflate')[];
  /** Content types to compress */
  compressibleTypes?: string[];
  /** Compression level (1-11 for Brotli, 1-9 for Gzip) */
  level?: number;
}

type CompressionStream = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

// ==========================================================================
// Constants
// ==========================================================================

const DEFAULT_CONFIG: Required<CompressionConfig> = {
  threshold: 1024, // 1KB
  encodings: ['br', 'gzip', 'deflate'],
  compressibleTypes: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/xml',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/ld+json',
    'application/manifest+json',
    'image/svg+xml',
  ],
  level: 6,
};

// ==========================================================================
// Compression Functions
// ==========================================================================

/**
 * Get best encoding based on Accept-Encoding header
 */
function getBestEncoding(
  acceptEncoding: string | undefined,
  supported: ('br' | 'gzip' | 'deflate')[]
): 'br' | 'gzip' | 'deflate' | null {
  if (!acceptEncoding) return null;
  
  // Parse Accept-Encoding header
  const encodings = acceptEncoding
    .split(',')
    .map(e => {
      const [encoding, q] = e.trim().split(';q=');
      return {
        encoding: encoding.trim().toLowerCase(),
        quality: q ? parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);
  
  // Find first supported encoding
  for (const { encoding } of encodings) {
    if (supported.includes(encoding as any)) {
      return encoding as 'br' | 'gzip' | 'deflate';
    }
  }
  
  return null;
}

/**
 * Check if content type is compressible
 */
function isCompressible(contentType: string | null, compressibleTypes: string[]): boolean {
  if (!contentType) return false;
  
  // Extract base type (without charset etc.)
  const baseType = contentType.split(';')[0].trim().toLowerCase();
  
  return compressibleTypes.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2);
      return baseType.startsWith(prefix);
    }
    return baseType === type;
  });
}

/**
 * Create compression stream using Web Streams API
 */
async function compressData(
  data: Uint8Array,
  encoding: 'br' | 'gzip' | 'deflate',
  _level: number
): Promise<Uint8Array> {
  // Use CompressionStream API (available in Deno and modern browsers)
  let format: CompressionFormat;
  
  switch (encoding) {
    case 'gzip':
      format = 'gzip';
      break;
    case 'deflate':
      format = 'deflate';
      break;
    case 'br':
      // Brotli may not be available in all environments
      // Fall back to gzip if not supported
      try {
        // @ts-ignore - Deno specific
        if (typeof CompressionStream !== 'undefined') {
          format = 'gzip'; // Use gzip as fallback since br may not be supported
        } else {
          return data; // No compression available
        }
      } catch {
        format = 'gzip';
      }
      break;
    default:
      return data;
  }
  
  try {
    const stream = new CompressionStream(format);
    const writer = stream.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  } catch (e) {
    console.error('[Compression] Compression failed:', e);
    return data;
  }
}

// ==========================================================================
// Compression Middleware
// ==========================================================================

/**
 * Create compression middleware
 */
export function compressionMiddleware(options: CompressionConfig = {}): MiddlewareHandler {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  return async (c: Context, next: Next) => {
    await next();
    
    // Skip if no response body
    if (!c.res.body) return;
    
    // Skip if already encoded
    if (c.res.headers.has('Content-Encoding')) return;
    
    // Get content type
    const contentType = c.res.headers.get('Content-Type');
    
    // Skip if not compressible
    if (!isCompressible(contentType, config.compressibleTypes)) return;
    
    // Get best encoding
    const acceptEncoding = c.req.header('Accept-Encoding');
    const encoding = getBestEncoding(acceptEncoding, config.encodings);
    
    if (!encoding) return;
    
    // Get response body
    const cloned = c.res.clone();
    const body = await cloned.arrayBuffer();
    const data = new Uint8Array(body);
    
    // Skip if below threshold
    if (data.length < config.threshold) return;
    
    // Compress
    const compressed = await compressData(data, encoding, config.level);
    
    // Only use compressed if smaller
    if (compressed.length >= data.length) return;
    
    // Create new response with compressed body
    const headers = new Headers(c.res.headers);
    headers.set('Content-Encoding', encoding);
    headers.set('Content-Length', String(compressed.length));
    headers.set('Vary', 'Accept-Encoding');
    
    c.res = new Response(compressed, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers,
    });
  };
}

// ==========================================================================
// Static Compression Middleware
// ==========================================================================

/**
 * Serve pre-compressed static files
 */
export function staticCompressionMiddleware(
  staticDir: string,
  options: {
    preferBrotli?: boolean;
    extensions?: string[];
  } = {}
): MiddlewareHandler {
  const { preferBrotli = true, extensions = ['.js', '.css', '.html', '.json', '.svg'] } = options;
  
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    
    // Check if static file
    const isStaticFile = extensions.some(ext => path.endsWith(ext));
    if (!isStaticFile) {
      return next();
    }
    
    const acceptEncoding = c.req.header('Accept-Encoding') || '';
    
    // Try to serve pre-compressed file
    const filePath = `${staticDir}${path}`;
    
    if (preferBrotli && acceptEncoding.includes('br')) {
      try {
        const brFile = await Deno.readFile(`${filePath}.br`);
        const contentType = getContentType(path);
        
        return new Response(brFile, {
          headers: {
            'Content-Type': contentType,
            'Content-Encoding': 'br',
            'Vary': 'Accept-Encoding',
          },
        });
      } catch {
        // Pre-compressed file not found
      }
    }
    
    if (acceptEncoding.includes('gzip')) {
      try {
        const gzFile = await Deno.readFile(`${filePath}.gz`);
        const contentType = getContentType(path);
        
        return new Response(gzFile, {
          headers: {
            'Content-Type': contentType,
            'Content-Encoding': 'gzip',
            'Vary': 'Accept-Encoding',
          },
        });
      } catch {
        // Pre-compressed file not found
      }
    }
    
    return next();
  };
}

/**
 * Get content type from file extension
 */
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'svg': 'image/svg+xml',
    'xml': 'application/xml',
    'txt': 'text/plain; charset=utf-8',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// ==========================================================================
// Utilities
// ==========================================================================

/**
 * Compress string to gzip
 */
export async function compressString(str: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return compressData(data, 'gzip', 6);
}

/**
 * Decompress gzip data
 */
export async function decompressData(
  data: Uint8Array,
  encoding: 'gzip' | 'deflate'
): Promise<Uint8Array> {
  try {
    const stream = new DecompressionStream(encoding);
    const writer = stream.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  } catch (e) {
    console.error('[Compression] Decompression failed:', e);
    return data;
  }
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(original: number, compressed: number): number {
  return Number(((1 - compressed / original) * 100).toFixed(2));
}
