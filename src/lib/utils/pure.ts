export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const fetchJson = async <T>(
  url: string,
  signal?: AbortSignal
): Promise<T> => fetch(url, { signal })
  .then(res => {
    if (!res.ok)
      throw new Error(`Network response was not ok: ${res.statusText}`);
    return res.json() as Promise<T>;
  });

// Fallback Invidious instances when Uma fetch fails
const FALLBACK_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
  'https://invidious.protokolla.fi',
  'https://iv.melmac.space'
];

export async function fetchUma(): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/iv.txt', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('Uma fetch failed with status:', res.status);
      return FALLBACK_INSTANCES;
    }

    const text = await res.text();
    let decompressedString = text;
    const decodePairs: Record<string, string> = {
      '$': 'invidious',
      '&': 'inv',
      '#': 'iv',
      '~': 'com'
    };

    for (const code in decodePairs) {
      const safeCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeCode, 'g');
      decompressedString = decompressedString.replace(regex, decodePairs[code]);
    }

    const instances = decompressedString.split(',').map(i => `https://${i}`);
    return instances.length > 0 ? instances : FALLBACK_INSTANCES;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Uma fetch error, using fallback instances:', error);
    return FALLBACK_INSTANCES;
  }
}

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  if (seconds === Infinity) return 'Emergency Mode';
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return (hh > 0 ?
    hh + ':' : '') + `${mmStr}:${ssStr}`;
}

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

// Safe utilities re-exported from canonical location
export { safeJsonParse, safeJsonStringify } from './safe';

/**
 * Safe localStorage wrapper with quota handling
 */
export const safeStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage get error:', error);
      return null;
    }
  },
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage set error (quota exceeded?):', error);
      return false;
    }
  },
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Fetch with timeout
 */
export const fetchWithTimeout = async (
  url: string,
  timeout = 15000,
  options?: RequestInit
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
