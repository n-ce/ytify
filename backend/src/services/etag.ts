// ETag generation utilities

// Generate ETag from data (using simple hash)
export function generateEtag(data: unknown): string {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  return `"${Math.abs(hash).toString(36)}-${timestamp}"`;
}

// Validate If-Match header against stored ETag
export function validateEtag(clientEtag: string | null, serverEtag: string): boolean {
  if (!clientEtag) return false;
  // Handle weak ETags (W/"...")
  const normalizedClient = clientEtag.replace(/^W\//, "");
  const normalizedServer = serverEtag.replace(/^W\//, "");
  return normalizedClient === normalizedServer;
}
