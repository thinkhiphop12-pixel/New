'use client';

import type { CSSProperties } from 'react';
import type { GameSettings, InboxCategory, MatchSpeed } from '@/engine/types';
import { defaultContinueStops, stopEnabled } from '@/engine/dailyTick';
import { Icon, type IconName } from './Icon';
import { CATEGORY_ICON, CATEGORY_TINT } from './inboxChrome';

/** Continue Rules rows — which inbox categories halt "Sim Next Day" for a
 *  look. Matchday isn't listed: it's a hard stop (see engine/dailyTick.ts),
 *  not a preference. */
const STOP_ROWS: { id: InboxCategory; label: string; desc: string }[] = [
  { id: 'injury', label: 'Injuries', desc: 'A player picks up a knock' },
  { id: 'contract', label: 'Contracts', desc: 'A deal expires or needs renewing' },
  { id: 'transfer', label: 'Transfers', desc: 'Bids, signings, scouting leads, loan issues' },
  { id: 'board', label: 'Board', desc: 'Confidence warnings and objective updates' },
  { id: 'club', label: 'Squad mood', desc: 'Unhappiness, captaincy, development milestones' },
  { id: 'youth', label: 'Youth academy', desc: 'Academy intake and youth news' },
  { id: 'match', label: 'Match news', desc: 'Results and milestones elsewhere in the league' },
  { id: 'press', label: 'Press', desc: 'Media stories about you and your club' },
];

/** Leading tile for the Assistant Manager rows. The Continue Rules rows take
 *  theirs from the shared inbox chrome instead — a rule about contracts wears
 *  the same gold document tile the contract message itself does. */
const DELEGATION_TILE: Record<'complaints' | 'contracts' | 'schedule', { icon: IconName; tint: string }> = {
  complaints: { icon: 'person', tint: 'var(--green)' },
  contracts: { icon: CATEGORY_ICON.contract, tint: CATEGORY_TINT.contract },
  schedule: { icon: 'calendar', tint: 'var(--blue)' },
};

/** Assistant Manager delegation rows — which of these the assistant handles
 *  automatically (the same default a human would reach for) instead of
 *  stopping the sim for a look. */
const DELEGATION_ROWS: { id: 'complaints' | 'contracts' | 'schedule'; label: string; desc: string }[] = [
  { id: 'complaints', label: 'Player complaints', desc: 'Auto-reassure an unhappy player (never the riskier "promise" option)' },
  { id: 'contracts', label: 'Contract renewals', desc: 'Auto-offer a new deal when a player enters his final year, if affordable' },
  { id: 'schedule', label: 'Weekly schedule', desc: "Auto-apply the assistant's own training/recovery suggestion each Monday" },
];

const SPEEDS: { id: MatchSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
  { id: 'instant', label: 'Instant' },
];

/** The four difficulty steps. `ramp` is the green→red severity colour each
 *  step wears at all times — it is what the step *is*, not whether it is
 *  chosen. Selection is drawn by `.fm-segmented__opt.active`, the same
 *  state Match speed and Volume use. */
const DIFFICULTIES: { value: number; label: string; ramp: string }[] = [
  { value: 0.85, label: 'Easy', ramp: 'var(--green)' },
  { value: 1, label: 'Normal', ramp: 'var(--lime)' },
  { value: 1.1, label: 'Hard', ramp: 'var(--gold)' },
  { value: 1.2, label: 'Elite', ramp: 'var(--red)' },
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
  continueStops: defaultContinueStops(),
  volume: 0.7,
  muted: false,
  haptics: true,
};

