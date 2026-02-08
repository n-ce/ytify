/**
 * ============================================================================
 * Service Worker Registration Module
 * ============================================================================
 * Purpose: Register and manage the service worker lifecycle
 * Features: Update prompts, cache management, offline detection
 * ============================================================================
 */

// ==========================================================================
// Types
// ==========================================================================

export interface ServiceWorkerConfig {
  /** Path to the service worker file */
  swUrl: string;
  /** Callback when SW is ready */
  onReady?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when update is available */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when content is cached for offline */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  /** Callback on registration error */
  onError?: (error: Error) => void;
  /** Callback when offline status changes */
  onOfflineChange?: (isOffline: boolean) => void;
}

export interface SWRegistrationState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

// ==========================================================================
// State
// ==========================================================================

let state: SWRegistrationState = {
  isSupported: 'serviceWorker' in navigator,
  isRegistered: false,
  isUpdateAvailable: false,
  isOffline: !navigator.onLine,
  registration: null,
};

const listeners = new Set<(state: SWRegistrationState) => void>();

// ==========================================================================
// State Management
// ==========================================================================

/**
 * Get current service worker state
 */
export function getSWState(): SWRegistrationState {
  return { ...state };
}

/**
 * Subscribe to state changes
 */
export function subscribeSWState(listener: (state: SWRegistrationState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Update state and notify listeners
 */
function updateState(updates: Partial<SWRegistrationState>): void {
  state = { ...state, ...updates };
  listeners.forEach(listener => listener(state));
}

// ==========================================================================
// Service Worker Registration
// ==========================================================================

/**
 * Register the service worker
 */
export async function registerSW(config: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | null> {
  const { swUrl, onReady, onUpdate, onSuccess, onError, onOfflineChange } = config;
  
  // Check browser support
  if (!state.isSupported) {
    console.warn('[SW Register] Service workers are not supported in this browser');
    return null;
  }
  
  // Setup offline detection
  setupOfflineDetection(onOfflineChange);
  
  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none', // Always check server for SW updates
    });
    
    updateState({ registration, isRegistered: true });
    console.log('[SW Register] Service worker registered:', registration.scope);
    
    // Check for updates on page focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(console.error);
      }
    });
    
    // Handle registration states
    if (registration.installing) {
      trackInstalling(registration.installing, (reg) => onSuccess?.(reg!), onError);
    } else if (registration.waiting) {
      updateState({ isUpdateAvailable: true });
      onUpdate?.(registration);
    } else if (registration.active) {
      onReady?.(registration);
    }
    
    // Listen for new service workers
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        trackInstalling(newWorker, () => {
          updateState({ isUpdateAvailable: true });
          onUpdate?.(registration);
        }, onError);
      }
    });
    
    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Register] Controller changed, reloading...');
      window.location.reload();
    });
    
    return registration;
    
  } catch (error) {
    console.error('[SW Register] Registration failed:', error);
    onError?.(error as Error);
    return null;
  }
}

/**
 * Track service worker installation progress
 */
function trackInstalling(
  worker: ServiceWorker,
  onInstalled?: (registration?: ServiceWorkerRegistration) => void,
  onError?: (error: Error) => void
): void {
  worker.addEventListener('statechange', () => {
    switch (worker.state) {
      case 'installed':
        if (navigator.serviceWorker.controller) {
          // New content available
          console.log('[SW Register] New content available');
          updateState({ isUpdateAvailable: true });
        } else {
          // Content cached for offline
          console.log('[SW Register] Content cached for offline use');
        }
        onInstalled?.(state.registration || undefined);
        break;
        
      case 'redundant':
        console.warn('[SW Register] Service worker became redundant');
        onError?.(new Error('Service worker became redundant'));
        break;
    }
  });
}

// ==========================================================================
// Update Management
// ==========================================================================

/**
 * Skip waiting and activate the new service worker
 */
