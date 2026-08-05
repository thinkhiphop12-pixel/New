'use client';

import { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { AvatarConfig, ManagerProfile } from '@/engine/types';
import ManagerAvatar, { shadeColor } from './ManagerAvatar';

type CustomizerTab = 'details' | 'appearance';

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
  };
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
  const [tab, setTab] = useState<CustomizerTab>('details');
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
      <p className="fm-label">CUSTOMIZE YOUR MANAGER</p>

      <div className="character-container">
        <div className="avatar-preview-section">
          <h3>Your Manager</h3>
          <div className="avatar-preview customizer-avatar-svg" ref={avatarRef}>
            <ManagerAvatar config={avatarConfig} size={280} title={name || 'Manager avatar'} />
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

        <div className="customization-section">
          <div className="fm-subnav__tabs" role="tablist" aria-label="Manager customization sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'details'}
              aria-controls="customizer-panel-details"
              className={`fm-subtab${tab === 'details' ? ' active' : ''}`}
              onClick={() => setTab('details')}
            >
              <span className="fm-subtab__label">Personal Details</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'appearance'}
              aria-controls="customizer-panel-appearance"
              className={`fm-subtab${tab === 'appearance' ? ' active' : ''}`}
              onClick={() => setTab('appearance')}
            >
              <span className="fm-subtab__label">Appearance</span>
            </button>
          </div>

          {tab === 'details' && (
            <div id="customizer-panel-details" role="tabpanel" aria-label="Personal details">
              <div className="form-group">
                <label className="fm-label-small">Manager Name</label>
                <input
                  type="text"
                  className="fm-search"
                  placeholder="Enter your manager name"
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div id="customizer-panel-appearance" role="tabpanel" aria-label="Appearance" className="customization-group">
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

          <div className="action-buttons">
            <button className="fm-btn fm-btn--secondary" onClick={handleReset}>
              Reset to Default
            </button>
            <button className="fm-btn fm-btn--primary" onClick={handleSave}>
              Save Manager
            </button>
            <button className="fm-btn fm-btn--secondary" onClick={onBack}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .fm-character-customizer {
          max-width: 1000px;
          margin: 0 auto;
        }

        .character-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 2rem;
          background: var(--panel-2);
          border-radius: var(--r-md);
          border: 1px solid var(--border);
        }

        .avatar-preview-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .avatar-preview-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          color: var(--text);
        }

        .avatar-preview {
          width: 280px;
          height: 280px;
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
        }

        .customization-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        .action-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .action-buttons .fm-btn {
          flex: 1;
          min-width: 140px;
        }

        @media (max-width: 768px) {
          .character-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            padding: 1.5rem;
          }

          .avatar-preview {
            width: 200px;
            height: 200px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-buttons .fm-btn {
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}
