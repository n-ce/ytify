import { config } from "@config";
import { playerStore } from "@stores";

type SponsorSegment = [number, number];

let currentVideoId: string = "";
let segments: SponsorSegment[] = [];
let fetchAbortController: AbortController | null = null;
let skippingToEnd: number | null = null;

const DEFAULT_CATEGORIES = JSON.stringify([
  "sponsor",
  "selfpromo",
  "interaction",
  "intro",
  "outro",
  "preview",
  "music_offtopic",
]);

export async function fetchSponsorSegments(videoId: string): Promise<void> {
  if (fetchAbortController) {
    fetchAbortController.abort();
    fetchAbortController = null;
  }

  if (videoId === currentVideoId && segments.length > 0) {
    return;
  }

  currentVideoId = videoId;
  segments = [];
  skippingToEnd = null;

  if (!config.sponsorblock || !videoId) {
    return;
  }

  fetchAbortController = new AbortController();
  try {
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(DEFAULT_CATEGORIES)}`;
    const res = await fetch(url, { signal: fetchAbortController.signal });
    if (!res.ok) return;
    const data = (await res.json()) as Array<{ segment: [number, number] }>;
    if (videoId === currentVideoId && Array.isArray(data)) {
      segments = data
        .map((d) => d.segment)
        .filter((s) => Array.isArray(s) && s.length === 2 && s[1] > s[0])
        .sort((a, b) => a[0] - b[0]);
    }
  } catch {
    // Non-blocking fail on network or abort
  }
}

export function checkSponsorBlock(currentTime: number): void {
  if (!config.sponsorblock || segments.length === 0) {
    return;
  }

  // Prevent multiple seeks to the same target while browser is seeking
  if (skippingToEnd !== null) {
    if (currentTime >= skippingToEnd - 0.25) {
      skippingToEnd = null;
    } else {
      return;
    }
  }

  for (const [start, end] of segments) {
    if (currentTime >= start && currentTime < end - 0.25) {
      skippingToEnd = end;
      playerStore.audio.currentTime = end;
      break;
    }
  }
}

export function clearSponsorSegments(): void {
  if (fetchAbortController) {
    fetchAbortController.abort();
    fetchAbortController = null;
  }
  currentVideoId = "";
  segments = [];
  skippingToEnd = null;
}
