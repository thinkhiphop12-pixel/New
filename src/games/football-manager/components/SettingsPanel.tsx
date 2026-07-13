'use client';

import type { GameSettings, MatchSpeed } from '@/engine/types';

const SPEEDS: { id: MatchSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
  { id: 'instant', label: 'Instant' },
];

const DEFAULTS: GameSettings = {
  matchSpeed: 'normal',
  showCommentary: true,
  autoSimMatches: false,
  show2DPitch: true,
  showTeamTalks: true,
  difficulty: 1,
};

const STORAGE_KEY = 'gaffer_settings';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function getDefaults() {
  return { ...DEFAULTS };
}

export default function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onClose: () => void;
}) {
  const update = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
    saveSettings(next);
  };

  return (
    <div className="fm-settings-overlay" onClick={onClose}>
      <div className="fm-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fm-settings-header">
          <h2>Game Settings</h2>
          <button className="fm-settings-close" onClick={onClose}>&times;</button>
        </div>
        <div className="fm-settings-body">
          <div className="fm-settings-row">
            <div>
              <div className="fm-settings-label">Match speed</div>
              <div className="fm-settings-desc">How fast the match clock runs</div>
            </div>
            <div className="fm-settings-control">
              <div className="fm-pills">
                {SPEEDS.map((s) => (
                  <button
                    key={s.id}
                    className={`fm-pill${settings.matchSpeed === s.id ? ' active' : ''}`}
                    onClick={() => update({ matchSpeed: s.id })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="fm-settings-row">
            <div>
              <div className="fm-settings-label">Commentary feed</div>
              <div className="fm-settings-desc">Show live text commentary</div>
            </div>
            <button
              className={`fm-toggle${settings.showCommentary ? ' on' : ''}`}
              onClick={() => update({ showCommentary: !settings.showCommentary })}
              aria-label="Toggle commentary"
            />
          </div>

          <div className="fm-settings-row">
            <div>
              <div className="fm-settings-label">Half-time team talks</div>
              <div className="fm-settings-desc">Prompt for team talk at HT</div>
            </div>
            <button
              className={`fm-toggle${settings.showTeamTalks ? ' on' : ''}`}
              onClick={() => update({ showTeamTalks: !settings.showTeamTalks })}
              aria-label="Toggle team talks"
            />
          </div>

          <div className="fm-settings-row">
            <div>
              <div className="fm-settings-label">Auto-sim matches</div>
              <div className="fm-settings-desc">Skip match playthrough, sim instantly</div>
            </div>
            <button
              className={`fm-toggle${settings.autoSimMatches ? ' on' : ''}`}
              onClick={() => update({ autoSimMatches: !settings.autoSimMatches })}
              aria-label="Toggle auto-sim"
            />
          </div>

          <div className="fm-settings-row">
            <div>
              <div className="fm-settings-label">Difficulty</div>
              <div className="fm-settings-desc">AI opponent strength</div>
            </div>
            <div className="fm-settings-control">
              <div className="fm-difficulty-grid">
                <button
                  className={`fm-diff-btn${settings.difficulty === 0.85 ? ' active' : ''}`}
                  onClick={() => update({ difficulty: 0.85 })}
                >
                  Easy
                </button>
                <button
                  className={`fm-diff-btn${settings.difficulty === 1 ? ' active' : ''}`}
                  onClick={() => update({ difficulty: 1 })}
                >
                  Normal
                </button>
                <button
                  className={`fm-diff-btn${settings.difficulty === 1.1 ? ' active-gold' : ''}`}
                  onClick={() => update({ difficulty: 1.1 })}
                >
                  Hard
                </button>
                <button
                  className={`fm-diff-btn${settings.difficulty === 1.2 ? ' active-red' : ''}`}
                  onClick={() => update({ difficulty: 1.2 })}
                >
                  Elite
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
