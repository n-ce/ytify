/**
 * ============================================================================
 * YTFY Core Web Vitals Monitoring
 * ============================================================================
 * Purpose: Track and report Core Web Vitals to analytics
 * Metrics: LCP, FID, CLS, FCP, TTFB, INP
 * ============================================================================
 */

// ==========================================================================
// Types
// ==========================================================================

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface WebVitalsConfig {
  /** Enable console logging */
  debug?: boolean;
  /** Analytics endpoint */
  analyticsEndpoint?: string;
  /** Custom callback for each metric */
  onMetric?: (metric: WebVitalsMetric) => void;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Additional context to send with metrics */
  context?: Record<string, string | number | boolean>;
}

export interface VitalsStatus {
  lcp: WebVitalsMetric | null;
  fid: WebVitalsMetric | null;
  cls: WebVitalsMetric | null;
  fcp: WebVitalsMetric | null;
  ttfb: WebVitalsMetric | null;
  inp: WebVitalsMetric | null;
  timestamp: number;
}

// ==========================================================================
// Constants - Core Web Vitals Thresholds
// ==========================================================================

const THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
  INP: {
    good: 200,
    needsImprovement: 500,
  },
};

// ==========================================================================
// State
// ==========================================================================

let config: WebVitalsConfig = {
  debug: false,
  sampleRate: 1,
};

const vitalsStatus: VitalsStatus = {
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null,
  inp: null,
  timestamp: 0,
};

// ==========================================================================
// Rating Functions
// ==========================================================================

function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// ==========================================================================
// Web Vitals Collection
// ==========================================================================

/**
 * Initialize Web Vitals monitoring
 */
export function initVitals(options: WebVitalsConfig = {}): void {
  config = { ...config, ...options };
  
  // Check sample rate
  if (Math.random() > (config.sampleRate ?? 1)) {
    return;
  }
  
  vitalsStatus.timestamp = Date.now();
  
  // Import web-vitals library dynamically to reduce initial bundle
  importWebVitals().then(({ onLCP, onCLS, onFCP, onTTFB, onINP }) => {
    // Largest Contentful Paint
    onLCP((metric: unknown) => handleMetric('LCP', metric));
    
    // Cumulative Layout Shift
    onCLS((metric: unknown) => handleMetric('CLS', metric));
    
    // First Contentful Paint
    onFCP((metric: unknown) => handleMetric('FCP', metric));
    
    // Time to First Byte
    onTTFB((metric: unknown) => handleMetric('TTFB', metric));
    
    // Interaction to Next Paint (replaces FID)
    onINP((metric: unknown) => handleMetric('INP', metric));
    
    if (config.debug) {
      console.log('[Vitals] Web Vitals monitoring initialized');
    }
  }).catch((error) => {
    // Fall back to manual collection if web-vitals library not available
    if (config.debug) {
      console.warn('[Vitals] web-vitals library not available, using fallback', error);
    }
    collectManually();
  });
}

/**
 * Dynamic import of web-vitals library
 */
async function importWebVitals(): Promise<{
  onLCP: (callback: (metric: unknown) => void) => void;
  onCLS: (callback: (metric: unknown) => void) => void;
  onFCP: (callback: (metric: unknown) => void) => void;
  onTTFB: (callback: (metric: unknown) => void) => void;
  onINP: (callback: (metric: unknown) => void) => void;
}> {
  try {
    const module = await import('web-vitals') as unknown as {
      onLCP: (callback: (metric: unknown) => void) => void;
      onCLS: (callback: (metric: unknown) => void) => void;
      onFCP: (callback: (metric: unknown) => void) => void;
      onTTFB: (callback: (metric: unknown) => void) => void;
      onINP: (callback: (metric: unknown) => void) => void;
    };
    return module;
  } catch {
    throw new Error('web-vitals library not available');
  }
}

/**
 * Manual vitals collection fallback
 */
function collectManually(): void {
  // FCP using Performance Observer
  collectFCP();
  
  // LCP using Performance Observer
  collectLCP();
  
  // FID using Performance Observer
  collectFID();
  
  // CLS using Performance Observer
  collectCLS();
  
  // TTFB from Navigation Timing
  collectTTFB();
  
  // INP using Performance Observer
  collectINP();
}

// ==========================================================================
// Manual Collection Functions
// ==========================================================================

function collectFCP(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        handleMetric('FCP', {
          name: 'FCP',
          value: entry.startTime,
          delta: entry.startTime,
          id: generateId(),
          navigationType: getNavigationType(),
        });
        observer.disconnect();
      }
    }
  });
  
  try {
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // Not supported
  }
}

