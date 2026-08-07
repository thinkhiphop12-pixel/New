'use client';

import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import type { AvatarConfig, ManagerProfile } from '@/engine/types';
import ManagerAvatar, { shadeColor } from './ManagerAvatar';
import {
  ACCESSORY_STYLES, ATTIRE_STYLES, EYEBROW_STYLES, EYE_STYLES, FACIAL_HAIR_STYLES,
  HAIR_STYLES, MOUTH_STYLES, PALETTE, SKIN_TONES,
} from './avatarParts';

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
  const [categoryId, setCategoryId] = useState(CATEGORIES[1].id);
  const [error, setError] = useState<string | null>(null);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId]
  );

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
      return;
    }
    setError(null);
    onSave({
      id: initialProfile?.id || `manager_${Date.now()}`,
      name: name.trim(),
      avatarConfig: config,
      createdAt: initialProfile?.createdAt || new Date(),
      updatedAt: new Date(),
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
          is active below, so there's one palette instead of one per attribute. */}
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
      </div>

      {/* Lower deck: category strip + numbered variant grid, the reference's
          core interaction — pick a part category, then pick a numbered variant. */}
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

      <div className="fm-creator__foot">
        <button className="fm-btn fm-btn--ghost" onClick={onBack}>Back</button>
        <button className="fm-btn fm-btn--primary" onClick={handleConfirm}>Confirm</button>
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

        .fm-creator__parts {
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
