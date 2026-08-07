'use client';

import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import type {
  AvatarConfig, BadgeLevel, ManagerProfile, PlayingBackground, PriorRole,
} from '@/engine/types';
import ManagerAvatar, { shadeColor } from './ManagerAvatar';
import {
  ACCESSORY_STYLES, ATTIRE_STYLES, EYEBROW_STYLES, EYE_STYLES, FACIAL_HAIR_STYLES,
  HAIR_STYLES, MOUTH_STYLES, PALETTE, SKIN_TONES,
} from './avatarParts';

/** Top-level sections. Appearance is the part-catalog creator; Credentials and
 *  Style capture the manager's backstory, which feeds starting reputation. */
type CustomizerTab = 'appearance' | 'credentials' | 'style';

const PLAYING_BACKGROUNDS: { label: string; value: PlayingBackground; desc: string }[] = [
  { label: 'World-class player', value: 'world-class', desc: 'A decorated international career. The football world already knows your name.' },
  { label: 'Top-flight player', value: 'top-flight', desc: 'Played regularly in a top domestic league.' },
  { label: 'Lower-league player', value: 'lower-league', desc: 'A journeyman career in the lower divisions.' },
  { label: 'Semi-professional', value: 'semi-pro', desc: 'Played part-time while working another job.' },
  { label: 'Never played professionally', value: 'none', desc: 'Coming into management with no playing pedigree at all.' },
];

const PRIOR_ROLES: { label: string; value: PriorRole; desc: string }[] = [
  { label: 'None', value: 'none', desc: 'Straight into the dugout.' },
  { label: 'Coaching', value: 'coaching', desc: 'Time served as an assistant or youth coach.' },
  { label: 'Recruitment & Analysis', value: 'recruitment', desc: 'Built a reputation scouting and analysing data.' },
  { label: 'Media & Punditry', value: 'media', desc: 'A familiar voice on TV and radio.' },
];

const BADGE_LEVELS: { label: string; value: BadgeLevel; desc: string }[] = [
  { label: 'No badges', value: 'none', desc: '' },
  { label: 'Basic License', value: 'basic', desc: '' },
  { label: 'Advanced License', value: 'advanced', desc: '' },
  { label: 'Pro License', value: 'pro', desc: 'The top coaching qualification.' },
];

const COACHING_STYLES = [
  'Attacking', 'Possession-based', 'Pragmatic', 'Man-management focused',
  'Youth-focused', 'Data-driven', 'Disciplinarian', 'Motivator', 'Tactical Innovator',
];

const PERSONALITY_TRAITS = ['Calm', 'Fiery', 'Ambitious', 'Loyal', 'Ruthless', 'Media-savvy'];

const MAX_STYLES = 3;
const MAX_TRAITS = 2;

const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: '#e8b48a',
  skinShadow: shadeColor('#e8b48a'),
  eyeColor: '#4a3728',
  hairColor: '#3b2b20',
  eyebrowColor: '#3b2b20',
  hairStyle: 'short01',
  eyebrows: 'default',
  eyes: 'default',
  mouth: 'default',
  nose: 'default',
  facialHair: '',
  attire: 'suittie',
  mouthColor: '#a85751',
  accessoryColor: '#2b3445',
  suitColor: '#2b3445',
  accessories: [],
};

/** One row of the creator: a part category, the variants it offers, and which
 *  `AvatarConfig` field its shape and (optionally) its colour write to.
 *
 *  `colorKey` is what makes the shared palette work like the reference —
 *  the palette always edits the active category's own colour axis, so there's
 *  one palette instead of a separate swatch row per attribute. */
type Category = {
  id: string;
  label: string;
  /** Ordered variants shown in the numbered grid. */
  variants: { id: string; label: string }[];
  /** Which config field the grid writes. Omitted for colour-only categories. */
  shapeKey?: keyof AvatarConfig;
  /** Which config field the palette writes. Omitted when not colourable. */
  colorKey?: keyof AvatarConfig;
};

