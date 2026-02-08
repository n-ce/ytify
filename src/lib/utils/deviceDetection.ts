/**
 * Device Detection Utility for ytify Music Player
 * Supports multi-device experiences: TV, CarPlay, Android Auto, mobile, desktop, tablet
 */

import { createSignal, createEffect, onCleanup, createMemo, type Accessor } from 'solid-js';

/**
 * Represents the detected device information
 */
export interface DeviceInfo {
  /** The primary device type classification */
  type: 'tv' | 'carplay' | 'android-auto' | 'mobile' | 'tablet' | 'desktop';
  /** Whether touch input is available */
  isTouchEnabled: boolean;
  /** Whether device is a TV */
  isTV: boolean;
  /** Whether device is in a car environment (CarPlay or Android Auto) */
  isCar: boolean;
  /** Whether device is a mobile phone */
  isMobile: boolean;
  /** Whether device is a desktop computer */
  isDesktop: boolean;
  /** Whether device is a tablet */
  isTablet: boolean;
  /** Screen size classification based on viewport */
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  /** Whether user prefers reduced motion */
  preferReducedMotion: boolean;
  /** Whether device supports hover interactions */
  supportsHover: boolean;
}

/** Common TV user-agent patterns */
const TV_USER_AGENT_PATTERNS = [
  /SmartTV/i,
  /SMART-TV/i,
  /Tizen/i,
  /Web0S/i,
  /webOS/i,
  /Android TV/i,
  /BRAVIA/i,
  /CrKey/i,           // Chromecast
  /AFTM/i,            // Amazon Fire TV (mobile stick)
  /AFTS/i,            // Amazon Fire TV Stick
  /AFTT/i,            // Amazon Fire TV (2nd gen)
  /AFTB/i,            // Amazon Fire TV (1st gen)
  /AFT[A-Z]/i,        // Generic Amazon Fire TV pattern
  /Roku/i,
  /Apple ?TV/i,
  /Philips/i,
  /Vizio/i,
  /Hisense/i,
  /VIDAA/i,
  /NetCast/i,
  /NETTV/i,
  /GoogleTV/i,
  /Opera TV/i,
  /HbbTV/i,           // Hybrid Broadcast Broadband TV
];

/** Common car display resolutions (width x height) */
const CAR_DISPLAY_RESOLUTIONS = [
  { width: 800, height: 480 },
  { width: 1024, height: 600 },
  { width: 1280, height: 480 },
  { width: 1280, height: 720 },
  { width: 1920, height: 720 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 720 },
];

/** Resolution tolerance for car display detection (pixels) */
const RESOLUTION_TOLERANCE = 20;

/**
 * Safely gets the user agent string, handling SSR and undefined navigator
 * @returns The user agent string or empty string if unavailable
 */
function getUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

/**
 * Safely gets the window dimensions
 * @returns Object with width and height, defaulting to 0 if unavailable
 */
function getWindowDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth || 0,
    height: window.innerHeight || 0,
  };
}

/**
 * Safely gets the screen dimensions
 * @returns Object with width and height, defaulting to 0 if unavailable
 */
function getScreenDimensions(): { width: number; height: number } {
  if (typeof screen === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: screen.width || 0,
    height: screen.height || 0,
  };
}

/**
 * Detects if the current device is a Smart TV
 * @returns True if TV patterns are detected in the user agent
 */
