/**
 * ============================================================================
 * YTFY Performance Utilities
 * ============================================================================
 * Purpose: Web Vitals measurement, performance monitoring, and reporting
 * Metrics: FCP, LCP, FID, CLS, TTFB, INP
 * ============================================================================
 */

// ==========================================================================
// Types
// ==========================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

export interface VitalsReport {
  fcp: PerformanceMetric | null;
  lcp: PerformanceMetric | null;
  fid: PerformanceMetric | null;
  cls: PerformanceMetric | null;
  ttfb: PerformanceMetric | null;
  inp: PerformanceMetric | null;
}

export interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  transferSize: number;
  decodedBodySize: number;
  startTime: number;
  responseEnd: number;
}

export interface PerformanceConfig {
  /** Enable console logging */
  debug?: boolean;
  /** Report to analytics endpoint */
  analyticsUrl?: string;
  /** Sample rate (0-1) for reporting */
  sampleRate?: number;
  /** Custom labels for reports */
  labels?: Record<string, string>;
}

// ==========================================================================
// Constants
// ==========================================================================

const THRESHOLDS = {
  // First Contentful Paint
  FCP: { good: 1800, poor: 3000 },
  // Largest Contentful Paint
  LCP: { good: 2500, poor: 4000 },
  // First Input Delay
  FID: { good: 100, poor: 300 },
  // Cumulative Layout Shift
  CLS: { good: 0.1, poor: 0.25 },
  // Time to First Byte
  TTFB: { good: 800, poor: 1800 },
  // Interaction to Next Paint
  INP: { good: 200, poor: 500 },
};

// ==========================================================================
// State
// ==========================================================================

let config: PerformanceConfig = {
  debug: false,
  sampleRate: 1,
};

const vitalsReport: VitalsReport = {
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null,
  inp: null,
};

// ==========================================================================
// Configuration
// ==========================================================================

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(options: PerformanceConfig = {}): void {
  config = { ...config, ...options };
  
  // Check sample rate
  if (Math.random() > (config.sampleRate || 1)) {
    return;
  }
  
  // Start monitoring
  observeWebVitals();
  observeResourceTiming();
  observeLongTasks();
  
  if (config.debug) {
    console.log('[Perf] Performance monitoring initialized');
  }
}

// ==========================================================================
// Web Vitals Observer
// ==========================================================================

/**
 * Observe and report Core Web Vitals
 */
function observeWebVitals(): void {
  // First Contentful Paint
  observePaint('first-contentful-paint', (entry) => {
    const metric = createMetric('FCP', entry.startTime, [entry]);
    vitalsReport.fcp = metric;
    reportMetric(metric);
  });
  
  // Largest Contentful Paint
  observeLCP((entry) => {
    const metric = createMetric('LCP', entry.startTime, [entry]);
    vitalsReport.lcp = metric;
    reportMetric(metric);
  });
  
  // First Input Delay
  observeFID((entry) => {
    const metric = createMetric('FID', entry.processingStart - entry.startTime, [entry]);
    vitalsReport.fid = metric;
    reportMetric(metric);
  });
  
  // Cumulative Layout Shift
  observeCLS((entries, value) => {
    const metric = createMetric('CLS', value, entries);
    vitalsReport.cls = metric;
    reportMetric(metric);
  });
  
  // Time to First Byte
  observeTTFB();
  
  // Interaction to Next Paint
  observeINP();
}

/**
 * Observe paint timing
 */
function observePaint(
  paintType: 'first-paint' | 'first-contentful-paint',
  callback: (entry: PerformanceEntry) => void
): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const entry = entries.find(e => e.name === paintType);
      if (entry) {
        callback(entry);
        observer.disconnect();
      }
    });
    
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Fallback for browsers without PerformanceObserver
    const entries = performance.getEntriesByType('paint');
    const entry = entries.find(e => e.name === paintType);
    if (entry) callback(entry);
  }
}

/**
 * Observe Largest Contentful Paint
 */