const CATEGORIES: Category[] = [
  { id: 'skin', label: 'Skin', variants: SKIN_TONES, colorKey: 'skinTone' },
  { id: 'hair', label: 'Hair', variants: HAIR_STYLES, shapeKey: 'hairStyle', colorKey: 'hairColor' },
  { id: 'brows', label: 'Brows', variants: EYEBROW_STYLES, shapeKey: 'eyebrows', colorKey: 'eyebrowColor' },
  { id: 'eyes', label: 'Eyes', variants: EYE_STYLES, shapeKey: 'eyes', colorKey: 'eyeColor' },
  { id: 'mouth', label: 'Mouth', variants: MOUTH_STYLES, shapeKey: 'mouth', colorKey: 'mouthColor' },
  { id: 'beard', label: 'Beard', variants: FACIAL_HAIR_STYLES, shapeKey: 'facialHair', colorKey: 'hairColor' },
  { id: 'attire', label: 'Attire', variants: ATTIRE_STYLES, shapeKey: 'attire', colorKey: 'suitColor' },
  { id: 'extras', label: 'Extras', variants: ACCESSORY_STYLES, shapeKey: 'accessories', colorKey: 'accessoryColor' },
];

function randomOf<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAvatar(): AvatarConfig {
  const skinTone = randomOf(SKIN_TONES).id;
  const hairColor = randomOf(PALETTE);
  return {
    skinTone,
    skinShadow: shadeColor(skinTone),
    eyeColor: randomOf(PALETTE),
    hairColor,
    eyebrowColor: hairColor,
    hairStyle: randomOf(HAIR_STYLES).id,
    eyebrows: randomOf(EYEBROW_STYLES).id,
    eyes: randomOf(EYE_STYLES).id,
    mouth: randomOf(MOUTH_STYLES).id,
    nose: 'default',
    facialHair: randomOf(FACIAL_HAIR_STYLES).id,
    attire: randomOf(ATTIRE_STYLES).id,
    mouthColor: '#a85751',
    accessoryColor: '#2b3445',
    suitColor: randomOf(PALETTE),
    accessories: Math.random() < 0.35 ? [randomOf(ACCESSORY_STYLES.slice(1)).id] : [],
  };
}

/** Draws the avatar SVG to an offscreen canvas and triggers a PNG download.
 *  Runs entirely client-side — no server round trip for a cosmetic export. */
