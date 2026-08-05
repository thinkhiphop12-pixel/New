'use client';

import type { Club, GameState } from '@/engine/types';
import { leagueName } from '@/engine/gameRules';
import { getSquad } from '@/engine/teamManagement';
import { Crest } from '../Crest';
import { clubForm, FormChip } from '../visuals';

/**
 * The mock's Match Preview: a crest-vs-crest banner over both sides' recent
 * form, their leading scorers, and the user's availability for this match.
 *
 * Sits above the team sheet before kick-off. Everything here is read from
 * state the season already tracks — played fixtures for form, `Player.goals`
 * for top scorer, `Player.injuryWeeks` for availability — so no figure on
 * this screen is invented for the layout's sake.
 */

function topScorer(state: GameState, clubId: number): { name: string; goals: number } | null {
  const best = getSquad(state, clubId).reduce<{ name: string; goals: number } | null>(
    (top, p) => (p.goals > 0 && (!top || p.goals > top.goals) ? { name: p.name, goals: p.goals } : top),
    null
  );
  return best;
}

function Side({ club, state }: { club: Club | undefined; state: GameState }) {
  const form = club ? clubForm(state, club.id) : [];
  return (
    <div className="fm-preview__side">
      <Crest name={club?.name} code={club?.code ?? ''} color={club?.color ?? 'var(--panel-3)'} size={44} />
      <span className="fm-preview__name">{club?.name ?? '—'}</span>
      <span className="fm-form-strip">
        {form.length > 0 ? (
          form.map((r, i) => <FormChip key={i} result={r} />)
        ) : (
          <span className="fm-preview__venue">No results yet</span>
        )}
      </span>
    </div>
  );
}

export default function MatchPreview({
  state,
  home,
  away,
  userIsHome,
}: {
  state: GameState;
  home: Club | undefined;
  away: Club | undefined;
  userIsHome: boolean;
}) {
  const userClubId = state.userClubId;
  const squad = getSquad(state, userClubId);
  const injured = squad.filter((p) => p.injuryWeeks > 0).length;
  const available = squad.filter((p) => p.injuryWeeks === 0).length;

  const homeScorer = home ? topScorer(state, home.id) : null;
  const awayScorer = away ? topScorer(state, away.id) : null;

  return (
    <div>
      <div className="fm-preview">
        <Side club={home} state={state} />
        <div className="fm-preview__mid">
          <span className="fm-preview__vs">V</span>
          <span className="fm-preview__venue">
            {leagueName(home?.leagueId ?? away?.leagueId ?? 'premier_league')}
          </span>
          <span className="fm-preview__venue">Week {state.week}</span>
        </div>
        <Side club={away} state={state} />
      </div>

      <div className="fm-preview-facts">
        <div className="fm-preview-fact">
          <span className="fm-preview-fact__label">{home?.code ?? 'Home'} top scorer</span>
          <span className="fm-preview-fact__value">
            {homeScorer ? `${homeScorer.name} (${homeScorer.goals})` : 'None yet'}
          </span>
        </div>
        <div className="fm-preview-fact">
          <span className="fm-preview-fact__label">{away?.code ?? 'Away'} top scorer</span>
          <span className="fm-preview-fact__value">
            {awayScorer ? `${awayScorer.name} (${awayScorer.goals})` : 'None yet'}
          </span>
        </div>
        <div className="fm-preview-fact">
          <span className="fm-preview-fact__label">Your squad</span>
          <span className="fm-preview-fact__value">
            {available} available
            {injured > 0 ? ` · ${injured} injured` : ''}
          </span>
        </div>
        <div className="fm-preview-fact">
          <span className="fm-preview-fact__label">Venue</span>
          <span className="fm-preview-fact__value">{userIsHome ? 'Home' : 'Away'}</span>
        </div>
      </div>
    </div>
  );
}