function collectLCP(): void {
  let lcpValue = 0;
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    lcpValue = lastEntry.startTime;
  });
  
  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    return;
  }
  
  // Report on page visibility change
  const reportLCP = () => {
    if (lcpValue > 0) {
      handleMetric('LCP', {
        name: 'LCP',
        value: lcpValue,
        delta: lcpValue,
        id: generateId(),
        navigationType: getNavigationType(),
      });
      observer.disconnect();
    }
  };
  
  addEventListener('visibilitychange', reportLCP, { once: true });
  addEventListener('pagehide', reportLCP, { once: true });
}

function collectFID(): void {
  const observer = new PerformanceObserver((list) => {
    const entry = list.getEntries()[0] as PerformanceEventTiming;
    if (entry) {
      const value = entry.processingStart - entry.startTime;
      handleMetric('FID', {
        name: 'FID',
        value,
        delta: value,
        id: generateId(),
        navigationType: getNavigationType(),
      });
      observer.disconnect();
    }
  });
  
  try {
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // Not supported
  }
}

function collectCLS(): void {
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as any;
      if (!layoutShift.hadRecentInput) {
        const firstEntry = sessionEntries[0];
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        
        if (sessionValue &&
            entry.startTime - lastEntry.startTime < 1000 &&
            entry.startTime - firstEntry.startTime < 5000) {
          sessionValue += layoutShift.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = layoutShift.value;
          sessionEntries = [entry];
        }
        
        if (sessionValue > clsValue) {
          clsValue = sessionValue;
        }
      }
    }
  });
  
  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    return;
  }
  
  // Report on page visibility change
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && clsValue > 0) {
      handleMetric('CLS', {
        name: 'CLS',
        value: clsValue,
        delta: clsValue,
        id: generateId(),
        navigationType: getNavigationType(),
      });
      observer.disconnect();
    }
  }, { once: true });
}

function collectTTFB(): void {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (nav) {
    const value = nav.responseStart - nav.requestStart;
    handleMetric('TTFB', {
      name: 'TTFB',
      value,
      delta: value,
      id: generateId(),
      navigationType: getNavigationType(),
    });
  }
}

function collectINP(): void {
  const interactions: number[] = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceEventTiming[]) {
      if ((entry as any).interactionId) {
        interactions.push(entry.duration);
      }
    }
  });
  
  try {
    observer.observe({ type: 'event', buffered: true } as PerformanceObserverInit);
  } catch {
    return;
  }
  
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && interactions.length > 0) {
      interactions.sort((a, b) => a - b);
      const index = Math.floor(interactions.length * 0.98);
      const value = interactions[Math.min(index, interactions.length - 1)];
      
      handleMetric('INP', {
        name: 'INP',
        value,
        delta: value,
        id: generateId(),
        navigationType: getNavigationType(),
      });
      observer.disconnect();
    }
  }, { once: true });
}

// ==========================================================================
// Metric Handling
// ==========================================================================