function observeLCP(callback: (entry: PerformanceEntry) => void): void {
  try {
    let lastEntry: PerformanceEntry | null = null;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      lastEntry = entries[entries.length - 1];
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // Report on visibility change or page hide
    const reportLCP = () => {
      if (lastEntry) {
        callback(lastEntry);
        observer.disconnect();
      }
    };
    
    addEventListener('visibilitychange', reportLCP, { once: true });
    addEventListener('pagehide', reportLCP, { once: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] LCP not supported');
  }
}

/**
 * Observe First Input Delay
 */
function observeFID(callback: (entry: PerformanceEventTiming) => void): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      if (entries.length > 0) {
        callback(entries[0]);
        observer.disconnect();
      }
    });
    
    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] FID not supported');
  }
}

/**
 * Observe Cumulative Layout Shift
 */
function observeCLS(callback: (entries: PerformanceEntry[], value: number) => void): void {
  try {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as any).hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
          
          // If the entry occurred within 1 second of the previous entry and
          // less than 5 seconds after the first entry, include it in the session
          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += (entry as any).value;
            sessionEntries.push(entry);
          } else {
            sessionValue = (entry as any).value;
            sessionEntries = [entry];
          }
          
          // Update CLS if session value is larger
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries;
          }
        }
      }
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
    
    // Report on visibility change
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        callback(clsEntries, clsValue);
        observer.disconnect();
      }
    }, { once: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] CLS not supported');
  }
}

/**
 * Observe Time to First Byte
 */
function observeTTFB(): void {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      const metric = createMetric('TTFB', ttfb, [navEntry]);
      vitalsReport.ttfb = metric;
      reportMetric(metric);
    }
  } catch (e) {
    if (config.debug) console.warn('[Perf] TTFB not available');
  }
}

/**
 * Observe Interaction to Next Paint
 */
function observeINP(): void {
  try {
    const interactions: number[] = [];
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        // interactionId is a newer API, use any to avoid TS errors
        if ((entry as any).interactionId) {
          const duration = entry.duration;
          interactions.push(duration);
        }
      }
    });
    
    // durationThreshold is a valid option for event observer
    observer.observe({ type: 'event', buffered: true } as PerformanceObserverInit);
    
    // Calculate INP on page hide
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && interactions.length > 0) {
        // INP is the 98th percentile of interactions
        interactions.sort((a, b) => a - b);
        const index = Math.floor(interactions.length * 0.98);
        const inp = interactions[Math.min(index, interactions.length - 1)];
        
        const metric = createMetric('INP', inp, []);
        vitalsReport.inp = metric;
        reportMetric(metric);
        observer.disconnect();
      }
    }, { once: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] INP not supported');
  }
}

// ==========================================================================
// Resource Timing
// ==========================================================================

/**
 * Observe resource timing
 */
function observeResourceTiming(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      
      for (const entry of entries) {
        if (config.debug && entry.duration > 1000) {
          console.warn('[Perf] Slow resource:', {
            name: entry.name,
            duration: Math.round(entry.duration),
            type: entry.initiatorType,
          });
        }
      }
    });
    
    observer.observe({ type: 'resource', buffered: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] Resource timing not supported');
  }
}

/**
 * Get resource timing analysis
 */
export function getResourceTimingAnalysis(): ResourceTiming[] {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return entries.map(entry => ({
    name: entry.name,
    type: entry.initiatorType,
    duration: Math.round(entry.duration),
    transferSize: entry.transferSize,
    decodedBodySize: entry.decodedBodySize,
    startTime: Math.round(entry.startTime),
    responseEnd: Math.round(entry.responseEnd),
  }));
}

/**
 * Get slow resources (> threshold ms)
 */
export function getSlowResources(threshold = 1000): ResourceTiming[] {
  return getResourceTimingAnalysis().filter(r => r.duration > threshold);
}

// ==========================================================================
// Long Tasks
// ==========================================================================

/**
 * Observe long tasks (> 50ms)
 */
function observeLongTasks(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (config.debug) {
          console.warn('[Perf] Long task detected:', {
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
          });
        }
      }
    });
    
    observer.observe({ type: 'longtask', buffered: true });
  } catch (e) {
    if (config.debug) console.warn('[Perf] Long task observation not supported');
  }
}

// ==========================================================================
// Metric Creation & Reporting
// ==========================================================================

/**
 * Create a performance metric object
 */