/** Volume steps for the segmented control. */
const VOLUMES: { value: number; label: string }[] = [
  { value: 0.3, label: 'Low' },
  { value: 0.7, label: 'Med' },
  { value: 1, label: 'High' },
];

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
            <p className="fm-setgroup__title">Sound &amp; feel</p>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="block" tint="var(--red)" />
                <div>
                  <div className="fm-settings-label">Mute</div>
                  <div className="fm-settings-desc">Silence all sound effects</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.muted ? ' on' : ''}`}
                onClick={() => update({ muted: !settings.muted })}
                aria-pressed={settings.muted ?? false}
                aria-label="Toggle mute"
              />
            </div>

            <div className="fm-settings-row fm-settings-row--stacked">
              <div className="fm-settings-row__head">
                <SettingTile icon="mic" tint="var(--blue)" />
                <div>
                  <div className="fm-settings-label">Volume</div>
                  <div className="fm-settings-desc">Whistles, crowd, and UI sounds</div>
                </div>
              </div>
              <div className="fm-settings-control">
                <div className="fm-segmented">
                  {VOLUMES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      className={`fm-segmented__opt${(settings.volume ?? 0.7) === v.value ? ' active' : ''}`}
                      aria-pressed={(settings.volume ?? 0.7) === v.value}
                      onClick={() => update({ volume: v.value })}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="fm-settings-row">
              <div className="fm-settings-row__head">
                <SettingTile icon="target" tint="var(--gold)" />
                <div>
                  <div className="fm-settings-label">Haptics</div>
                  <div className="fm-settings-desc">Vibration on goals and whistles (mobile)</div>
                </div>
              </div>
              <button
                className={`fm-toggle${settings.haptics ?? true ? ' on' : ''}`}
                onClick={() => update({ haptics: !(settings.haptics ?? true) })}
                aria-pressed={settings.haptics ?? true}
                aria-label="Toggle haptics"
              />
            </div>
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Continue Rules</p>
            <p className="fm-setgroup__lede">
              What halts "Sim Next Day" for a look, rather than logging to the day's summary and rolling
              on. Matchday always stops.
            </p>
            {STOP_ROWS.map((row) => {
              const on = stopEnabled(settings, row.id);
              return (
                <div key={row.id} className="fm-settings-row">
                  <div className="fm-settings-row__head">
                    <SettingTile icon={CATEGORY_ICON[row.id]} tint={CATEGORY_TINT[row.id]} />
                    <div>
                      <div className="fm-settings-label">{row.label}</div>
                      <div className="fm-settings-desc">{row.desc}</div>
                    </div>
                  </div>
                  <button
                    className={`fm-toggle${on ? ' on' : ''}`}
                    onClick={() => update({ continueStops: { ...settings.continueStops, [row.id]: !on } })}
                    aria-pressed={on}
                    aria-label={`Toggle stop on ${row.label}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Assistant Manager</p>
            <p className="fm-setgroup__lede">
              Hand these off and the assistant acts for you instead of stopping the sim to ask. Off by
              default.
            </p>
            {DELEGATION_ROWS.map((row) => {
              const on = settings.assistantDelegation?.[row.id] ?? false;
              const tile = DELEGATION_TILE[row.id];
              return (
                <div key={row.id} className="fm-settings-row">
                  <div className="fm-settings-row__head">
                    <SettingTile icon={tile.icon} tint={tile.tint} />
                    <div>
                      <div className="fm-settings-label">{row.label}</div>
                      <div className="fm-settings-desc">{row.desc}</div>
                    </div>
                  </div>
                  <button
                    className={`fm-toggle${on ? ' on' : ''}`}
                    onClick={() => update({ assistantDelegation: { ...settings.assistantDelegation, [row.id]: !on } })}
                    aria-pressed={on}
                    aria-label={`Toggle assistant handling ${row.label}`}
                  />
                </div>
              );
            })}
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
                <div className="fm-segmented">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      className={`fm-segmented__opt fm-segmented__opt--ramp${settings.difficulty === d.value ? ' active' : ''}`}
                      aria-pressed={settings.difficulty === d.value}
                      onClick={() => update({ difficulty: d.value })}
                    >
                      <span className="fm-segmented__ramp-dot" style={{ '--ramp-color': d.ramp } as CSSProperties} />
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
