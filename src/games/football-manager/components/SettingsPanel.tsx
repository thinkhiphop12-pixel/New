'use client';

import type { CSSProperties } from 'react';
import type { GameSettings, MatchSpeed } from '@/engine/types';
import { Icon, type IconName } from './Icon';

const SPEEDS: { id: MatchSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
  { id: 'instant', label: 'Instant' },
];

/** The four difficulty steps, each with the modifier class that colours its
 *  active state — the same values/classes the old inline buttons used. */
const DIFFICULTIES: { value: number; label: string; activeClass: string }[] = [
  { value: 0.85, label: 'Easy', activeClass: 'active' },
  { value: 1, label: 'Normal', activeClass: 'active' },
  { value: 1.1, label: 'Hard', activeClass: 'active-gold' },
  { value: 1.2, label: 'Elite', activeClass: 'active-red' },
];

/** Leading icon-tile for a settings row (Phase 0 `.fm-icon-tile`). */
function SettingTile({ icon, tint }: { icon: IconName; tint: string }) {
  return (
    <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': tint } as CSSProperties}>
      <Icon name={icon} size={15} />
    </span>
  );
}

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
          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Match day</p>

            <div className="fm-settings-row fm-settings-row--stacked">
              <div className="fm-settings-row__head">
                <SettingTile icon="play" tint="var(--green)" />
                <div>
                  <div className="fm-settings-label">Match speed</div>
                  <div className="fm-settings-desc">How fast the match clock runs</div>
                </div>
              </div>
              <div className="fm-settings-control">
                <div className="fm-segmented">
                  {SPEEDS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`fm-segmented__opt${settings.matchSpeed === s.id ? ' active' : ''}`}
                      aria-pressed={settings.matchSpeed === s.id}
                      onClick={() => update({ matchSpeed: s.id })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="dice" tint="var(--blue)" />
                <div>
                  <div className="fm-settings-label">Auto-sim matches</div>
                  <div className="fm-settings-desc">Skip match playthrough, sim instantly</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.autoSimMatches ? ' on' : ''}`}
                onClick={() => update({ autoSimMatches: !settings.autoSimMatches })}
                aria-pressed={settings.autoSimMatches}
                aria-label="Toggle auto-sim"
              />
            </div>
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Presentation</p>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="movie" tint="var(--lime)" />
                <div>
                  <div className="fm-settings-label">Commentary feed</div>
                  <div className="fm-settings-desc">Show live text commentary</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.showCommentary ? ' on' : ''}`}
                onClick={() => update({ showCommentary: !settings.showCommentary })}
                aria-pressed={settings.showCommentary}
                aria-label="Toggle commentary"
              />
            </div>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="tactics" tint="var(--green-600)" />
                <div>
                  <div className="fm-settings-label">2D pitch</div>
                  <div className="fm-settings-desc">Animate the match, or follow commentary only</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.show2DPitch ? ' on' : ''}`}
                onClick={() => update({ show2DPitch: !settings.show2DPitch })}
                aria-pressed={settings.show2DPitch}
                aria-label="Toggle 2D pitch"
              />
            </div>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="mic" tint="var(--gold)" />
                <div>
                  <div className="fm-settings-label">Half-time team talks</div>
                  <div className="fm-settings-desc">Prompt for team talk at HT</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.showTeamTalks ? ' on' : ''}`}
                onClick={() => update({ showTeamTalks: !settings.showTeamTalks })}
                aria-pressed={settings.showTeamTalks}
                aria-label="Toggle team talks"
              />
            </div>
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Challenge</p>

            <div className="fm-settings-row fm-settings-row--stacked">
              <div className="fm-settings-row__head">
                <SettingTile icon="flame" tint="var(--red)" />
                <div>
                  <div className="fm-settings-label">Difficulty</div>
                  <div className="fm-settings-desc">AI opponent strength</div>
                </div>
              </div>
              <div className="fm-settings-control">
                <div className="fm-difficulty-grid">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      className={`fm-diff-btn${settings.difficulty === d.value ? ` ${d.activeClass}` : ''}`}
                      aria-pressed={settings.difficulty === d.value}
                      onClick={() => update({ difficulty: d.value })}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
