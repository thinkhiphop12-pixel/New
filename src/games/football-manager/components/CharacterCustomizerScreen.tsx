'use client';

import { useEffect, useState } from 'react';
import type { AvatarConfig, ManagerProfile } from '@/engine/types';

const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: 'c1ad60',
  eyeColor: '1f2937',
  hairColor: '4a3728',
  hairStyle: 'long01',
  facialHair: '',
  mouth: 'default',
  eyes: 'default',
  nose: 'default',
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

const HAIR_STYLES = [
  { label: 'Long', value: 'long01' },
  { label: 'Medium', value: 'long02' },
  { label: 'Short', value: 'short01' },
  { label: 'Curly', value: 'curly01' },
  { label: 'Wavy', value: 'straight01' },
];

const FACIAL_HAIR = [
  { label: 'Clean', value: '' },
  { label: 'Beard', value: 'beardMajestic' },
  { label: 'Goatee', value: 'beardLight' },
];

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
  const [avatarUrl, setAvatarUrl] = useState('');

  // Generate Dicebear avatar URL
  useEffect(() => {
    const params = new URLSearchParams({
      skinColor: avatarConfig.skinTone,
      hairColor: avatarConfig.hairColor,
      hairStyle: avatarConfig.hairStyle,
      facialHairColor: avatarConfig.hairColor,
      facialHairType: avatarConfig.facialHair,
      eyeColor: avatarConfig.eyeColor,
      mouth: avatarConfig.mouth,
      eyes: avatarConfig.eyes,
      nose: avatarConfig.nose,
      seed: name || 'default',
    });

    const url = `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
    setAvatarUrl(url);
  }, [avatarConfig, name]);

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

  return (
    <div className="fm-screen fm-character-customizer">
      <p className="fm-label">CUSTOMIZE YOUR MANAGER</p>

      <div className="character-container">
        <div className="avatar-preview-section">
          <h3>Your Manager</h3>
          <div className="avatar-preview">
            <img
              src={avatarUrl}
              alt="Manager avatar"
              className="avatar-image"
              onError={(e) => {
                e.currentTarget.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280"%3ELoading...%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>

        <div className="customization-section">
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

          <div className="customization-group">
            <h4>Appearance</h4>

            <div className="form-group">
              <label className="fm-label-small">Skin Tone</label>
              <div className="color-selector">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.value}
                    className={`color-option ${avatarConfig.skinTone === tone.value ? 'active' : ''}`}
                    style={{ backgroundColor: `#${tone.value}` }}
                    onClick={() => setAvatarConfig({ ...avatarConfig, skinTone: tone.value })}
                    title={tone.label}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="fm-label-small">Hair Color</label>
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
              <label className="fm-label-small">Hair Style</label>
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
          </div>

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
          background: rgba(8, 20, 34, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(90, 242, 184, 0.1);
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
          color: #f4fbff;
        }

        .avatar-preview {
          width: 280px;
          height: 280px;
          border-radius: 12px;
          border: 2px solid rgba(90, 242, 184, 0.3);
          background: rgba(3, 9, 18, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .customization-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .customization-group {
          background: rgba(11, 31, 52, 0.5);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(90, 242, 184, 0.1);
        }

        .customization-group h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #39ff98;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          color: #a8bdd1;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          border-color: rgba(57, 255, 152, 0.5);
        }

        .color-option.active {
          border-color: #39ff98;
          box-shadow: 0 0 12px rgba(57, 255, 152, 0.4);
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
          background: #39ff98;
          color: #020712;
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
