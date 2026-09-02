/**
 * End-of-season share card.
 *
 * Builds the block of text a player pastes into WhatsApp, Discord or X after
 * finishing a season. The emoji bar is the point: it survives being pasted
 * anywhere, renders on every platform without an image, and is recognisable
 * enough at a glance that someone scrolling past asks what it is. That is the
 * whole growth loop — a screenshot would not travel nearly as well.
 *
 * Kept as a pure function so it can be reasoned about and tested without a DOM.
 */

import type { GameState, SeasonSummary, TableRow } from '@/engine/types';
import { leagueName } from '@/engine/gameRules';

/** Width of the form bar. Twenty cells is two comfortable phone lines and
 *  divides cleanly enough that a 38- or 46-game season still reads honestly. */
const BAR_CELLS = 20;

export interface ShareCardInput {
  state: GameState;
  summary: SeasonSummary;
  /** The user's final league row, if the table is available. Without it the
   *  card simply omits the form bar rather than inventing one. */
  row?: TableRow | null;
  /** Referral link from the site-level prize draw, when the player has one.
   *  Falls back to the plain domain. */
  shareUrl?: string | null;
}

/**
 * Spread W/D/L across a fixed-width bar using largest-remainder rounding, so
 * the cells always total BAR_CELLS and no non-zero result ever rounds away to
 * nothing — going unbeaten should look different from losing one game.
 */
export function formBar(won: number, drawn: number, lost: number): string {
  const played = won + drawn + lost;
  if (played <= 0) return '';

  const parts = [
    { glyph: '🟩', exact: (won / played) * BAR_CELLS },
    { glyph: '🟨', exact: (drawn / played) * BAR_CELLS },
    { glyph: '🟥', exact: (lost / played) * BAR_CELLS },
  ];

  // Any result that actually happened gets at least one cell.
  const counts = parts.map((p) => (p.exact > 0 ? Math.max(1, Math.floor(p.exact)) : 0));
  let used = counts.reduce((a, b) => a + b, 0);

  // Hand out what's left to the biggest fractional remainders; claw back from
  // the largest bucket if the minimum-one rule overshot.
  const order = parts
    .map((p, i) => ({ i, frac: p.exact - Math.floor(p.exact) }))
    .sort((a, b) => b.frac - a.frac);

  let k = 0;
  while (used < BAR_CELLS) {
    counts[order[k % order.length].i]++;
    used++;
    k++;
  }
  while (used > BAR_CELLS) {
    const biggest = counts.indexOf(Math.max(...counts));
    if (counts[biggest] <= 1) break;
    counts[biggest]--;
    used--;
  }

  return parts.map((p, i) => p.glyph.repeat(counts[i])).join('');
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/** The one-line headline for how the season went, most notable outcome first. */
function outcomeLine(summary: SeasonSummary): string | null {
  if (summary.champions) return '🏆 CHAMPIONS';
  if (summary.promoted) return '⬆️ PROMOTED';
  if (summary.relegated) return '⬇️ RELEGATED';
  if (summary.sacked) return '❌ SACKED';
  return null;
}

export function buildShareCard({ state, summary, row, shareUrl }: ShareCardInput): string {
  const club = state.clubs.find((c) => c.id === state.userClubId);
  const clubName = club?.name ?? 'My club';
  const season = `${summary.year}/${String((summary.year + 1) % 100).padStart(2, '0')}`;

  const lines: string[] = [];
  lines.push(`GAFFA ⚽ ${clubName} · ${season}`);
  lines.push(
    `${leagueName(summary.leagueId)} · ${summary.position}${ordinal(summary.position)} · ${summary.pts} pts`,
  );

  if (row && row.played > 0) {
    lines.push(formBar(row.won, row.drawn, row.lost));
    const gd = row.gd > 0 ? `+${row.gd}` : `${row.gd}`;
    lines.push(`W${row.won} D${row.drawn} L${row.lost} · ${gd} GD`);
  }

  const outcome = outcomeLine(summary);
  if (outcome) lines.push(outcome);

  // Cup runs are the bragging rights a league position misses.
  if (summary.cupRun) lines.push(`🏅 ${summary.cupRun}`);
  if (summary.continentalRun) lines.push(`🌍 ${summary.continentalRun}`);

  lines.push('');
  lines.push(shareUrl || 'https://www.ballknw.com/');

  return lines.join('\n');
}

/**
 * Hand the card to the OS share sheet where there is one, and fall back to the
 * clipboard everywhere else — navigator.share is mobile-and-secure-context
 * only, so on a desktop browser the button must still do something useful.
 * Resolves with how it was shared so the caller can word the confirmation.
 */
export async function shareCard(text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch {
      // A cancelled share sheet rejects, and so does a share the browser
      // refuses. Neither is worth an error state; fall through to copying.
      return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Older browsers, and any context where the clipboard API is blocked.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* nothing left to try */
    }
    document.body.removeChild(ta);
    return 'copied';
  }
}
