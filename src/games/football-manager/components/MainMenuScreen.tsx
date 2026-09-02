'use client';

import dynamic from 'next/dynamic';
import { Icon } from './Icon';

import type { SaveMeta } from '@/lib/storage';
import type { ManagerProfile } from '@/engine/types';

// The three.js stadium background (gap 77). Loaded client-only: it builds a
// WebGL context and procedural canvas textures, neither of which exists on the
// server, and this also keeps three.js out of the server bundle entirely.
const StadiumScene = dynamic(() => import('./menu3d/StadiumScene'), { ssr: false });

export default function MainMenuScreen({
  saves,
  onContinue,
  onNewGame,
  onDelete,
  onCharacterCustomizer,
}: {
  saves: (SaveMeta | null)[];
  onContinue: (slot: number) => void;
  onNewGame: (slot: number) => void;
  onDelete: (slot: number) => void;
  onCharacterCustomizer: () => void;
}) {
  return (
    <>
      <StadiumScene />
      {/* Legibility scrim between the 3D background and the menu UI. Both
          layers are click-through so every button below still receives its
          own clicks. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(6,10,16,0.10) 0%, rgba(6,10,16,0.45) 55%, rgba(4,7,11,0.72) 100%)',
        }}
      />
      <div className="fm-screen fm-start" style={{ position: 'relative', zIndex: 1 }}>
      <p className="fm-label">A BALLKNW GAME</p>
      {/* Wordmark, not an image: the same boxed-initial + Oswald-caps lockup
          ballknw.com uses for BALLKNW, so the two logos are one mark. Text
          also stays crisp at any density and needs no asset request. */}
      <h2 className="fm-start__title" style={{ margin: '8px 0 0' }}>
        <span className="fm-brand fm-brand--hero">
          <span className="fm-brand__mark" aria-hidden>G</span>
          <span>GAFFA</span>
        </span>
      </h2>
      <p className="fm-start__tagline">
        Take charge of a club in any of 28 leagues across 25 countries. Set your tactics, work the
        market, bring through the kids — and survive the board. League, cup and continental glory
        await.
      </p>

      <div className="fm-slots">
        {saves.map((meta, slot) => (
          <div key={slot} className="fm-slot-card">
            <span className="fm-slot-card__num">SLOT {slot + 1}</span>
            {meta ? (
              <>
                <span className="fm-slot-card__club">{meta.clubName}</span>
                <span className="fm-slot-card__meta">
                  {meta.managerName} · {meta.leagueName} · {meta.seasonYear}/{(meta.seasonYear + 1) % 100} · Week{' '}
                  {Math.min(meta.week, 38)}
                </span>
                <div className="fm-slot-card__actions">
                  <button className="fm-btn fm-btn--primary fm-btn--small" onClick={() => onContinue(slot)}>
                    Continue
                  </button>
                  <button
                    className="fm-btn fm-btn--danger fm-btn--small"
                    onClick={() => {
                      if (window.confirm('Delete this career save?')) onDelete(slot);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="fm-slot-card__meta">Empty slot</span>
                <div className="fm-slot-card__actions">
                  <button className="fm-btn fm-btn--primary fm-btn--small" onClick={() => onNewGame(slot)}>
                    Start new career
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="fm-menu-actions">
        <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onCharacterCustomizer}>
          <Icon name="palette" size={15} /> Customize Manager
        </button>
      </div>

      <ol className="fm-howto">
        <li className="fm-howto__step">
          <span className="fm-howto__num">1</span>
          <div>
            <h3>Choose your club</h3>
            <p>Real clubs and current-season squads across 28 leagues in 25 countries — the English pyramid, Europe&apos;s big five, and everywhere from MLS and the Saudi Pro League to the K League and the League of Ireland.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">2</span>
          <div>
            <h3>Set up your team</h3>
            <p>Formations, pressing, tempo and width. Pick a training focus and watch your youngsters grow.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">3</span>
          <div>
            <h3>Run the club</h3>
            <p>Contracts, wages, loans, scouting and a youth academy — keep the board and the fans onside.</p>
          </div>
        </li>
        <li className="fm-howto__step">
          <span className="fm-howto__num">4</span>
          <div>
            <h3>Chase the silverware</h3>
            <p>League titles, the BALLKNW Cup and the Continental Champions Cup. Build your legacy.</p>
          </div>
        </li>
      </ol>
      </div>
    </>
  );
}
