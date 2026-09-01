'use client';

import { useEffect, useState } from 'react';
import type { GameState, SeasonSummary } from '@/engine/types';
import { leagueName } from '@/engine/gameRules';
import { computeTable } from '@/engine/seasonProgression';
import { buildShareCard, shareCard } from '@/lib/shareCard';
import { CHAIRMAN_LABEL } from '@/engine/jobMarket';
import { formatMoney } from '@/engine/utils';
import ManagerAvatar from './ManagerAvatar';
import { Icon, type IconName } from './Icon';

export default function SeasonEndScreen({
  state,
  summary,
  onContinue,
  onAcceptJob,
  onRetire,
}: {
  state: GameState;
  summary: SeasonSummary;
  onContinue: () => void;
  onAcceptJob: (clubId: number) => void;
  onRetire: () => void;
}) {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const [shareLabel, setShareLabel] = useState('Share your season');

  /* Finishing a season is the moment that counts as a real referral — the
     site-level module decides whether there is anything to report, and is a
     no-op when the prize draw is switched off or the player arrived without a
     referral code. Guarded because the game also runs on the static GitHub
     Pages build, where the shared scripts are not loaded at all. */
  useEffect(() => {
    try {
      (window as unknown as { BKComp?: { markConverted?: () => void } }).BKComp?.markConverted?.();
    } catch {
      /* the share button must work whether or not the promo module is present */
    }
  }, []);

  async function onShare() {
    const row = computeTable(state, summary.leagueId).find((r) => r.clubId === state.userClubId) ?? null;
    let shareUrl: string | null = null;
    try {
      shareUrl = (window as unknown as { BKComp?: { shareUrl?: () => string | null } }).BKComp?.shareUrl?.() ?? null;
    } catch {
      shareUrl = null;
    }
    const text = buildShareCard({ state, summary, row, shareUrl });
    const how = await shareCard(text);
    if (how === 'copied') {
      setShareLabel('Copied — paste it anywhere');
      setTimeout(() => setShareLabel('Share your season'), 2600);
    } else if (how === 'shared') {
      setShareLabel('Shared');
      setTimeout(() => setShareLabel('Share your season'), 2600);
    }
  }
  const banner: { cls: string; icon: IconName | null; text: string } = summary.sacked
    ? { cls: 'fm-banner--red', icon: 'cross', text: 'SACKED' }
    : summary.champions
      ? { cls: 'fm-banner--gold', icon: 'trophy', text: 'CHAMPIONS!' }
      : summary.promoted
        ? { cls: 'fm-banner--green', icon: 'arrow-up', text: 'PROMOTED!' }
        : summary.relegated
          ? { cls: 'fm-banner--red', icon: 'arrow-down', text: 'RELEGATED' }
          : { cls: 'fm-banner--plain', icon: null, text: 'SEASON COMPLETE' };

  return (
    <div className="fm-screen fm-start">
      <span className={`fm-banner ${banner.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {banner.icon && <Icon name={banner.icon} size={20} />} {banner.text}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
        {state.managerProfile && (
          <ManagerAvatar
            config={state.managerProfile.avatarConfig}
            size={40}
            title={state.managerProfile.name}
            style={{ borderRadius: '50%', flexShrink: 0 }}
          />
        )}
        <h2 style={{ margin: 0 }}>
          {club.name} — {summary.year}/{(summary.year + 1) % 100}
        </h2>
      </div>
      <div className="fm-panel">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">League</span>
            <span className="fm-stat__value">{leagueName(summary.leagueId)}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Finished</span>
            <span className="fm-stat__value fm-stat__value--gold">{summary.position}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Points</span>
            <span className="fm-stat__value">{summary.pts}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Prize</span>
            <span className="fm-stat__value">{formatMoney(summary.prize)}</span>
          </div>
        </div>
      </div>

      <div className="fm-panel" style={{ textAlign: 'left' }}>
        <p className="fm-label" style={{ marginTop: 0 }}>
          Season review
        </p>
        <ul className="fm-news">
          <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Board objective: {summary.objective} —
            {summary.objectiveMet ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}>
                <Icon name="check" size={12} /> achieved
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--red)' }}>
                <Icon name="cross" size={12} /> missed
              </span>
            )}
          </li>
          {summary.cupRun && <li>BALLKNW Cup: {summary.cupRun}</li>}
          {summary.continentalRun && <li>Continental Champions Cup: {summary.continentalRun}</li>}
        </ul>
      </div>

      {summary.awards && summary.awards.length > 0 && (
        <div className="fm-panel" style={{ textAlign: 'left' }}>
          <p className="fm-label" style={{ marginTop: 0 }}>
            Season awards
          </p>
          <ul className="fm-news">
            {summary.awards.map((a, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="medal" size={13} /> {a}</li>
            ))}
          </ul>
        </div>
      )}

      {state.jobOffers.length > 0 && (
        <div className="fm-panel" style={{ textAlign: 'left' }}>
          <p className="fm-label" style={{ marginTop: 0 }}>
            {summary.sacked ? 'Clubs willing to give you a second chance' : 'Job offers on the table'}
          </p>
          {state.jobOffers.map((o) => {
            const c = state.clubs.find((x) => x.id === o.clubId);
            if (!c) return null;
            return (
              <div key={o.clubId} className="fm-job-offer">
                <span>
                  <strong>{c.name}</strong>
                  <span className="fm-player-row__sub">{o.note}</span>
                  {/* An offer put to you directly needs no interview, but it
                      should still say what the job actually is before you take
                      it — the same terms the Job Market screen lists. */}
                  <span className="fm-player-row__sub">
                    {formatMoney(o.budget)} budget · {o.objective} · {CHAIRMAN_LABEL[o.chairman]} chairman
                  </span>
                </span>
                <button className="fm-btn fm-btn--primary fm-btn--small" onClick={() => onAcceptJob(o.clubId)}>
                  Accept
                </button>
              </div>
            );
          })}
        </div>
      )}

      {state.history.length > 1 && (
        <div className="fm-panel" style={{ textAlign: 'left' }}>
          <p className="fm-label" style={{ marginTop: 0 }}>
            Career history
          </p>
          <ul className="fm-news">
            {[...state.history].reverse().map((h) => (
              <li key={h.year}>
                {h.year}/{(h.year + 1) % 100}: {leagueName(h.leagueId)}, {h.position}
                {ordinal(h.position)} — {h.pts} pts
                {h.champions ? (
                  <Icon name="trophy" size={12} style={{ marginLeft: 5, verticalAlign: -1 }} />
                ) : h.promoted ? (
                  <Icon name="arrow-up" size={12} style={{ marginLeft: 5, verticalAlign: -1 }} />
                ) : h.relegated ? (
                  <Icon name="arrow-down" size={12} style={{ marginLeft: 5, verticalAlign: -1 }} />
                ) : null}
                {h.sacked && <Icon name="cross" size={12} style={{ marginLeft: 5, verticalAlign: -1 }} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="fm-btn fm-btn--large" onClick={onShare} style={{ marginTop: 4 }}>
        {shareLabel}
      </button>

      <p className="fm-hint">Squad aged a year, contracts ticked down, academy graduated.</p>
      {summary.sacked ? (
        <>
          <p className="fm-error-text">
            You&apos;re out at {club.name}.
            {state.jobOffers.length > 0 ? ' Take a rescue job above, or walk away.' : ''}
          </p>
          <button className="fm-btn fm-btn--danger fm-btn--large" onClick={onRetire}>
            Retire from management
          </button>
        </>
      ) : (
        <button className="fm-btn fm-btn--primary fm-btn--large" onClick={onContinue}>
          Start the {state.seasonYear}/{(state.seasonYear + 1) % 100} season
        </button>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
