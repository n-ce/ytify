/**
 * ============================================================================
 * YTFY Lazy Loading Utilities
 * ============================================================================
 * Purpose: Optimized lazy loading for images, components, and resources
 * Features: Intersection Observer, preload/prefetch, priority hints
 * ============================================================================
 */

import { createSignal, onCleanup, Component, JSX } from 'solid-js';

// ==========================================================================
// Types
// ==========================================================================

export interface LazyImageOptions {
  /** Root element for intersection observer */
  root?: Element | null;
  /** Root margin for earlier loading */
  rootMargin?: string;
  /** Threshold for intersection */
  threshold?: number | number[];
  /** Placeholder image while loading */
  placeholder?: string;
  /** Blur-up effect */
  blurUp?: boolean;
  /** Enable native lazy loading */
  useNative?: boolean;
  /** Loading priority */
  priority?: 'high' | 'low' | 'auto';
  /** Decode async */
  decodeAsync?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Srcset for responsive images */
  srcset?: string;
}

export interface PreloadOptions {
  /** Resource type */
  as: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'document';
  /** Cross-origin attribute */
  crossOrigin?: 'anonymous' | 'use-credentials';
  /** Fetch priority */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Media query */
  media?: string;
  /** MIME type */
  type?: string;
}

export interface PrefetchOptions {
  /** Prefetch trigger */
  trigger?: 'hover' | 'visible' | 'idle';
  /** Delay before prefetching (ms) */
  delay?: number;
}

// ==========================================================================
// Constants
// ==========================================================================

const DEFAULT_OPTIONS: LazyImageOptions = {
  rootMargin: '50px',
  threshold: 0.01,
  useNative: true,
  decodeAsync: true,
  priority: 'auto',
};

// Base64 1px transparent placeholder
const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// ==========================================================================
// Image Lazy Loading
// ==========================================================================

/**
 * Create lazy image loader with Intersection Observer
 */
export function createLazyImage(src: string, options: LazyImageOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [isError, setIsError] = createSignal(false);
  const [currentSrc, setCurrentSrc] = createSignal(opts.placeholder || TRANSPARENT_PLACEHOLDER);
  
  let observer: IntersectionObserver | null = null;
  let imageRef: HTMLImageElement | null = null;
  
  const loadImage = async () => {
    if (!src) return;
    
    try {
      // Create new image to preload
      const img = new Image();
      
      // Set up responsive attributes
      if (opts.sizes) img.sizes = opts.sizes;
      if (opts.srcset) img.srcset = opts.srcset;
      
      // Async decode for smoother loading
      img.src = src;
      
      if (opts.decodeAsync && img.decode) {
        await img.decode();
      }
      
      setCurrentSrc(src);
      setIsLoaded(true);
    } catch (e) {
      setIsError(true);
      console.error('[LazyLoad] Image load failed:', src, e);
    }
  };
  
  const ref = (el: HTMLImageElement) => {
    imageRef = el;
    
    // Use native lazy loading if supported and enabled
    if (opts.useNative && 'loading' in HTMLImageElement.prototype) {
      el.loading = 'lazy';
      if (opts.priority === 'high') {
        el.fetchPriority = 'high';
      }
      el.src = src;
      el.onload = () => setIsLoaded(true);
      el.onerror = () => setIsError(true);
      return;
    }
    
    // Fallback to Intersection Observer
    if (!('IntersectionObserver' in window)) {
      loadImage();
      return;
    }
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer?.unobserve(el);
          }
        });
      },
      {
        root: opts.root,
        rootMargin: opts.rootMargin,
        threshold: opts.threshold,
      }
    );
    
    observer.observe(el);
  };
  
  const cleanup = () => {
    if (observer && imageRef) {
      observer.unobserve(imageRef);
      observer.disconnect();
    }
  };
  
  return {
    ref,
    cleanup,
    isLoaded,
    isError,
    currentSrc,
    reload: loadImage,
  };
}

/**
 * Create lazy image attributes for use in JSX
 * Usage: <img {...lazyImageAttrs()} />
 */
export function createLazyImageAttrs(
  src: string,
  options: LazyImageOptions = {}
): {
  getAttrs: () => {
    src: string;
    loading: 'lazy' | 'eager';
    decoding: 'async' | 'sync' | 'auto';
    style: { opacity: number; transition: string };
  };
  ref: (el: HTMLImageElement) => void;
  cleanup: () => void;
  isLoaded: () => boolean;
  isError: () => boolean;
} {
  const lazy = createLazyImage(src, options);
  
  return {
    getAttrs: () => ({
      src: lazy.currentSrc(),
      loading: 'lazy' as const,
      decoding: 'async' as const,
      style: {
        opacity: lazy.isLoaded() ? 1 : 0,
        transition: 'opacity 0.3s ease',
      },
    }),
    ref: lazy.ref,
    cleanup: lazy.cleanup,
    isLoaded: lazy.isLoaded,
    isError: lazy.isError,
  };
}

// ==========================================================================
// Component Lazy Loading
// ==========================================================================

/**
 * Create lazy component loader
 */
export function createLazyComponent<T extends Component<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: JSX.Element;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [component, setComponent] = createSignal<T | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);
  
  const load = async () => {
    if (component() || isLoading()) return;
    
    setIsLoading(true);
    
    try {
      const module = await importFn();
      setComponent(() => module.default);
      options.onLoad?.();
    } catch (e) {
      const err = e as Error;
      setError(err);
      options.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    component,
    isLoading,
    error,
    load,
  };
}

