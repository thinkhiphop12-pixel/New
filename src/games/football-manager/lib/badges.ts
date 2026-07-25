/** Real crest artwork, used as an override for the procedural <Crest /> shield.
 *
 *  Most clubs have no artwork and fall back to the drawn shield, which is why
 *  the procedural crest — not this map — is the default everywhere. Drop a PNG
 *  into `public/badges/` and add its club name here to promote it. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Club name (as it appears in gamedata.json) -> file in public/badges. */
const CLUB_BADGES: Record<string, string> = {
  Wrexham: 'wrexham',
  'Cardiff City': 'cardiff_city',
};

/** Division number -> competition badge in public/badges. */
const DIVISION_BADGES: Record<number, string> = {
  2: 'championship',
  3: 'league_one',
  4: 'league_two',
};

export function clubBadgeUrl(clubName: string | undefined): string | null {
  if (!clubName) return null;
  const file = CLUB_BADGES[clubName];
  return file ? `${BASE}/badges/${file}.png` : null;
}

export function divisionBadgeUrl(division: number | undefined): string | null {
  if (division == null) return null;
  const file = DIVISION_BADGES[division];
  return file ? `${BASE}/badges/${file}.png` : null;
}