function detectTV(): boolean {
  const userAgent = getUserAgent();
  if (!userAgent) return false;
  
  return TV_USER_AGENT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Detects if the current device is an iOS device
 * @returns True if iOS device is detected
 */
function detectIOS(): boolean {
  const userAgent = getUserAgent();
  if (!userAgent) return false;
  
  // Check for iPad, iPhone, iPod
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // Also check for iPad on iOS 13+ (reports as Mac)
  const isIPadOS = /Macintosh/.test(userAgent) && 
    typeof navigator !== 'undefined' && 
    navigator.maxTouchPoints > 1;
  
  return isIOS || isIPadOS;
}

/**
 * Detects if the current device is an Android device
 * @returns True if Android device is detected
 */
function detectAndroid(): boolean {
  const userAgent = getUserAgent();
  if (!userAgent) return false;
  
  return /Android/i.test(userAgent);
}

/**
 * Detects if the current environment is CarPlay
 * Uses multiple heuristics including resolution, user agent, and environment flags
 * @returns True if CarPlay environment is detected
 */
function detectCarPlay(): boolean {
  const userAgent = getUserAgent();
  
  // Check for CarPlay-specific indicators
  if (userAgent.includes('CarPlay')) return true;
  
  // Check for Apple CarPlay resolution patterns combined with iOS
  if (detectIOS()) {
    const { width, height } = getScreenDimensions();
    
    // CarPlay typically uses specific aspect ratios
    const aspectRatio = width / height;
    const isCarPlayAspectRatio = aspectRatio >= 1.5 && aspectRatio <= 3.5;
    
    // Check if resolution matches common car displays
    const matchesCarResolution = CAR_DISPLAY_RESOLUTIONS.some(
      res =>
        Math.abs(width - res.width) <= RESOLUTION_TOLERANCE &&
        Math.abs(height - res.height) <= RESOLUTION_TOLERANCE
    );
    
    if (matchesCarResolution && isCarPlayAspectRatio) return true;
  }
  
  // Check for standalone/fullscreen mode which is common in car environments
  if (typeof window !== 'undefined' && window.matchMedia) {
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if ((isFullscreen || isStandalone) && detectIOS()) {
      // Additional heuristic: car displays often have unusual aspect ratios
      const { width, height } = getWindowDimensions();
      const aspectRatio = width / height;
      if (aspectRatio > 2) return true;
    }
  }
  
  return false;
}

/**
 * Detects if the current environment is Android Auto
 * Uses multiple heuristics including resolution, user agent, and platform hints
 * @returns True if Android Auto environment is detected
 */
function detectAndroidAuto(): boolean {
  const userAgent = getUserAgent();
  
  // Check for Android Auto specific indicators
  if (userAgent.includes('Android Auto') || userAgent.includes('AndroidAuto')) {
    return true;
  }
  
  // Check navigator.userAgentData for platform hints (modern browsers)
  if (typeof navigator !== 'undefined' && 'userAgentData' in navigator) {
    const userAgentData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    if (userAgentData?.platform?.toLowerCase().includes('automotive')) {
      return true;
    }
  }
  
  // Check for Android device with car-like display
  if (detectAndroid() && !detectTV()) {
    const { width, height } = getScreenDimensions();
    
    // Android Auto typically uses specific resolutions
    const matchesCarResolution = CAR_DISPLAY_RESOLUTIONS.some(
      res =>
        Math.abs(width - res.width) <= RESOLUTION_TOLERANCE &&
        Math.abs(height - res.height) <= RESOLUTION_TOLERANCE
    );
    
    // Car displays often have wide aspect ratios
    const aspectRatio = width / height;
    const isCarAspectRatio = aspectRatio >= 1.5 && aspectRatio <= 3.5;
    
    if (matchesCarResolution && isCarAspectRatio) {
      // Check for fullscreen mode
      if (typeof window !== 'undefined' && window.matchMedia) {
        const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        if (isFullscreen) return true;
      }
    }
  }
  
  return false;
}

/**
 * Detects if the current device is a tablet
 * @returns True if tablet is detected
 */
function detectTablet(): boolean {
  const userAgent = getUserAgent();
  if (!userAgent) return false;
  
  // iPad detection (including iPadOS 13+)
  if (/iPad/.test(userAgent)) return true;
  if (/Macintosh/.test(userAgent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) {
    return true;
  }
  
  // Android tablet detection
  if (detectAndroid() && !/Mobile/i.test(userAgent)) {
    return true;
  }
  
  // Windows tablet detection
  if (/Windows.*Touch/i.test(userAgent) || /Tablet PC/i.test(userAgent)) {
    return true;
  }
  
  // Amazon Fire tablet
  if (/KFAPW[A-Z]|KF[A-Z]{2,}WI/i.test(userAgent)) {
    return true;
  }
  
  return false;
}

/**
 * Detects if the current device is a mobile phone
 * @returns True if mobile phone is detected
 */
function detectMobile(): boolean {
  const userAgent = getUserAgent();
  if (!userAgent) return false;
  
  // Exclude tablets
  if (detectTablet()) return false;
  
  // iPhone detection
  if (/iPhone/.test(userAgent)) return true;
  
  // Android mobile detection (has "Mobile" in UA)
  if (detectAndroid() && /Mobile/i.test(userAgent)) return true;
  
  // Other mobile patterns
  if (/webOS|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i.test(userAgent)) {
    return true;
  }
  
  return false;
}

/**
 * Determines if touch input is available
 * @returns True if touch is supported
 */
function detectTouchEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

/**
 * Determines if the device supports hover interactions
 * @returns True if hover is properly supported
 */
function detectHoverSupport(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  
  // Check for hover capability
  const hasHover = window.matchMedia('(hover: hover)').matches;
  const hasPointer = window.matchMedia('(pointer: fine)').matches;
  
  return hasHover && hasPointer;
}

/**
 * Checks if user prefers reduced motion
 * @returns True if reduced motion is preferred
 */
function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Determines the screen size classification
 * @returns Screen size category
 */
function getScreenSizeCategory(): 'small' | 'medium' | 'large' | 'xlarge' {
  const { width } = getWindowDimensions();
  
  if (width === 0) return 'medium'; // Default for SSR
  if (width < 640) return 'small';
  if (width < 1024) return 'medium';
  if (width < 1440) return 'large';
  return 'xlarge';
}

/**
 * Detects comprehensive device information
 * @returns DeviceInfo object with all device characteristics
 * @example
 * ```typescript
 * const device = detectDevice();
 * if (device.isTV) {
 *   // Apply TV-optimized UI
 * }
 * ```
 */
export function detectDevice(): DeviceInfo {
  const isTV = detectTV();
  const isCarPlay = detectCarPlay();
  const isAndroidAuto = detectAndroidAuto();
  const isCar = isCarPlay || isAndroidAuto;
  const isTablet = !isTV && !isCar && detectTablet();
  const isMobile = !isTV && !isCar && !isTablet && detectMobile();
  const isDesktop = !isTV && !isCar && !isTablet && !isMobile;
  
  // Determine primary type
  let type: DeviceInfo['type'];
  if (isTV) type = 'tv';
  else if (isCarPlay) type = 'carplay';
  else if (isAndroidAuto) type = 'android-auto';
  else if (isTablet) type = 'tablet';
  else if (isMobile) type = 'mobile';
  else type = 'desktop';
  
  return {
    type,
    isTouchEnabled: detectTouchEnabled(),
    isTV,
    isCar,
    isMobile,
    isDesktop,
    isTablet,
    screenSize: getScreenSizeCategory(),
    preferReducedMotion: detectReducedMotion(),
    supportsHover: detectHoverSupport(),
  };
}

/**
 * Returns a CSS class string based on the detected device type
 * Useful for applying device-specific styles
 * @returns Space-separated CSS class names
 * @example
 * ```typescript
 * const deviceClass = getDeviceClass();
 * // Returns e.g., "device-tv touch-enabled screen-xlarge"
 * document.body.classList.add(...deviceClass.split(' '));
 * ```
 */
export function getDeviceClass(): string {
  const device = detectDevice();
  const classes: string[] = [];
  
  // Device type class
  classes.push(`device-${device.type}`);
  
  // Touch capability
  classes.push(device.isTouchEnabled ? 'touch-enabled' : 'touch-disabled');
  
  // Screen size class
  classes.push(`screen-${device.screenSize}`);
  
  // Hover support
  classes.push(device.supportsHover ? 'hover-enabled' : 'hover-disabled');
  
  // Reduced motion preference
  if (device.preferReducedMotion) {
    classes.push('reduced-motion');
  }
  
  // Car environment
  if (device.isCar) {
    classes.push('car-mode');
  }
  
  return classes.join(' ');
}

/**
 * Determines if the application should use audio-only mode
 * Recommended for car environments where visual distractions should be minimized
 * @returns True if audio-only mode is recommended
 * @example
 * ```typescript
 * if (shouldUseAudioOnlyMode()) {
 *   // Hide video player, show simplified audio controls
 * }
 * ```
 */
export function shouldUseAudioOnlyMode(): boolean {
  const device = detectDevice();
  
  // Car environments should prioritize audio
  if (device.isCar) return true;
  
  // Check if Media Session API indicates car/automotive mode
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    // Some implementations expose automotive hints
    const mediaSession = navigator.mediaSession;
    // Note: Currently no standard API, but prepared for future
    if ((mediaSession as MediaSession & { isAutomotive?: boolean }).isAutomotive) {
      return true;
    }
  }
  
  return false;
}

/**
 * Returns the optimal touch target size in pixels based on device type
 * Follows accessibility guidelines and device-specific recommendations
 * @returns Touch target size in pixels
 * @example
 * ```typescript
 * const targetSize = getOptimalTouchTarget();
 * // Use for button min-width/min-height
 * const buttonStyle = { minWidth: targetSize, minHeight: targetSize };
 * ```
 */
export function getOptimalTouchTarget(): number {
  const device = detectDevice();
  
  // TV remotes and car touch screens need larger targets
  if (device.isTV) return 56;
  if (device.isCar) return 64; // Larger for safety while driving
  
  // Mobile and tablet touch targets
  if (device.isMobile || device.isTablet) {
    // Apple HIG recommends 44pt, Google recommends 48dp
    return 48;
  }
  
  // Desktop with touch
  if (device.isTouchEnabled) return 44;
  
  // Desktop mouse interaction
  return 32;
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param func - Function to debounce
 * @param wait - Milliseconds to delay
 * @returns Debounced function
 */
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

/**
 * SolidJS reactive hook that provides device information and updates on resize/orientation change
 * @returns Accessor returning current DeviceInfo object that updates reactively
 * @example
 * ```typescript
 * function MyComponent() {
 *   const device = useDeviceInfo();
 *   
 *   return (
 *     <div class={`${device().type} ${device().isTouchEnabled ? 'touch' : ''}`}>
 *       {device().isCar && <SimplifiedControls />}
 *       {device().isTV && <TVRemoteNavigation />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeviceInfo(): Accessor<DeviceInfo> {
  const [deviceInfo, setDeviceInfo] = createSignal<DeviceInfo>(detectDevice());
  
  const updateDeviceInfo = () => {
    setDeviceInfo(detectDevice());
  };
  
  // Memoize the debounced update function
  const debouncedUpdate = createMemo(() => debounce(updateDeviceInfo, 150));
  
  createEffect(() => {
    // Skip if running in SSR
    if (typeof window === 'undefined') return;
    
    const debounced = debouncedUpdate();
    
    // Listen for resize events
    const handleResize = () => {
      debounced();
    };
    
    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Small delay to let the browser settle after orientation change
      setTimeout(updateDeviceInfo, 100);
    };
    
    // Listen for media query changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hoverQuery = window.matchMedia('(hover: hover)');
    
    const handleMediaQueryChange = () => {
      updateDeviceInfo();
    };
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Use addEventListener for media queries (modern approach)
    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', handleMediaQueryChange);
      hoverQuery.addEventListener('change', handleMediaQueryChange);
    } else {
      // Fallback for older browsers
      reducedMotionQuery.addListener?.(handleMediaQueryChange);
      hoverQuery.addListener?.(handleMediaQueryChange);
    }
    
    // Cleanup using SolidJS onCleanup
    onCleanup(() => {
      debounced.cancel();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      if (reducedMotionQuery.removeEventListener) {
        reducedMotionQuery.removeEventListener('change', handleMediaQueryChange);
        hoverQuery.removeEventListener('change', handleMediaQueryChange);
      } else {
        reducedMotionQuery.removeListener?.(handleMediaQueryChange);
        hoverQuery.removeListener?.(handleMediaQueryChange);
      }
    });
  });
  
  return deviceInfo;
}

/**
 * Gets the current device type as a string
 * Convenience wrapper around detectDevice().type
 * @returns Device type string
 */
export function getDeviceType(): DeviceInfo['type'] {
  return detectDevice().type;
}

/**
 * Checks if the current environment is a Smart TV
 * @returns True if running on a TV
 */
export function isSmartTV(): boolean {
  return detectTV();
}

/**
 * Checks if the current environment is a car (CarPlay or Android Auto)
 * @returns True if running in a car environment
 */
export function isCarEnvironment(): boolean {
  return detectCarPlay() || detectAndroidAuto();
}

/**
 * Gets recommended UI density based on device type
 * @returns 'compact' | 'comfortable' | 'spacious'
 */
export function getRecommendedUIDensity(): 'compact' | 'comfortable' | 'spacious' {
  const device = detectDevice();
  
  if (device.isTV || device.isCar) return 'spacious';
  if (device.isTablet) return 'comfortable';
  if (device.isMobile && device.screenSize === 'small') return 'compact';
  
  return 'comfortable';
}

/**
 * Gets recommended animation duration multiplier
 * @returns Number to multiply base animation durations by
 */
export function getAnimationDurationMultiplier(): number {
  const device = detectDevice();
  
  // No animations for reduced motion
  if (device.preferReducedMotion) return 0;
  
  // Faster animations for TV (10-foot experience)
  if (device.isTV) return 1.5;
  
  // Normal speed for other devices
  return 1;
}