function createMetric(
  name: keyof typeof THRESHOLDS,
  value: number,
  entries: PerformanceEntry[]
): PerformanceMetric {
  const threshold = THRESHOLDS[name];
  let rating: 'good' | 'needs-improvement' | 'poor';
  
  if (value <= threshold.good) {
    rating = 'good';
  } else if (value <= threshold.poor) {
    rating = 'needs-improvement';
  } else {
    rating = 'poor';
  }
  
  return {
    name,
    value: Math.round(value * 100) / 100, // Round to 2 decimal places
    rating,
    delta: value,
    id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    entries,
  };
}

/**
 * Report metric to console and analytics
 */
function reportMetric(metric: PerformanceMetric): void {
  if (config.debug) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[Perf] ${emoji} ${metric.name}: ${metric.value}ms (${metric.rating})`);
  }
  
  // Send to analytics endpoint
  if (config.analyticsUrl) {
    sendToAnalytics(metric);
  }
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: PerformanceMetric): Promise<void> {
  if (!config.analyticsUrl) return;
  
  try {
    const body = JSON.stringify({
      ...metric,
      labels: config.labels,
      timestamp: Date.now(),
      url: location.href,
      userAgent: navigator.userAgent,
    });
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(config.analyticsUrl, body);
    } else {
      fetch(config.analyticsUrl, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    }
  } catch (e) {
    if (config.debug) console.error('[Perf] Failed to send analytics:', e);
  }
}

// ==========================================================================
// Public API
// ==========================================================================

/**
 * Get current vitals report
 */
export function getVitalsReport(): VitalsReport {
  return { ...vitalsReport };
}

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): Record<string, number> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!nav) return {};
  
  return {
    dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
    tcpConnection: Math.round(nav.connectEnd - nav.connectStart),
    tlsNegotiation: Math.round(nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0),
    requestTime: Math.round(nav.responseStart - nav.requestStart),
    responseTime: Math.round(nav.responseEnd - nav.responseStart),
    domInteractive: Math.round(nav.domInteractive - nav.fetchStart),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
    loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart),
  };
}

/**
 * Measure execution time of a function
 */
export function measureExecution<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  if (config.debug) {
    console.log(`[Perf] ${name}: ${Math.round(duration)}ms`);
  }
  
  return result;
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  performance.mark(name);
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark?: string): number {
  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
    
    const entries = performance.getEntriesByName(name, 'measure');
    const duration = entries[entries.length - 1]?.duration ?? 0;
    
    if (config.debug) {
      console.log(`[Perf] ${name}: ${Math.round(duration)}ms`);
    }
    
    return duration;
  } catch (e) {
    return 0;
  }
}

/**
 * Clear performance marks and measures
 */
export function clearMarks(): void {
  performance.clearMarks();
  performance.clearMeasures();
}

/**
 * Get memory info (Chrome only)
 */
export function getMemoryInfo(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null {
  const memory = (performance as any).memory;
  if (!memory) return null;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
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
 * Log performance summary to console
 */
export function logPerformanceSummary(): void {
  console.group('📊 Performance Summary');
  
  // Web Vitals
  console.group('Core Web Vitals');
  Object.entries(vitalsReport).forEach(([key, metric]) => {
    if (metric) {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`${emoji} ${metric.name}: ${metric.value}${key === 'cls' ? '' : 'ms'}`);
    }
  });
  console.groupEnd();
  
  // Navigation Timing
  console.group('Navigation Timing');
  const navTiming = getNavigationTiming();
  Object.entries(navTiming).forEach(([key, value]) => {
    console.log(`${key}: ${value}ms`);
  });
  console.groupEnd();
  
  // Memory
  const memory = getMemoryInfo();
  if (memory) {
    console.group('Memory');
    console.log(`Used: ${formatBytes(memory.usedJSHeapSize)}`);
    console.log(`Total: ${formatBytes(memory.totalJSHeapSize)}`);
    console.log(`Limit: ${formatBytes(memory.jsHeapSizeLimit)}`);
    console.groupEnd();
  }
  
  // Slow Resources
  const slowResources = getSlowResources(500);
  if (slowResources.length > 0) {
    console.group(`⚠️ Slow Resources (${slowResources.length})`);
    slowResources.forEach(r => {
      console.log(`${r.name}: ${r.duration}ms`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}
