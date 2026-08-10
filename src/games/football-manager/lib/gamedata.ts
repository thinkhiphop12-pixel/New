import type { GameData } from '@/engine/types';
import { clubKit } from './clubColors';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

let cache: GameData | null = null;

export async function loadGameData(): Promise<GameData> {
  if (cache) return cache;
  const res = await fetch(`${BASE}/data/gamedata.json`);
  if (!res.ok) throw new Error(`Failed to load game data (${res.status})`);
  const data = (await res.json()) as GameData;
  // Kit colours live in code, not in the dataset: the dataset is regenerated
  // by scripts/build-gamedata.mjs and would otherwise drop them every rebuild.
  // Stamping here means crests, shirts and club theming all read the same
  // palette, from one place.
  for (const club of data.clubs) {
    const kit = clubKit(club.name);
    club.color = kit.primary;
    club.secondaryColor = kit.secondary;
  }
  cache = data;
  return cache;
}
