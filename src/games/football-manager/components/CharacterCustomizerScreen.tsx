'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import type {
  AvatarConfig, BadgeLevel, ManagerProfile, PlayingBackground, PriorRole,
} from '@/engine/types';
import ManagerAvatar, { shadeColor } from './ManagerAvatar';

type CustomizerTab = 'details' | 'credentials' | 'style' | 'appearance';

const APPEARANCE_SECTIONS = [
  { id: 'skin', label: 'Skin Tone', icon: 'palette' },
  { id: 'hairColor', label: 'Hair Color', icon: 'palette' },
  { id: 'eyebrow', label: 'Eyebrows', icon: 'palette' },
  { id: 'hairStyle', label: 'Hair Style', icon: 'person' },
  { id: 'eyes', label: 'Eye Color', icon: 'palette' },
  { id: 'facialHair', label: 'Facial Hair', icon: 'person' },
  { id: 'accessories', label: 'Accessories', icon: 'settings' },
] as const;

type AppearanceSection = (typeof APPEARANCE_SECTIONS)[number]['id'];

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

/** A single grid choice: a thumbnail (color swatch or mini avatar render),
 *  a label, and a checkmark badge when selected — the one visual pattern
 *  every customization grid in this screen shares. */
function OptionTile({
  label,
  active,
  onClick,
  thumb,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  thumb: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`option-tile${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={label}
    >
      <span className="option-tile__thumb">{thumb}</span>
      <span className="option-tile__label">{label}</span>
      {active && (
        <span className="option-tile__check">
          <Icon name="check" size={11} />
        </span>
      )}
    </button>
  );
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
  const [playingBackground, setPlayingBackground] = useState<PlayingBackground>(
    initialProfile?.playingBackground || 'none'
  );
  const [priorRole, setPriorRole] = useState<PriorRole>(initialProfile?.priorRole || 'none');
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel>(initialProfile?.badgeLevel || 'none');
  const [coachingStyles, setCoachingStyles] = useState<string[]>(initialProfile?.coachingStyles || []);
  const [personality, setPersonality] = useState<string[]>(initialProfile?.personality || []);
  const [tab, setTab] = useState<CustomizerTab>('details');
  const [appearanceSection, setAppearanceSection] = useState<AppearanceSection>('skin');
  const avatarRef = useRef<HTMLDivElement | null>(null);

  const sectionIndex = APPEARANCE_SECTIONS.findIndex((s) => s.id === appearanceSection);
  const stepSection = (dir: 1 | -1) => {
    const n = APPEARANCE_SECTIONS.length;
    setAppearanceSection(APPEARANCE_SECTIONS[(sectionIndex + dir + n) % n].id);
  };

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
      playingBackground,
      priorRole,
      badgeLevel,
      coachingStyles,
      personality,
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
          <div className="fm-subnav__tabs customizer-tabbar" role="tablist" aria-label="Manager customization sections">
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
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'credentials'}
              aria-controls="customizer-panel-credentials"
              className={`fm-subtab${tab === 'credentials' ? ' active' : ''}`}
              onClick={() => setTab('credentials')}
            >
              <span className="fm-subtab__label">Credentials</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'style'}
              aria-controls="customizer-panel-style"
              className={`fm-subtab${tab === 'style' ? ' active' : ''}`}
              onClick={() => setTab('style')}
            >
              <span className="fm-subtab__label">Style &amp; Personality</span>
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
              <div className="section-strip" role="tablist" aria-label="Appearance sections">
                {APPEARANCE_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={appearanceSection === s.id}
                    className={`section-strip__item${appearanceSection === s.id ? ' active' : ''}`}
                    onClick={() => setAppearanceSection(s.id)}
                    title={s.label}
                  >
                    <Icon name={s.icon} size={16} />
                  </button>
                ))}
              </div>

              <div className="section-nav">
                <button type="button" className="section-nav__arrow" onClick={() => stepSection(-1)} aria-label="Previous section">
                  <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
                </button>
                <span className="section-nav__label">{APPEARANCE_SECTIONS[sectionIndex].label}</span>
                <button type="button" className="section-nav__arrow" onClick={() => stepSection(1)} aria-label="Next section">
                  <Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>

              {appearanceSection === 'skin' && (
                <div className="form-group">
                  <p className="fm-category-desc">Sets a matching shadow tone automatically, so shading looks right at every skin tone.</p>
                  <div className="tile-grid">
                    {SKIN_TONES.map((tone) => (
                      <OptionTile
                        key={tone.value}
                        label={tone.label}
                        active={avatarConfig.skinTone === tone.value}
                        onClick={() => setSkin(tone.value)}
                        thumb={<span className="swatch" style={{ backgroundColor: `#${tone.value}` }} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'hairColor' && (
                <div className="form-group">
                  <p className="fm-category-desc">Independent of hairstyle — mix any color with any cut.</p>
                  <div className="tile-grid">
                    {HAIR_COLORS.map((color) => (
                      <OptionTile
                        key={color.value}
                        label={color.label}
                        active={avatarConfig.hairColor === color.value}
                        onClick={() => setAvatarConfig({ ...avatarConfig, hairColor: color.value })}
                        thumb={<span className="swatch" style={{ backgroundColor: `#${color.value}` }} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'eyebrow' && (
                <div className="form-group">
                  <p className="fm-category-desc">Its own axis — doesn't have to match your hair.</p>
                  <div className="tile-grid">
                    {EYEBROW_COLORS.map((color) => (
                      <OptionTile
                        key={color.value}
                        label={color.label}
                        active={(avatarConfig.eyebrowColor ?? '') === color.value}
                        onClick={() => setAvatarConfig({ ...avatarConfig, eyebrowColor: color.value })}
                        thumb={<span className="swatch" style={{ backgroundColor: `#${color.value}` }} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'hairStyle' && (
                <div className="form-group">
                  <p className="fm-category-desc">The shape and length of your cut — each tile previews it on your manager.</p>
                  <div className="tile-grid">
                    {HAIR_STYLES.map((style) => (
                      <OptionTile
                        key={style.value}
                        label={style.label}
                        active={avatarConfig.hairStyle === style.value}
                        onClick={() => setAvatarConfig({ ...avatarConfig, hairStyle: style.value })}
                        thumb={<ManagerAvatar config={{ ...avatarConfig, hairStyle: style.value }} size={64} title={style.label} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'eyes' && (
                <div className="form-group">
                  <p className="fm-category-desc">Iris color.</p>
                  <div className="tile-grid">
                    {EYE_COLORS.map((color) => (
                      <OptionTile
                        key={color.value}
                        label={color.label}
                        active={avatarConfig.eyeColor === color.value}
                        onClick={() => setAvatarConfig({ ...avatarConfig, eyeColor: color.value })}
                        thumb={<span className="swatch" style={{ backgroundColor: `#${color.value}` }} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'facialHair' && (
                <div className="form-group">
                  <p className="fm-category-desc">Uses your hair color.</p>
                  <div className="tile-grid">
                    {FACIAL_HAIR.map((style) => (
                      <OptionTile
                        key={style.value}
                        label={style.label}
                        active={avatarConfig.facialHair === style.value}
                        onClick={() => setAvatarConfig({ ...avatarConfig, facialHair: style.value })}
                        thumb={<ManagerAvatar config={{ ...avatarConfig, facialHair: style.value }} size={64} title={style.label} />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {appearanceSection === 'accessories' && (
                <div className="form-group">
                  <p className="fm-category-desc">Optional extras.</p>
                  <div className="tile-grid">
                    {ACCESSORIES.map((acc) => (
                      <OptionTile
                        key={acc.value}
                        label={acc.label}
                        active={(avatarConfig.accessories?.[0] ?? '') === acc.value}
                        onClick={() =>
                          setAvatarConfig({ ...avatarConfig, accessories: acc.value ? [acc.value] : [] })
                        }
                        thumb={
                          <ManagerAvatar
                            config={{ ...avatarConfig, accessories: acc.value ? [acc.value] : [] }}
                            size={64}
                            title={acc.label}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'credentials' && (
            <div id="customizer-panel-credentials" role="tabpanel" aria-label="Credentials" className="customization-group">
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
            <div id="customizer-panel-style" role="tabpanel" aria-label="Style and personality" className="customization-group">
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

          <div className="action-buttons">
            <button className="fm-btn fm-btn--secondary" onClick={handleReset}>
              Reset to Default
            </button>
            <button className="fm-btn fm-btn--primary" onClick={handleSave}>
              {initialProfile ? 'Save Manager' : 'Start Career'}
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
          align-items: start;
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
          position: sticky;
          top: 16px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--r-lg, 18px);
          padding: 1.5rem;
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
          background: var(--panel-2);
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

        .customizer-tabbar {
          display: flex;
          gap: 0;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--r-sm, 8px);
          overflow: hidden;
        }

        .customizer-tabbar :global(.fm-subtab) {
          flex: 1;
          justify-content: center;
          padding: 0.85rem 0.5rem;
          border-radius: 0;
          border: none;
          border-right: 1px solid var(--border);
          border-bottom: 3px solid transparent;
          background: transparent;
          font-weight: 800;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .customizer-tabbar :global(.fm-subtab:last-child) {
          border-right: none;
        }

        .customizer-tabbar :global(.fm-subtab.active) {
          background: color-mix(in srgb, var(--lime) 14%, var(--panel));
          border-bottom-color: var(--lime);
          color: var(--text);
        }

        .section-strip {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }

        .section-strip__item {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--r-sm, 8px);
          border: 1px solid var(--border);
          background: var(--panel-2);
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .section-strip__item:hover {
          border-color: var(--border-bright);
          color: var(--text);
        }

        .section-strip__item.active {
          border-color: var(--lime);
          color: var(--text);
          background: color-mix(in srgb, var(--lime) 16%, var(--panel-2));
        }

        .section-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          margin-bottom: 1rem;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .section-nav__arrow {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--panel-2);
          color: var(--text);
          cursor: pointer;
        }

        .section-nav__arrow:hover {
          border-color: var(--lime);
        }

        .section-nav__label {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          min-width: 140px;
          text-align: center;
        }

        .tile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
          gap: 0.6rem;
        }

        /* OptionTile renders as its own component, so its elements never
         *  receive this file's scoped class — these rules must stay global
         *  or none of them would ever match. */
        :global(.option-tile) {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 0.4rem;
          border-radius: var(--r-sm, 8px);
          border: 2px solid var(--border);
          background: var(--panel-2);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        :global(.option-tile:hover) {
          border-color: color-mix(in srgb, var(--lime) 50%, transparent);
        }

        :global(.option-tile.active) {
          border-color: var(--lime);
          background: color-mix(in srgb, var(--lime) 12%, var(--panel-2));
          box-shadow: 0 0 12px color-mix(in srgb, var(--lime) 30%, transparent);
        }

        :global(.option-tile__thumb) {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          overflow: hidden;
        }

        :global(.option-tile__thumb) .swatch {
          width: 100%;
          height: 100%;
          border-radius: 6px;
          display: block;
        }

        :global(.option-tile__label) {
          font-size: 0.72rem;
          color: var(--text-2, var(--text));
          text-align: center;
          line-height: 1.2;
        }

        :global(.option-tile__check) {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--lime);
          color: #04140d;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .stack-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

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

        .stack-option:hover {
          border-color: color-mix(in srgb, var(--lime) 50%, transparent);
        }

        .stack-option.active {
          border-color: var(--lime);
          background: color-mix(in srgb, var(--lime) 12%, var(--panel));
        }

        .stack-option__label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .stack-option__desc {
          font-size: 0.78rem;
          color: var(--muted);
        }

        .summary-box {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: var(--r-sm, 6px);
          padding: 1rem;
        }

        .fm-btn.fm-btn--small:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .fm-btn.fm-btn--small {
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
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

          .avatar-preview-section {
            position: static;
          }

          .avatar-preview {
            width: 200px;
            height: 200px;
          }

          .customizer-tabbar :global(.fm-subtab) {
            font-size: 0.68rem;
            padding: 0.7rem 0.25rem;
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