function downloadAvatarPng(filename: string) {
  const svgEl = document.querySelector('.fm-creator__portrait svg') as SVGSVGElement | null;
  if (!svgEl) return;
  const size = 512;
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function CharacterCustomizerScreen({
  onSave,
  onBack,
  initialProfile,
}: {
  onSave: (profile: ManagerProfile) => void;
  onBack: () => void;
  initialProfile?: ManagerProfile;
}) {
  const [name, setName] = useState(initialProfile?.name || '');
  const [config, setConfig] = useState<AvatarConfig>(
    initialProfile?.avatarConfig ? { ...DEFAULT_AVATAR, ...initialProfile.avatarConfig } : { ...DEFAULT_AVATAR }
  );
  const [playingBackground, setPlayingBackground] = useState<PlayingBackground>(
    initialProfile?.playingBackground || 'none'
  );
  const [priorRole, setPriorRole] = useState<PriorRole>(initialProfile?.priorRole || 'none');
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel>(initialProfile?.badgeLevel || 'none');
  const [coachingStyles, setCoachingStyles] = useState<string[]>(initialProfile?.coachingStyles || []);
  const [personality, setPersonality] = useState<string[]>(initialProfile?.personality || []);
  const [tab, setTab] = useState<CustomizerTab>('appearance');
  const [categoryId, setCategoryId] = useState(CATEGORIES[1].id);
  const [error, setError] = useState<string | null>(null);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId]
  );

  const toggleStyle = (style: string) => {
    setCoachingStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style)
        : prev.length >= MAX_STYLES ? prev : [...prev, style]
    );
  };

  const toggleTrait = (trait: string) => {
    setPersonality((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait)
        : prev.length >= MAX_TRAITS ? prev : [...prev, trait]
    );
  };

  /** The currently-selected variant id for the active category. `accessories`
   *  is an array of at most one, so it reads through its first entry. */
  const activeVariant = (() => {
    if (!category.shapeKey) return config[category.colorKey!] as string;
    if (category.shapeKey === 'accessories') return config.accessories?.[0] ?? '';
    return (config[category.shapeKey] as string) ?? '';
  })();

  const activeColor = category.colorKey ? (config[category.colorKey] as string | undefined) : undefined;

  /** Applies a variant. A colour-only category (Skin) writes its colour axis
   *  instead of a shape, and skin additionally recomputes the paired shadow. */
  const pickVariant = (id: string) => {
    if (!category.shapeKey) {
      setConfig({ ...config, [category.colorKey!]: id, ...(category.id === 'skin' ? { skinShadow: shadeColor(id) } : {}) });
      return;
    }
    if (category.shapeKey === 'accessories') {
      setConfig({ ...config, accessories: id ? [id] : [] });
      return;
    }
    setConfig({ ...config, [category.shapeKey]: id });
  };

  const pickColor = (hex: string) => {
    if (!category.colorKey) return;
    setConfig({
      ...config,
      [category.colorKey]: hex,
      // Skin tone owns a paired shadow; hair colour drives brows unless the
      // player has already set brows to something deliberately different.
      ...(category.colorKey === 'skinTone' ? { skinShadow: shadeColor(hex) } : {}),
      ...(category.colorKey === 'hairColor' && config.eyebrowColor === config.hairColor
        ? { eyebrowColor: hex }
        : {}),
    });
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      setError('Give your manager a name first.');
      setTab('appearance');
      return;
    }
    setError(null);
    onSave({
      id: initialProfile?.id || `manager_${Date.now()}`,
      name: name.trim(),
      avatarConfig: config,
      createdAt: initialProfile?.createdAt || new Date(),
      updatedAt: new Date(),
      playingBackground,
      priorRole,
      badgeLevel,
      coachingStyles,
      personality,
    });
  };

  return (
    <div className="fm-screen fm-creator">
      <div className="fm-creator__head">
        <p className="fm-label" style={{ margin: 0 }}>CREATE YOUR MANAGER</p>
        <div className="fm-creator__head-actions">
          <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setConfig(randomAvatar())}>
            <Icon name="dice" size={14} /> Randomize
          </button>
          <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => setConfig({ ...DEFAULT_AVATAR })}>
            Reset
          </button>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => downloadAvatarPng(`${(name || 'manager').replace(/\s+/g, '_')}.png`)}
          >
            <Icon name="download" size={14} /> PNG
          </button>
        </div>
      </div>

      {/* Upper deck: framed portrait + name field on the left, shared colour
          palette on the right — the palette always edits whichever category
          is active below, so there's one palette instead of one per attribute.
          The portrait stays visible on every tab, so credential choices are
          still made with the manager's face in view. */}
      <div className="fm-creator__deck">
        <div className="fm-creator__stage">
          <div className="fm-creator__frame">
            <div className="fm-creator__portrait">
              <ManagerAvatar config={config} size={300} backdrop={false} title={name || 'Manager portrait'} />
            </div>
          </div>
          <div className="fm-creator__namefield">
            <label className="fm-creator__label" htmlFor="manager-name">Manager Name</label>
            <input
              id="manager-name"
              className="fm-search"
              placeholder="Enter a name"
              value={name}
              maxLength={24}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
            />
            {error && <p className="fm-creator__error">{error}</p>}
          </div>
        </div>

        {tab === 'appearance' && (
          <div className="fm-creator__palette-panel">
            <p className="fm-creator__label">
              {category.colorKey ? `${category.label} Colour` : 'Colour'}
            </p>
            {category.colorKey ? (
              <div className="fm-creator__palette" role="radiogroup" aria-label={`${category.label} colour`}>
                {PALETTE.map((hex) => {
                  const selected = (activeColor ?? '').toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={hex}
                      title={hex}
                      className={`fm-creator__swatch${selected ? ' selected' : ''}`}
                      style={{ background: hex }}
                      onClick={() => pickColor(hex)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="fm-hint">This part has no colour of its own.</p>
            )}
          </div>
        )}
      </div>

      <div className="fm-creator__tabs" role="tablist" aria-label="Manager creation sections">
        {([
          { id: 'appearance', label: 'Appearance' },
          { id: 'credentials', label: 'Credentials' },
          { id: 'style', label: 'Style' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`fm-subtab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="fm-subtab__label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Appearance: category strip + numbered variant grid, the reference's
          core interaction — pick a part category, then pick a numbered variant. */}
      {tab === 'appearance' && (
        <div className="fm-creator__parts">
          <div className="fm-creator__cats" role="tablist" aria-label="Part categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === categoryId}
                className={`fm-creator__cat${c.id === categoryId ? ' active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="fm-creator__variants" role="radiogroup" aria-label={`${category.label} variants`}>
            {category.variants.map((variant, i) => {
              const selected = activeVariant === variant.id;
              // Each tile previews the real result: the live config with just
              // this one variant swapped in, so tiles stay accurate as the rest
              // of the character changes.
              const preview: AvatarConfig = category.shapeKey
                ? category.shapeKey === 'accessories'
                  ? { ...config, accessories: variant.id ? [variant.id] : [] }
                  : { ...config, [category.shapeKey]: variant.id }
                : { ...config, [category.colorKey!]: variant.id, ...(category.id === 'skin' ? { skinShadow: shadeColor(variant.id) } : {}) };
              return (
                <button
                  key={variant.id || `none-${i}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`fm-creator__tile${selected ? ' selected' : ''}`}
                  onClick={() => pickVariant(variant.id)}
                  title={variant.label}
                >
                  <span className="fm-creator__tile-num">{i + 1}</span>
                  <ManagerAvatar config={preview} size={62} title={variant.label} />
                  <span className="fm-creator__tile-label">{variant.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'credentials' && (
        <div className="fm-creator__panel" role="tabpanel" aria-label="Credentials">
          <div className="form-group">
            <label className="fm-label-small">Playing Career</label>
            <p className="fm-category-desc">Your pedigree as a player — the biggest factor in your starting reputation.</p>
            <div className="stack-options">
              {PLAYING_BACKGROUNDS.map((opt) => (
                <button
                  key={opt.value}
                  className={`stack-option ${playingBackground === opt.value ? 'active' : ''}`}
                  onClick={() => setPlayingBackground(opt.value)}
                >
                  <span className="stack-option__label">{opt.label}</span>
                  <span className="stack-option__desc">{opt.desc}</span>
                  {playingBackground === opt.value && (
                    <span className="stack-option__check"><Icon name="check" size={12} /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="fm-label-small">Prior Background</label>
            <p className="fm-category-desc">What you did before taking a dugout, if anything.</p>
            <div className="stack-options">
              {PRIOR_ROLES.map((opt) => (
                <button
                  key={opt.value}
                  className={`stack-option ${priorRole === opt.value ? 'active' : ''}`}
                  onClick={() => setPriorRole(opt.value)}
                >
                  <span className="stack-option__label">{opt.label}</span>
                  <span className="stack-option__desc">{opt.desc}</span>
                  {priorRole === opt.value && (
                    <span className="stack-option__check"><Icon name="check" size={12} /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="fm-label-small">Coaching Badges</label>
            <p className="fm-category-desc">Formal qualifications earned on the coaching pathway.</p>
            <div className="option-grid">
              {BADGE_LEVELS.map((opt) => (
                <button
                  key={opt.value}
                  className={`fm-btn fm-btn--ghost fm-btn--small ${badgeLevel === opt.value ? 'active' : ''}`}
                  onClick={() => setBadgeLevel(opt.value)}
                  title={opt.desc}
                >
                  {badgeLevel === opt.value && <Icon name="check" size={11} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'style' && (
        <div className="fm-creator__panel" role="tabpanel" aria-label="Style and personality">
          <div className="form-group">
            <label className="fm-label-small">Coaching Style ({coachingStyles.length}/{MAX_STYLES})</label>
            <p className="fm-category-desc">Pick up to {MAX_STYLES} tags that describe your approach on the training ground and touchline.</p>
            <div className="option-grid">
              {COACHING_STYLES.map((style) => (
                <button
                  key={style}
                  className={`fm-btn fm-btn--ghost fm-btn--small ${coachingStyles.includes(style) ? 'active' : ''}`}
                  onClick={() => toggleStyle(style)}
                  disabled={!coachingStyles.includes(style) && coachingStyles.length >= MAX_STYLES}
                >
                  {coachingStyles.includes(style) && <Icon name="check" size={11} />}
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="fm-label-small">Personality ({personality.length}/{MAX_TRAITS})</label>
            <p className="fm-category-desc">Pick up to {MAX_TRAITS} traits that define your character.</p>
            <div className="option-grid">
              {PERSONALITY_TRAITS.map((trait) => (
                <button
                  key={trait}
                  className={`fm-btn fm-btn--ghost fm-btn--small ${personality.includes(trait) ? 'active' : ''}`}
                  onClick={() => toggleTrait(trait)}
                  disabled={!personality.includes(trait) && personality.length >= MAX_TRAITS}
                >
                  {personality.includes(trait) && <Icon name="check" size={11} />}
                  {trait}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group summary-box">
            <label className="fm-label-small">Summary</label>
            <p className="fm-category-desc" style={{ margin: 0 }}>
              <strong>{name || 'Your manager'}</strong> — {PLAYING_BACKGROUNDS.find((o) => o.value === playingBackground)?.label.toLowerCase()}
              {priorRole !== 'none' && <>, background in {PRIOR_ROLES.find((o) => o.value === priorRole)?.label.toLowerCase()}</>}
              {badgeLevel !== 'none' && <>, holds a {BADGE_LEVELS.find((o) => o.value === badgeLevel)?.label}</>}.
              {coachingStyles.length > 0 && <> Style: {coachingStyles.join(', ')}.</>}
              {personality.length > 0 && <> Known for being {personality.join(' and ').toLowerCase()}.</>}
            </p>
          </div>
        </div>
      )}

      <div className="fm-creator__foot">
        <button className="fm-btn fm-btn--ghost" onClick={onBack}>Back</button>
        <button className="fm-btn fm-btn--primary" onClick={handleConfirm}>
          {initialProfile ? 'Save Manager' : 'Start Career'}
        </button>
      </div>

      <style jsx>{`
        .fm-creator {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .fm-creator__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .fm-creator__head-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .fm-creator__deck {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 1rem;
          align-items: start;
        }

        .fm-creator__stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.875rem;
        }

        /* Framed portrait — a recessed inner panel inside a bright border, the
           reference's "picture in a frame" read. */
        .fm-creator__frame {
          padding: 10px;
          background: var(--panel);
          border: 2px solid var(--border-bright);
          border-radius: var(--r-md);
          box-shadow: var(--shadow-sm);
        }

        .fm-creator__portrait {
          width: 300px;
          height: 300px;
          max-width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: calc(var(--r-md) - 4px);
          background: radial-gradient(circle at 50% 38%, var(--panel-3), var(--panel-2) 70%);
        }

        .fm-creator__namefield { width: min(320px, 100%); }

        .fm-creator__label {
          display: block;
          margin: 0 0 0.375rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .fm-creator__error {
          margin: 0.375rem 0 0;
          font-size: 0.8rem;
          color: var(--red);
        }

        .fm-creator__palette-panel {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 1rem;
        }

        .fm-creator__palette {
          display: grid;
          grid-template-columns: repeat(4, 40px);
          gap: 7px;
        }

        .fm-creator__swatch {
          width: 40px;
          height: 40px;
          border-radius: 7px;
          border: 2px solid var(--border-soft);
          cursor: pointer;
          padding: 0;
          transition: transform 0.12s, border-color 0.15s, box-shadow 0.2s;
        }

        .fm-creator__swatch:hover { transform: scale(1.08); border-color: var(--border-bright); }

        .fm-creator__swatch.selected {
          border-color: var(--gold);
          box-shadow: 0 0 0 2px var(--gold-dim), var(--shadow-glow-gold);
        }

        .fm-creator__tabs { display: flex; gap: 6px; flex-wrap: wrap; }

        .fm-creator__parts,
        .fm-creator__panel {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 1rem;
        }

        .fm-creator__cats {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 0.875rem;
          margin-bottom: 0.875rem;
          border-bottom: 1px solid var(--border);
        }

        .fm-creator__cats::-webkit-scrollbar { display: none; }

        .fm-creator__cat {
          flex: 0 0 auto;
          border: 1px solid var(--border-soft);
          background: var(--panel);
          color: var(--muted);
          font-family: inherit;
          font-weight: 700;
          font-size: 12.5px;
          padding: 8px 14px;
          border-radius: var(--r-full);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .fm-creator__cat:hover { color: var(--text); border-color: var(--border-bright); }

        .fm-creator__cat.active {
          background: var(--gold);
          border-color: var(--gold);
          color: #1a0f00;
        }

        .fm-creator__variants {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: 8px;
        }

        .fm-creator__tile {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: var(--panel);
          border: 1.5px solid var(--border-soft);
          border-radius: var(--r-lg);
          padding: 10px 6px 8px;
          cursor: pointer;
          color: var(--text);
          transition: border-color 0.15s, transform 0.12s, box-shadow 0.2s;
        }

        .fm-creator__tile:hover {
          border-color: var(--border-bright);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .fm-creator__tile.selected {
          border-color: var(--gold);
          background: var(--gold-dim);
          box-shadow: var(--shadow-glow-gold);
        }

        .fm-creator__tile-num {
          position: absolute;
          top: 5px;
          left: 7px;
          font-size: 10px;
          font-weight: 900;
          color: var(--muted-dim);
          font-variant-numeric: tabular-nums;
        }

        .fm-creator__tile.selected .fm-creator__tile-num { color: var(--gold); }

        .fm-creator__tile-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-2);
          line-height: 1.2;
          text-align: center;
        }

        /* ── Credentials / Style panels ── */
        .form-group { margin-bottom: 1.5rem; }
        .form-group:last-child { margin-bottom: 0; }

        .fm-label-small {
          display: block;
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fm-category-desc {
          margin: 0 0 0.75rem 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .stack-options { display: flex; flex-direction: column; gap: 0.5rem; }

        .stack-option {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
          text-align: left;
          padding: 0.65rem 2.25rem 0.65rem 0.9rem;
          border-radius: var(--r-sm, 6px);
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .stack-option__check {
          position: absolute;
          top: 50%;
          right: 0.75rem;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--lime);
          color: #04140d;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stack-option:hover { border-color: color-mix(in srgb, var(--lime) 50%, transparent); }

        .stack-option.active {
          border-color: var(--lime);
          background: color-mix(in srgb, var(--lime) 12%, var(--panel));
        }

        .stack-option__label { font-weight: 600; font-size: 0.9rem; }
        .stack-option__desc { font-size: 0.78rem; color: var(--muted); }

        .summary-box {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--r-sm, 6px);
          padding: 1rem;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .fm-btn.fm-btn--small {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .fm-btn.fm-btn--small:disabled { opacity: 0.4; cursor: not-allowed; }

        .fm-btn.fm-btn--small.active {
          background: var(--lime);
          color: var(--brand-text);
        }

        .fm-creator__foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        @media (max-width: 860px) {
          .fm-creator__deck { grid-template-columns: minmax(0, 1fr); }
          .fm-creator__palette-panel { order: -1; }
          .fm-creator__palette { grid-template-columns: repeat(10, 1fr); }
          .fm-creator__swatch { width: 100%; height: auto; aspect-ratio: 1 / 1; }
          .fm-creator__portrait { width: 240px; height: 240px; }
        }

        @media (max-width: 520px) {
          .fm-creator__palette { grid-template-columns: repeat(5, 1fr); }
          .fm-creator__portrait { width: 200px; height: 200px; }
          .fm-creator__foot { flex-direction: column-reverse; }
          .fm-creator__foot :global(.fm-btn) { width: 100%; }
        }
      `}</style>
    </div>
  );
}
