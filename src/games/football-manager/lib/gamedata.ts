import type { GameData } from '@/engine/types';
import { withBase } from '@/lib/basePath';

const FETCH_TIMEOUT_MS = 15000;
const RETRY_BACKOFF_MS = 500;

let cache: GameData | null = null;
let inFlight: Promise<GameData> | null = null;

async function fetchOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string): Promise<GameData> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchOnce(url);
      if (res.ok) {
        return (await res.json()) as GameData;
      }
      if (res.status === 404) {
        // Misconfiguration (e.g. wrong base path) — fail fast, no retry.
        throw new Error(`Failed to load game data: ${res.status} ${res.statusText} at ${url}`);
      }
      lastError = new Error(`Failed to load game data: ${res.status} ${res.statusText} at ${url}`);
    } catch (e) {
      lastError = e;
      if (e instanceof Error && e.message.startsWith('Failed to load game data: 404')) {
        throw e;
      }
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to load game data at ${url}: ${String(lastError)}`);
}

export async function loadGameData(): Promise<GameData> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  const url = withBase('/data/gamedata.json');
  inFlight = fetchWithRetry(url)
    .then((data) => {
      cache = data;
      return data;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
