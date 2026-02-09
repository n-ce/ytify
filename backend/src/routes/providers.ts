/**
 * Music Provider OAuth Routes (Secured)
 * - Refresh tokens stored in HttpOnly cookies
 * - Round-robin with health check for YouTube instances
 */

import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

const providers = new Hono();

// =============================================================================
// INVIDIOUS INSTANCE MANAGEMENT (Round-Robin + Health Check)
// =============================================================================

interface InstanceHealth {
  url: string;
  healthy: boolean;
  lastCheck: number;
  failCount: number;
}

const DEFAULT_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.snopyta.org',
  'https://yewtu.be',
  'https://invidious.kavin.rocks',
];

let instanceHealthMap: Map<string, InstanceHealth> = new Map();
let currentInstanceIndex = 0;

function initializeInstances(): void {
  const instancesEnv = Deno.env.get('INVIDIOUS_INSTANCES');
  const instances = instancesEnv ? JSON.parse(instancesEnv) : DEFAULT_INSTANCES;
  
  instances.forEach((url: string) => {
    instanceHealthMap.set(url, {
      url,
      healthy: true,
      lastCheck: 0,
      failCount: 0,
    });
  });
}

// Initialize on module load
initializeInstances();

async function checkInstanceHealth(instance: InstanceHealth): Promise<boolean> {
  try {
    const response = await fetch(`${instance.url}/api/v1/stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getHealthyInstance(): Promise<string | null> {
  const instances = Array.from(instanceHealthMap.values());
  const now = Date.now();
  const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  
  // Round-robin through instances
  for (let i = 0; i < instances.length; i++) {
    const idx = (currentInstanceIndex + i) % instances.length;
    const instance = instances[idx];
    
    // Check health if stale
    if (now - instance.lastCheck > HEALTH_CHECK_INTERVAL) {
      instance.healthy = await checkInstanceHealth(instance);
      instance.lastCheck = now;
      if (instance.healthy) instance.failCount = 0;
    }
    
    if (instance.healthy) {
      currentInstanceIndex = (idx + 1) % instances.length; // Move to next for round-robin
      return instance.url;
    }
  }
  
  // All instances unhealthy - try first one anyway
  return instances[0]?.url || null;
}

function markInstanceFailed(url: string): void {
  const instance = instanceHealthMap.get(url);
  if (instance) {
    instance.failCount++;
    if (instance.failCount >= 3) {
      instance.healthy = false;
    }
  }
}

// =============================================================================
// SPOTIFY (HttpOnly Cookie for Refresh Token)
// =============================================================================

providers.post('/spotify/callback', async (c) => {
  const { code } = await c.req.json<{ code: string }>();
  
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ytify.ml4-lab.com';
  
  if (!clientId || !clientSecret) {
    return c.json({ error: 'Spotify not configured' }, 500);
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${frontendUrl}/callback/spotify`
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    return c.json({ error: data.error_description || data.error }, 400);
  }
  
  // 🔒 Store refresh_token in HttpOnly cookie
  setCookie(c, 'spotify_refresh_token', data.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/api/spotify',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  
  // Only return access_token to frontend
  return c.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
  });
});

providers.post('/spotify/refresh', async (c) => {
  // Read refresh_token from HttpOnly cookie
  const refreshToken = getCookie(c, 'spotify_refresh_token');
  
  if (!refreshToken) {
    return c.json({ error: 'No refresh token' }, 401);
  }
  
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    return c.json({ error: 'Spotify not configured' }, 500);
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    // Clear invalid refresh token
    deleteCookie(c, 'spotify_refresh_token', { path: '/api/spotify' });
    return c.json({ error: 'Session expired' }, 401);
  }
  
  // Update refresh token if a new one was issued
  if (data.refresh_token) {
    setCookie(c, 'spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/spotify',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  
  return c.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
  });
});

providers.post('/spotify/logout', (c) => {
  deleteCookie(c, 'spotify_refresh_token', { path: '/api/spotify' });
  return c.json({ success: true });
});

// =============================================================================
// DEEZER (HttpOnly Cookie)
// =============================================================================

providers.post('/deezer/callback', async (c) => {
  const { code } = await c.req.json<{ code: string }>();
  
  const appId = Deno.env.get('DEEZER_APP_ID');
  const secret = Deno.env.get('DEEZER_SECRET');
  
  if (!appId || !secret) {
    return c.json({ error: 'Deezer not configured' }, 500);
  }
  
  const response = await fetch(
    `https://connect.deezer.com/oauth/access_token.php?app_id=${appId}&secret=${secret}&code=${code}`
  );
  
  const text = await response.text();
  const params = new URLSearchParams(text);
  const accessToken = params.get('access_token');
  const expires = params.get('expires');
  
  if (!accessToken) {
    return c.json({ error: 'Token exchange failed' }, 400);
  }
  
  // Deezer tokens are long-lived, store in HttpOnly cookie
  setCookie(c, 'deezer_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/api/deezer',
    maxAge: expires ? parseInt(expires) : 30 * 24 * 60 * 60,
  });
  
  return c.json({
    access_token: accessToken,
    expires_in: expires ? parseInt(expires) : null,
  });
});

providers.post('/deezer/logout', (c) => {
  deleteCookie(c, 'deezer_token', { path: '/api/deezer' });
  return c.json({ success: true });
});

// =============================================================================
// SOUNDCLOUD (HttpOnly Cookie)
// =============================================================================

providers.post('/soundcloud/callback', async (c) => {
  const { code } = await c.req.json<{ code: string }>();
  
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  const clientSecret = Deno.env.get('SOUNDCLOUD_CLIENT_SECRET');
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ytify.ml4-lab.com';
  
  if (!clientId || !clientSecret) {
    return c.json({ error: 'SoundCloud not configured' }, 500);
  }
  
  const response = await fetch('https://api.soundcloud.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${frontendUrl}/callback/soundcloud`,
      code
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    return c.json({ error: data.error_description || data.error }, 400);
  }
  
  // Store refresh token in HttpOnly cookie
  if (data.refresh_token) {
    setCookie(c, 'soundcloud_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/soundcloud',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  
  return c.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
  });
});

providers.post('/soundcloud/logout', (c) => {
  deleteCookie(c, 'soundcloud_refresh_token', { path: '/api/soundcloud' });
  return c.json({ success: true });
});

// =============================================================================
// YOUTUBE SEARCH (Round-Robin Invidious with Health Check)
// =============================================================================

providers.get('/youtube/search', async (c) => {
  const query = c.req.query('q');
  
  if (!query) {
    return c.json({ error: 'Query required' }, 400);
  }
  
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const instance = await getHealthyInstance();
    
    if (!instance) {
      return c.json({ error: 'No healthy instances available', videoId: null }, 503);
    }
    
    try {
      const response = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (!response.ok) {
        markInstanceFailed(instance);
        continue;
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return c.json({
          videoId: data[0].videoId,
          title: data[0].title,
          author: data[0].author,
          instance, // For debugging
        });
      }
      
      // No results but instance is healthy
      return c.json({ videoId: null });
      
    } catch (e) {
      console.warn(`Invidious ${instance} failed:`, e);
      markInstanceFailed(instance);
      continue;
    }
  }
  
  return c.json({ error: 'All instances failed', videoId: null }, 503);
});

// Health check endpoint for instances
providers.get('/youtube/instances', async (c) => {
  const instances = Array.from(instanceHealthMap.values());
  return c.json({
    instances: instances.map(i => ({
      url: i.url,
      healthy: i.healthy,
      failCount: i.failCount,
    })),
    currentIndex: currentInstanceIndex,
  });
});

export default providers;
