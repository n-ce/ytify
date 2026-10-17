import { config } from "@utils";
import { playerStore } from "@stores";

export type SponsorSegment = [number, number];

let currentVideoId: string = "";
let segments: SponsorSegment[] = [];
let fetchAbortController: AbortController | null = null;

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

  currentVideoId = videoId;
  segments = [];

  if (!config.sponsorblock || playerStore.isMusic || !videoId) {
    return;
  }

  fetchAbortController = new AbortController();
  try {
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${encodeURIComponent(DEFAULT_CATEGORIES)}`;
    const res = await fetch(url, { signal: fetchAbortController.signal });
    if (!res.ok) return;
    const data = (await res.json()) as Array<{ segment: [number, number] }>;
    if (videoId === currentVideoId && Array.isArray(data)) {
      segments = data.map((d) => d.segment);
    }
  } catch {
    // Non-blocking fail on network or abort
  }
}

export function checkSponsorBlock(currentTime: number): void {
  if (!config.sponsorblock || playerStore.isMusic || segments.length === 0) {
    return;
  }

  for (const [start, end] of segments) {
    if (currentTime >= start && currentTime < end) {
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
}
