'use client';

import { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { AvatarConfig, ManagerProfile } from '@/engine/types';
import ManagerAvatar, { shadeColor } from './ManagerAvatar';

type CustomizerTab = 'presets' | 'body' | 'head' | 'attire';

const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: 'c1ad60',
  skinShadow: shadeColor('#c1ad60'),
  eyeColor: '1f2937',
  hairColor: '4a3728',
  eyebrowColor: shadeColor('#4a3728', -0.1),
  hairStyle: 'long01',
  facialHair: '',
  mouth: 'default',
  eyes: 'default',
  nose: 'default',
  accessories: [],
  suitColor: undefined,
};

const SKIN_TONES = [
  { label: 'Light', value: 'fdbcb4' },
  { label: 'Fair', value: 'f7bde4' },
  { label: 'Medium', value: 'c1ad60' },
  { label: 'Olive', value: 'b8860b' },
  { label: 'Tan', value: 'd4a574' },
  { label: 'Deep', value: '70563f' },
];

const EYE_COLORS = [
  { label: 'Brown', value: '4a3728' },
  { label: 'Blue', value: '1e40af' },
  { label: 'Green', value: '15803d' },
  { label: 'Hazel', value: 'a16207' },
  { label: 'Gray', value: '4b5563' },
];

const HAIR_COLORS = [
  { label: 'Black', value: '1f2937' },
  { label: 'Brown', value: '5e4e42' },
  { label: 'Blonde', value: 'f4d03f' },
  { label: 'Red', value: 'd84315' },
  { label: 'Auburn', value: '8b4513' },
  { label: 'Gray', value: 'a8a8a8' },
];

const EYEBROW_COLORS = HAIR_COLORS;

const HAIR_STYLES = [
  { label: 'Long', value: 'long01' },
  { label: 'Medium', value: 'straight01' },
  { label: 'Short', value: 'short01' },
  { label: 'Curly', value: 'curly01' },
  { label: 'Buzz', value: 'buzz' },
  { label: 'Bald', value: '' },
];

const FACIAL_HAIR = [
  { label: 'Clean', value: '' },
  { label: 'Beard', value: 'beardMajestic' },
  { label: 'Goatee', value: 'beardLight' },
  { label: 'Moustache', value: 'moustache' },
];

const ACCESSORIES = [
  { label: 'None', value: '' },
  { label: 'Glasses', value: 'glasses' },
];

/** Suit colour palette for the Attire tab. `undefined` (the implicit first
 *  choice) keeps the default `var(--panel-2)` fill so old saves without this
 *  field render exactly as before. */
const SUIT_COLORS: { label: string; value: string | undefined }[] = [
  { label: 'Default', value: undefined },
  { label: 'Navy', value: '1f2937' },
  { label: 'Charcoal', value: '374151' },
  { label: 'Maroon', value: '7f1d1d' },
  { label: 'Forest', value: '14532d' },
  { label: 'Black', value: '111827' },
];

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAvatar(): AvatarConfig {
  const skinTone = randomOf(SKIN_TONES).value;
  const hairColor = randomOf(HAIR_COLORS).value;
  return {
    skinTone,
    skinShadow: shadeColor(`#${skinTone}`),
    eyeColor: randomOf(EYE_COLORS).value,
    hairColor,
    eyebrowColor: randomOf(EYEBROW_COLORS).value,
    hairStyle: randomOf(HAIR_STYLES).value,
    facialHair: randomOf(FACIAL_HAIR).value,
    mouth: 'default',
    eyes: 'default',
    nose: 'default',
    accessories: Math.random() < 0.3 ? ['glasses'] : [],
    suitColor: randomOf(SUIT_COLORS).value,
  };
}

/** Curated full-look combinations for the Presets tab — just points in the
 *  existing option space above, no new asset data. */