function handleMetric(
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP',
  rawMetric: any
): void {
  const metric: WebVitalsMetric = {
    name,
    value: rawMetric.value,
    rating: getRating(name, rawMetric.value),
    delta: rawMetric.delta ?? rawMetric.value,
    id: rawMetric.id ?? generateId(),
    navigationType: rawMetric.navigationType ?? getNavigationType(),
  };
  
  // Store in status
  const key = name.toLowerCase() as keyof Omit<VitalsStatus, 'timestamp'>;
  vitalsStatus[key] = metric;
  
  // Log if debug enabled
  if (config.debug) {
    const emoji = metric.rating === 'good' ? '✅' : 
                  metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[Vitals] ${emoji} ${name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }
  
  // Call custom callback
  config.onMetric?.(metric);
  
  // Send to analytics
  if (config.analyticsEndpoint) {
    sendToAnalytics(metric);
  }
}

// ==========================================================================
// Analytics
// ==========================================================================

function sendToAnalytics(metric: WebVitalsMetric): void {
  const body = JSON.stringify({
    ...metric,
    context: config.context,
    url: location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    connection: getConnectionInfo(),
  });
  
  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon(config.analyticsEndpoint!, body);
  } else {
    fetch(config.analyticsEndpoint!, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

// ==========================================================================
// Utility Functions
// ==========================================================================

function generateId(): string {
  return `v3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getNavigationType(): string {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  return nav?.type || 'navigate';
}

function getConnectionInfo(): Record<string, any> | null {
  const connection = (navigator as any).connection;
  if (!connection) return null;
  
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

// ==========================================================================
// Public API
// ==========================================================================

/**
 * Get current vitals status
 */
export function getVitalsStatus(): VitalsStatus {
  return { ...vitalsStatus };
}

/**
 * Check if all metrics are "good"
 */
export function areVitalsGood(): boolean {
  return Object.values(vitalsStatus)
    .filter((v): v is WebVitalsMetric => v !== null && typeof v === 'object' && 'rating' in v)
    .every(m => m.rating === 'good');
}

/**
 * Get metrics that need improvement
 */
export function getMetricsNeedingImprovement(): WebVitalsMetric[] {
  return Object.values(vitalsStatus)
    .filter((v): v is WebVitalsMetric => 
      v !== null && 
      typeof v === 'object' && 
      'rating' in v &&
      v.rating !== 'good'
    );
}

/**
 * Create a summary report
 */
export function getVitalsSummary(): {
  overall: 'good' | 'needs-improvement' | 'poor';
  metrics: Record<string, { value: number; rating: string } | null>;
  recommendations: string[];
} {
  const metrics: Record<string, { value: number; rating: string } | null> = {};
  let poorCount = 0;
  let needsImprovementCount = 0;
  const recommendations: string[] = [];
  
  for (const [key, value] of Object.entries(vitalsStatus)) {
    if (key === 'timestamp') continue;
    
    if (value && typeof value === 'object' && 'rating' in value) {
      metrics[key.toUpperCase()] = { value: value.value, rating: value.rating };
      
      if (value.rating === 'poor') {
        poorCount++;
        recommendations.push(getRecommendation(value.name, value.value));
      } else if (value.rating === 'needs-improvement') {
        needsImprovementCount++;
        recommendations.push(getRecommendation(value.name, value.value));
      }
    } else {
      metrics[key.toUpperCase()] = null;
    }
  }
  
  let overall: 'good' | 'needs-improvement' | 'poor' = 'good';
  if (poorCount > 0) overall = 'poor';
  else if (needsImprovementCount > 0) overall = 'needs-improvement';
  
  return { overall, metrics, recommendations };
}

function getRecommendation(name: string, value: number): string {
  switch (name) {
    case 'LCP':
      return `LCP is ${value.toFixed(0)}ms. Optimize largest content element by using lazy loading, CDN, or reducing image sizes.`;
    case 'FID':
      return `FID is ${value.toFixed(0)}ms. Reduce JavaScript execution time by code splitting, removing unused code, or using web workers.`;
    case 'CLS':
      return `CLS is ${value.toFixed(3)}. Set explicit dimensions for images and embeds, avoid inserting content above existing content.`;
    case 'FCP':
      return `FCP is ${value.toFixed(0)}ms. Eliminate render-blocking resources, inline critical CSS, preload key resources.`;
    case 'TTFB':
      return `TTFB is ${value.toFixed(0)}ms. Use a CDN, optimize server response time, use HTTP/2 or HTTP/3.`;
    case 'INP':
      return `INP is ${value.toFixed(0)}ms. Optimize event handlers, use requestAnimationFrame, break up long tasks.`;
    default:
      return '';
  }
}

/**
 * Log vitals summary to console
 */
export function logVitalsSummary(): void {
  const summary = getVitalsSummary();
  
  console.group('📊 Core Web Vitals Summary');
  
  const overallEmoji = summary.overall === 'good' ? '✅' : 
                       summary.overall === 'needs-improvement' ? '⚠️' : '❌';
  console.log(`Overall: ${overallEmoji} ${summary.overall.toUpperCase()}`);
  
  console.group('Metrics');
  for (const [name, data] of Object.entries(summary.metrics)) {
    if (data) {
      const emoji = data.rating === 'good' ? '✅' : 
                    data.rating === 'needs-improvement' ? '⚠️' : '❌';
      const unit = name === 'CLS' ? '' : 'ms';
      console.log(`${emoji} ${name}: ${data.value.toFixed(name === 'CLS' ? 3 : 0)}${unit}`);
    } else {
      console.log(`⏳ ${name}: pending`);
    }
  }
  console.groupEnd();
  
  if (summary.recommendations.length > 0) {
    console.group('Recommendations');
    summary.recommendations.forEach(r => console.log(`• ${r}`));
    console.groupEnd();
  }
  
  console.groupEnd();
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Delay initialization to not block critical rendering
  if (document.readyState === 'complete') {
    setTimeout(() => initVitals({ debug: false }), 0);
  } else {
    addEventListener('load', () => initVitals({ debug: false }));
  }
}
