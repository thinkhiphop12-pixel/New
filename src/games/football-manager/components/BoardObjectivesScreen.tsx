'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { userLeagueId, userPosition, userLeague } from '@/engine/seasonProgression';
import { leagueName } from '@/engine/gameRules';
import { CHAIRMAN_BLURB, CHAIRMAN_LABEL, chairmanFor } from '@/engine/jobMarket';
import { Icon, type IconName } from './Icon';
import { ordinalSuffix } from './visuals';
import AssistantLine from './assistant/AssistantLine';

/**
 * Job security in one screen: the three factions who can each make your job
 * harder — board, fans, squad — read together instead of scattered across
 * Club, Finances, and here. Board confidence is what actually gets you
 * sacked (`engine/seasonProgression.ts` — `sacked = !objectiveMet &&
 * board.confidence < 20`, checked once at season end); fan confidence and
 * squad morale don't carry a firing threshold of their own, but they're what
 * a manager watches in practice, so they get the same verdict treatment
 * rather than reading as decoration next to the number that "really" counts.
 *
 * The screen used to say all of that in four stacked panels of prose, with
 * the sacking rule explained three separate times and every value expressed
 * as a bare `34/100`. Now each faction is one card: a face you can read
 * without reading, a bar, and a three-word verdict. The explanations still
 * exist — they moved behind each card's "Why?" toggle, which is where text
 * that long belongs when it isn't the answer to the question you opened the
 * screen with.
 */

/** A face whose mouth is drawn from the value. This is the part an eight-year-old
 *  reads first, and it carries the same information as the bar underneath —
 *  neither is decoration for the other. */
function MoodFace({ value, size = 44 }: { value: number; size?: number }) {
  // Mouth control point: well below the corners when happy (a smile), well
  // above them when miserable (a frown), flat in the middle.
  const curve = ((value - 50) / 50) * 7;
  const tone = value >= 65 ? 'var(--green)' : value >= 35 ? 'var(--gold)' : 'var(--red)';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="fm-mood">
      <circle cx="20" cy="20" r="18" fill="none" stroke={tone} strokeWidth="2.5" />
      <circle cx="14" cy="16" r="2.2" fill={tone} />
      <circle cx="26" cy="16" r="2.2" fill={tone} />
      <path
        d={`M 12 26 Q 20 ${26 + curve} 28 26`}
        fill="none"
        stroke={tone}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Faction {
  label: string;
  value: number;
  icon: IconName;
  /** Three or four words. The whole verdict, not the start of one. */
  verdict: string;
  /** What moves this number, in a sentence the manager can act on. */
  why: string;
}

export default function BoardObjectivesScreen({ state }: { state: GameState }) {
  /** Which faction has its explanation open. One at a time — the point of
   *  folding the prose away is that it isn't all on screen at once. */
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  const board = state.board;
  const leagueId = userLeagueId(state);
  const league = userLeague(state);
  const pos = userPosition(state);
  const ranked = pos > 0;
  const onTrack = ranked && pos <= board.minPosition;
  const chairman = chairmanFor(state.userClubId);

  const factions: Faction[] = [
    {
      label: 'The board',
      value: board.confidence,
      icon: 'club',
      verdict:
        board.confidence < 20 ? 'Ready to sack you'
          : board.confidence < 30 ? 'Losing patience'
            : board.confidence < 50 ? 'Not happy'
              : board.confidence < 75 ? 'Happy enough'
                : 'Delighted with you',
      why: `${CHAIRMAN_LABEL[chairman]} chairman — ${CHAIRMAN_BLURB[chairman].toLowerCase()} Moved by where you finish against the objective, and by the club staying out of the red. This is the only one that can cost you your job.`,
    },
    {
      label: 'The fans',
      value: state.fanConfidence,
      icon: 'stadium',
      verdict:
        state.fanConfidence <= 25 ? 'Booing you'
          : state.fanConfidence < 45 ? 'Getting restless'
            : state.fanConfidence >= 85 ? 'Singing your name'
              : 'Behind the team',
      why: 'They want wins — league or cup, they are not fussy which. Slower to turn than the board, but a long run without a win empties the stands.',
    },
    {
      label: 'The players',
      value: state.morale,
      icon: 'squad',
      verdict:
        state.morale < 40 ? 'Unhappy in training'
          : state.morale < 60 ? 'Getting on with it'
            : 'Playing for you',
      why: 'Results, playing time and what you say in press conferences all feed this. A squad that stops believing plays worse — which drags the board down with it.',
    },
  ];

  const safe = board.confidence >= 50;
  const sackRisk = board.confidence < 20;

  return (
    <>
      {/* --- The one thing you have to do -------------------------------
          This was the "Primary Objective" panel plus a "League Context"
          panel plus a "Dismissal Risk" panel, all restating the same
          sentence. It is one sentence, so it is one card. */}
      <div className="fm-mod fm-objective">
        <div className="fm-objective__head">
          <span className={`fm-objective__badge${onTrack ? ' is-good' : ' is-bad'}`}>
            <Icon name={onTrack ? 'check' : 'warning'} size={18} />
          </span>
          <div>
            <p className="fm-objective__task">Finish in the top {board.minPosition}</p>
            <p className="fm-objective__where">{leagueName(leagueId)} · {league.clubCount} teams</p>
          </div>
        </div>

        <div className="fm-objective__now">
          <span className="fm-objective__pos">{ranked ? `${pos}${ordinalSuffix(pos)}` : '—'}</span>
          <span className={`fm-objective__verdict${onTrack ? ' is-good' : ' is-bad'}`}>
            <Icon name={onTrack ? 'arrow-up' : 'arrow-down'} size={13} />
            {ranked ? (onTrack ? 'Good enough' : 'Not good enough') : 'No games played yet'}
          </span>
        </div>

        <p className={`fm-objective__stake${sackRisk ? ' is-bad' : ''}`}>
          {sackRisk
            ? 'Miss it and you are sacked at the end of the season.'
            : safe
              ? 'Miss it and the board will think hard about your future.'
              : 'Miss it with the board this unhappy and you lose the job.'}
        </p>
      </div>

      <AssistantLine state={state} route="board" />

      {/* --- Who you answer to ------------------------------------------
          Three cards, three faces, three verdicts. The paragraph that used
          to sit under each one is behind its Why? button. */}
      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">Who you keep happy</h2></div>

        <div className="fm-factions">
          {factions.map((f) => {
            const tone = f.value >= 65 ? 'var(--green)' : f.value >= 35 ? 'var(--gold)' : 'var(--red)';
            const open = openWhy === f.label;
            return (
              <div key={f.label} className="fm-faction">
                <MoodFace value={f.value} />
                <div className="fm-faction__body">
                  <p className="fm-faction__label">
                    <Icon name={f.icon} size={13} /> {f.label}
                  </p>
                  {/* Colour never says it alone: the word is the verdict and
                      the face repeats it, so the bar's tone is the third
                      copy rather than the only one. */}
                  <p className="fm-faction__verdict" style={{ color: tone }}>{f.verdict}</p>
                  <div className="fm-faction__track">
                    <i className="fm-faction__fill" style={{ width: `${Math.max(2, f.value)}%`, background: tone }} />
                  </div>
                </div>
                <button
                  type="button"
                  className="fm-faction__why"
                  aria-expanded={open}
                  onClick={() => setOpenWhy(open ? null : f.label)}
                >
                  {open ? 'Close' : 'Why?'}
                </button>
                {open && <p className="fm-faction__reason">{f.why}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