const PRESETS: { id: string; label: string; config: AvatarConfig }[] = [
  {
    id: 'classic',
    label: 'Classic',
    config: {
      skinTone: 'c1ad60', skinShadow: shadeColor('#c1ad60'), eyeColor: '4a3728',
      hairColor: '1f2937', eyebrowColor: shadeColor('#1f2937', -0.1), hairStyle: 'short01',
      facialHair: '', mouth: 'default', eyes: 'default', nose: 'default', accessories: [],
      suitColor: '1f2937',
    },
  },
  {
    id: 'silver-fox',
    label: 'Silver Fox',
    config: {
      skinTone: 'd4a574', skinShadow: shadeColor('#d4a574'), eyeColor: '4b5563',
      hairColor: 'a8a8a8', eyebrowColor: 'a8a8a8', hairStyle: 'straight01',
      facialHair: 'beardLight', mouth: 'default', eyes: 'default', nose: 'default',
      accessories: [], suitColor: '374151',
    },
  },
  {
    id: 'young-gun',
    label: 'Young Gun',
    config: {
      skinTone: '70563f', skinShadow: shadeColor('#70563f'), eyeColor: '1f2937',
      hairColor: '1f2937', eyebrowColor: '1f2937', hairStyle: 'buzz', facialHair: '',
      mouth: 'default', eyes: 'default', nose: 'default', accessories: [], suitColor: '111827',
    },
  },
  {
    id: 'tactician',
    label: 'Tactician',
    config: {
      skinTone: 'fdbcb4', skinShadow: shadeColor('#fdbcb4'), eyeColor: '1e40af',
      hairColor: '5e4e42', eyebrowColor: '5e4e42', hairStyle: 'curly01',
      facialHair: 'moustache', mouth: 'default', eyes: 'default', nose: 'default',
      accessories: ['glasses'], suitColor: '7f1d1d',
    },
  },
  {
    id: 'continental',
    label: 'Continental',
    config: {
      skinTone: 'f7bde4', skinShadow: shadeColor('#f7bde4'), eyeColor: '15803d',
      hairColor: '8b4513', eyebrowColor: '8b4513', hairStyle: 'long01', facialHair: 'beardMajestic',
      mouth: 'default', eyes: 'default', nose: 'default', accessories: [], suitColor: '14532d',
    },
  },
  {
    id: 'the-boardroom',
    label: 'The Boardroom',
    config: {
      skinTone: 'b8860b', skinShadow: shadeColor('#b8860b'), eyeColor: 'a16207',
      hairColor: 'f4d03f', eyebrowColor: 'f4d03f', hairStyle: 'straight01', facialHair: '',
      mouth: 'default', eyes: 'default', nose: 'default', accessories: ['glasses'],
      suitColor: undefined,
    },
  },
  {
    id: 'old-guard',
    label: 'Old Guard',
    config: {
      skinTone: 'c1ad60', skinShadow: shadeColor('#c1ad60'), eyeColor: '4b5563',
      hairColor: 'a8a8a8', eyebrowColor: 'a8a8a8', hairStyle: 'buzz', facialHair: 'beardLight',
      mouth: 'default', eyes: 'default', nose: 'default', accessories: [], suitColor: '374151',
    },
  },
  {
    id: 'sideline',
    label: 'Sideline',
    config: {
      skinTone: 'd4a574', skinShadow: shadeColor('#d4a574'), eyeColor: '1f2937',
      hairColor: 'd84315', eyebrowColor: 'd84315', hairStyle: 'curly01', facialHair: '',
      mouth: 'default', eyes: 'default', nose: 'default', accessories: [], suitColor: '111827',
    },
  },
];

function presetMatches(config: AvatarConfig, preset: AvatarConfig): boolean {
  return JSON.stringify(config) === JSON.stringify(preset);
}

/** Draws the avatar SVG to an offscreen canvas and triggers a PNG download.
 *  Runs entirely client-side — no server round trip for a cosmetic export. */