/**
 * Lazy load a component when it enters viewport
 */
export function lazyLoadOnVisible<T extends Component<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    rootMargin?: string;
    threshold?: number;
    fallback?: JSX.Element;
  } = {}
) {
  const { component, load, isLoading, error } = createLazyComponent(importFn);
  
  const ref = (el: HTMLElement) => {
    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          load();
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin ?? '100px',
        threshold: options.threshold ?? 0,
      }
    );
    
    observer.observe(el);
    
    onCleanup(() => observer.disconnect());
  };
  
  return { ref, component, isLoading, error };
}

// ==========================================================================
// Resource Preloading
// ==========================================================================

/**
 * Preload a resource
 */
export function preload(href: string, options: PreloadOptions): HTMLLinkElement {
  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return existing as HTMLLinkElement;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = options.as;
  
  if (options.crossOrigin) link.crossOrigin = options.crossOrigin;
  if (options.fetchPriority) (link as any).fetchPriority = options.fetchPriority;
  if (options.media) link.media = options.media;
  if (options.type) link.type = options.type;
  
  document.head.appendChild(link);
  
  return link;
}

/**
 * Preload an image
 */
export function preloadImage(src: string, priority: 'high' | 'low' | 'auto' = 'auto'): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    (img as any).fetchPriority = priority;
    img.src = src;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<PromiseSettledResult<void>[]> {
  return Promise.allSettled(srcs.map(src => preloadImage(src)));
}

/**
 * Preload a script
 */
export function preloadScript(src: string, priority: 'high' | 'low' | 'auto' = 'auto'): HTMLLinkElement {
  return preload(src, { as: 'script', fetchPriority: priority });
}

/**
 * Preload a stylesheet
 */
export function preloadStylesheet(href: string): HTMLLinkElement {
  return preload(href, { as: 'style' });
}

/**
 * Preload a font
 */
export function preloadFont(href: string, type = 'font/woff2'): HTMLLinkElement {
  return preload(href, { 
    as: 'font', 
    type,
    crossOrigin: 'anonymous',
  });
}

// ==========================================================================
// Resource Prefetching
// ==========================================================================

/**
 * Prefetch a resource (for future navigation)
 */
export function prefetch(href: string): HTMLLinkElement {
  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existing) return existing as HTMLLinkElement;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  
  document.head.appendChild(link);
  
  return link;
}

/**
 * Prefetch a page
 */
export function prefetchPage(href: string): HTMLLinkElement {
  return prefetch(href);
}

/**
 * Prefetch on hover
 */
export function prefetchOnHover(
  element: HTMLElement,
  href: string,
  options: PrefetchOptions = {}
): () => void {
  const { delay = 100 } = options;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let prefetched = false;
  
  const handleMouseEnter = () => {
    if (prefetched) return;
    
    timeout = setTimeout(() => {
      prefetch(href);
      prefetched = true;
    }, delay);
  };
  
  const handleMouseLeave = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    if (timeout) clearTimeout(timeout);
  };
}

/**
 * Prefetch when idle
 */
export function prefetchWhenIdle(urls: string[]): void {
  const prefetchUrls = () => {
    urls.forEach(url => prefetch(url));
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetchUrls, { timeout: 5000 });
  } else {
    setTimeout(prefetchUrls, 2000);
  }
}

// ==========================================================================
// DNS Prefetch & Preconnect
// ==========================================================================

/**
 * DNS prefetch for external domains
 */
export function dnsPrefetch(domain: string): HTMLLinkElement {
  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`);
  if (existing) return existing as HTMLLinkElement;
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = domain;
  
  document.head.appendChild(link);
  
  return link;
}

/**
 * Preconnect to external domains
 */
export function preconnect(domain: string, crossOrigin = true): HTMLLinkElement {
  const existing = document.querySelector(`link[rel="preconnect"][href="${domain}"]`);
  if (existing) return existing as HTMLLinkElement;
  
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = domain;
  if (crossOrigin) link.crossOrigin = 'anonymous';
  
  document.head.appendChild(link);
  
  return link;
}

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Create viewport observer
 */
export function createViewportObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, {
    rootMargin: '50px',
    threshold: 0,
    ...options,
  });
}

/**
 * Wait for idle time
 */
export function whenIdle(callback: () => void, timeout = 5000): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 100);
  }
}

/**
 * Load image with timeout
 */
export function loadImageWithTimeout(
  src: string,
  timeout = 10000
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Image load timeout: ${src}`));
    }, timeout);
    
    img.src = src;
  });
}

/**
 * Get optimal image format support
 */
export async function getOptimalImageFormat(): Promise<'avif' | 'webp' | 'jpg'> {
  // Check AVIF support
  const avifSupport = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIAyA==';
  });
  
  if (avifSupport) return 'avif';
  
  // Check WebP support
  const webpSupport = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
  
  return webpSupport ? 'webp' : 'jpg';
}

/**
 * Get srcset for responsive images
 */
export function generateSrcset(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
  format?: string
): string {
  return widths
    .map(w => {
      const url = baseUrl.replace('{width}', String(w));
      const finalUrl = format ? url.replace(/\.(jpg|png|webp)$/, `.${format}`) : url;
      return `${finalUrl} ${w}w`;
    })
    .join(', ');
}