export async function skipWaiting(): Promise<void> {
  const { registration } = state;
  
  if (!registration?.waiting) {
    console.warn('[SW Register] No waiting service worker to activate');
    return;
  }
  
  // Send message to waiting SW to skip waiting
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  const { registration } = state;
  
  if (!registration) {
    console.warn('[SW Register] No registration to check for updates');
    return false;
  }
  
  try {
    await registration.update();
    return state.isUpdateAvailable;
  } catch (error) {
    console.error('[SW Register] Update check failed:', error);
    return false;
  }
}

// ==========================================================================
// Cache Management
// ==========================================================================

/**
 * Clear all service worker caches
 */
export async function clearCaches(): Promise<boolean> {
  const { registration } = state;
  
  if (!registration?.active) {
    // Fallback to direct cache API
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW Register] Caches cleared directly');
    return true;
  }
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data?.success ?? false);
    };
    
    registration.active!.postMessage(
      { type: 'CLEAR_CACHE' },
      [messageChannel.port2]
    );
  });
}

/**
 * Get total cache size
 */
export async function getCacheSize(): Promise<number> {
  const { registration } = state;
  
  if (!registration?.active) {
    // Fallback to direct calculation
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.clone().blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  }
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data?.size ?? 0);
    };
    
    registration.active!.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [messageChannel.port2]
    );
  });
}

/**
 * Pre-cache a specific URL
 */
export async function cacheUrl(url: string): Promise<boolean> {
  const { registration } = state;
  
  if (!registration?.active) {
    // Fallback to direct caching
    try {
      const cache = await caches.open('ytfy-runtime-v1');
      await cache.add(url);
      return true;
    } catch {
      return false;
    }
  }
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data?.success ?? false);
    };
    
    registration.active!.postMessage(
      { type: 'CACHE_URL', url },
      [messageChannel.port2]
    );
  });
}

// ==========================================================================
// Offline Detection
// ==========================================================================

/**
 * Setup offline detection listeners
 */
function setupOfflineDetection(onOfflineChange?: (isOffline: boolean) => void): void {
  const handleOnline = () => {
    updateState({ isOffline: false });
    onOfflineChange?.(false);
    console.log('[SW Register] Online');
  };
  
  const handleOffline = () => {
    updateState({ isOffline: true });
    onOfflineChange?.(true);
    console.log('[SW Register] Offline');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

/**
 * Check if currently offline
 */
export function isOffline(): boolean {
  return state.isOffline;
}

// ==========================================================================
// Unregistration
// ==========================================================================

/**
 * Unregister the service worker
 */
export async function unregisterSW(): Promise<boolean> {
  const { registration } = state;
  
  if (!registration) {
    return false;
  }
  
  try {
    const success = await registration.unregister();
    if (success) {
      updateState({ isRegistered: false, registration: null });
      console.log('[SW Register] Service worker unregistered');
    }
    return success;
  } catch (error) {
    console.error('[SW Register] Unregistration failed:', error);
    return false;
  }
}

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Format bytes to human-readable string
 */
export function formatCacheSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get service worker status for debugging
 */
export function getSWDebugInfo(): Record<string, unknown> {
  return {
    ...state,
    controllerUrl: navigator.serviceWorker.controller?.scriptURL,
    ready: navigator.serviceWorker.ready.then(r => r.scope),
  };
}

// ==========================================================================
// Auto-register (optional)
// ==========================================================================

/**
 * Auto-register service worker with default configuration
 * Call this in your app entry point
 */
export function autoRegister(): void {
  if (import.meta.env.PROD) {
    registerSW({
      swUrl: '/sw.js',
      onReady: () => console.log('[SW] Ready for offline use'),
      onUpdate: () => console.log('[SW] Update available'),
      onSuccess: () => console.log('[SW] Content cached'),
      onError: (err) => console.error('[SW] Error:', err),
      onOfflineChange: (offline) => console.log('[SW] Offline:', offline),
    });
  }
}