function downloadAvatarPng(config: AvatarConfig, filename: string) {
  const svgEl = document.querySelector('.customizer-avatar-svg svg') as SVGSVGElement | null;
  if (!svgEl) return;
  const size = 512;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
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
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    initialProfile?.avatarConfig || { ...DEFAULT_AVATAR }
  );
  const [tab, setTab] = useState<CustomizerTab>('presets');
  const avatarRef = useRef<HTMLDivElement | null>(null);

  const setSkin = (value: string) => {
    setAvatarConfig({ ...avatarConfig, skinTone: value, skinShadow: shadeColor(`#${value}`) });
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a manager name');
      return;
    }

    const profile: ManagerProfile = {
      id: initialProfile?.id || `manager_${Date.now()}`,
      name: name.trim(),
      avatarConfig,
      createdAt: initialProfile?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSave(profile);
  };

  const handleReset = () => {
    setAvatarConfig({ ...DEFAULT_AVATAR });
  };

  const handleRandomize = () => {
    setAvatarConfig(randomAvatar());
  };

  const handleDownload = () => {
    downloadAvatarPng(avatarConfig, `${(name || 'manager').replace(/\s+/g, '_')}_avatar.png`);
  };

  return (
    <div className="fm-screen fm-character-customizer">
      <p className="fm-label">MANAGER CREATION</p>

      <div className="name-row">
        <label className="fm-label-small" htmlFor="manager-name">Manager Name</label>
        <input
          id="manager-name"
          type="text"
          className="fm-search"
          placeholder="Enter your manager name"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="character-container">
        <div className="customization-section">
          <div className="tabs-row">
            <div className="fm-subnav__tabs" role="tablist" aria-label="Manager customization sections">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'presets'}
                aria-controls="customizer-panel-presets"
                className={`fm-subtab${tab === 'presets' ? ' active' : ''}`}
                onClick={() => setTab('presets')}
              >
                <span className="fm-subtab__label">Presets</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'body'}
                aria-controls="customizer-panel-body"
                className={`fm-subtab${tab === 'body' ? ' active' : ''}`}
                onClick={() => setTab('body')}
              >
                <span className="fm-subtab__label">Body</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'head'}
                aria-controls="customizer-panel-head"
                className={`fm-subtab${tab === 'head' ? ' active' : ''}`}
                onClick={() => setTab('head')}
              >
                <span className="fm-subtab__label">Head</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'attire'}
                aria-controls="customizer-panel-attire"
                className={`fm-subtab${tab === 'attire' ? ' active' : ''}`}
                onClick={() => setTab('attire')}
              >
                <span className="fm-subtab__label">Attire</span>
              </button>
            </div>
            <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={handleReset}>
              Reset Changes
            </button>
          </div>

          {tab === 'presets' && (
            <div id="customizer-panel-presets" role="tabpanel" aria-label="Presets" className="customization-group">
              <div className="fm-preset-grid" role="radiogroup" aria-label="Avatar presets">
                {PRESETS.map((preset) => {
                  const selected = presetMatches(avatarConfig, preset.config);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`fm-preset-card${selected ? ' selected' : ''}`}
                      onClick={() => setAvatarConfig({ ...preset.config })}
                    >
                      <span className="fm-preset-card__radio" aria-hidden="true" />
                      <ManagerAvatar config={preset.config} size={72} title={preset.label} />
                      <span className="fm-preset-card__label">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'body' && (
            <div id="customizer-panel-body" role="tabpanel" aria-label="Body" className="customization-group">
              <div className="form-group">
                <label className="fm-label-small">Skin Tone</label>
                <p className="fm-category-desc">Sets a matching shadow tone automatically, so shading looks right at every skin tone.</p>
                <div className="color-selector">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.value}
                      className={`color-option ${avatarConfig.skinTone === tone.value ? 'active' : ''}`}
                      style={{ backgroundColor: `#${tone.value}` }}
                      onClick={() => setSkin(tone.value)}
                      title={tone.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'head' && (
            <div id="customizer-panel-head" role="tabpanel" aria-label="Head" className="customization-group">
              <div className="form-group">
                <label className="fm-label-small">Hair Style</label>
                <p className="fm-category-desc">The shape and length of your cut.</p>
                <div className="option-grid">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style.value}
                      className={`fm-btn fm-btn--small ${avatarConfig.hairStyle === style.value ? 'active' : ''}`}
                      onClick={() => setAvatarConfig({ ...avatarConfig, hairStyle: style.value })}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="fm-label-small">Hair Color</label>
                <p className="fm-category-desc">Independent of hairstyle — mix any color with any cut.</p>
                <div className="color-selector">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`color-option ${avatarConfig.hairColor === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: `#${color.value}` }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, hairColor: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="fm-label-small">Eyebrow Color</label>
                <p className="fm-category-desc">Its own axis — doesn't have to match your hair.</p>
                <div className="color-selector">
                  {EYEBROW_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`color-option ${(avatarConfig.eyebrowColor ?? '') === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: `#${color.value}` }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, eyebrowColor: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="fm-label-small">Eye Color</label>
                <p className="fm-category-desc">Iris color.</p>
                <div className="color-selector">
                  {EYE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`color-option ${avatarConfig.eyeColor === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: `#${color.value}` }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, eyeColor: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="fm-label-small">Facial Hair</label>
                <p className="fm-category-desc">Uses your hair color.</p>
                <div className="option-grid">
                  {FACIAL_HAIR.map((style) => (
                    <button
                      key={style.value}
                      className={`fm-btn fm-btn--small ${avatarConfig.facialHair === style.value ? 'active' : ''}`}
                      onClick={() => setAvatarConfig({ ...avatarConfig, facialHair: style.value })}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="fm-label-small">Accessories</label>
                <p className="fm-category-desc">Optional extras.</p>
                <div className="option-grid">
                  {ACCESSORIES.map((acc) => (
                    <button
                      key={acc.value}
                      className={`fm-btn fm-btn--small ${
                        (avatarConfig.accessories?.[0] ?? '') === acc.value ? 'active' : ''
                      }`}
                      onClick={() =>
                        setAvatarConfig({ ...avatarConfig, accessories: acc.value ? [acc.value] : [] })
                      }
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'attire' && (
            <div id="customizer-panel-attire" role="tabpanel" aria-label="Attire" className="customization-group">
              <div className="form-group">
                <label className="fm-label-small">Suit Color</label>
                <p className="fm-category-desc">The jacket colour shown in your preview.</p>
                <div className="color-selector">
                  {SUIT_COLORS.map((suit) => (
                    <button
                      key={suit.label}
                      className={`color-option ${avatarConfig.suitColor === suit.value ? 'active' : ''}`}
                      style={{ backgroundColor: suit.value ? `#${suit.value}` : 'var(--panel-2)' }}
                      onClick={() => setAvatarConfig({ ...avatarConfig, suitColor: suit.value })}
                      title={suit.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="fm-actions bottom-actions">
            <button className="fm-btn fm-btn--ghost" onClick={onBack}>
              Back
            </button>
            <button className="fm-btn fm-btn--primary" onClick={handleSave}>
              Confirm
            </button>
          </div>
        </div>

        <div className="avatar-preview-section">
          <div className="avatar-preview customizer-avatar-svg" ref={avatarRef}>
            <ManagerAvatar config={avatarConfig} size={420} title={name || 'Manager avatar'} />
          </div>
          <div className="preview-actions">
            <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={handleRandomize}>
              <Icon name="dice" size={15} /> Randomize
            </button>
            <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={handleDownload}>
              <Icon name="download" size={15} /> Download PNG
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .fm-character-customizer {
          max-width: 1100px;
          margin: 0 auto;
        }

        .name-row {
          max-width: 420px;
          margin: 0 auto 1.5rem;
        }

        .name-row .fm-label-small {
          display: block;
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .character-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
          gap: 2rem;
          padding: 2rem;
          background: var(--panel-2);
          border-radius: var(--r-md);
          border: 1px solid var(--border);
        }

        .customization-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-width: 0;
        }

        .tabs-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .customization-group {
          background: var(--panel);
          padding: 1.5rem;
          border-radius: var(--r-md);
          border: 1px solid var(--border);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

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

        .color-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .color-option {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
          border-color: color-mix(in srgb, var(--lime) 50%, transparent);
        }

        .color-option.active {
          border-color: var(--lime);
          box-shadow: 0 0 12px color-mix(in srgb, var(--lime) 40%, transparent);
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .fm-btn.fm-btn--small {
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
        }

        .fm-btn.fm-btn--small.active {
          background: var(--lime);
          color: var(--brand-text);
        }

        .bottom-actions {
          justify-content: space-between;
          margin-top: auto;
        }

        .avatar-preview-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .avatar-preview {
          width: min(420px, 100%);
          aspect-ratio: 1 / 1;
          border-radius: var(--r-md);
          border: 2px solid var(--border-bright);
          background: var(--panel);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .preview-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .character-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            padding: 1.5rem;
          }

          .avatar-preview-section {
            order: -1;
          }

          .avatar-preview {
            width: 220px;
          }

          .bottom-actions {
            flex-direction: column;
          }

          .bottom-actions .fm-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
