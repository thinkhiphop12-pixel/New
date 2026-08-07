'use client';

import ManagerAvatar from './ManagerAvatar';
import type { ManagerProfile } from '@/engine/types';

/** Gate at the start of every new career: continue with the manager already
 *  on file, or open the customizer to build a different one. Only shown when
 *  a `ManagerProfile` already exists — if none does, the caller skips
 *  straight to `CharacterCustomizerScreen` since there's nothing to keep. */
export default function ManagerPickScreen({
  profile,
  onContinue,
  onCreateNew,
  onBack,
}: {
  profile: ManagerProfile;
  onContinue: () => void;
  onCreateNew: () => void;
  onBack: () => void;
}) {
  return (
    <div className="fm-screen fm-manager-pick">
      <p className="fm-label" style={{ textAlign: 'center' }}>Choose your manager</p>

      <div className="fm-manager-pick__card">
        <ManagerAvatar config={profile.avatarConfig} size={140} title={profile.name} />
        <p className="fm-manager-pick__name">{profile.name}</p>
        <p className="fm-hint">Continue with the manager you already created, or start a new one.</p>
      </div>

      <div className="fm-actions">
        <button type="button" className="fm-btn fm-btn--ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="fm-btn fm-btn--secondary" onClick={onCreateNew}>
          Create New Manager
        </button>
        <button type="button" className="fm-btn fm-btn--primary" onClick={onContinue}>
          Continue as {profile.name}
        </button>
      </div>

      <style jsx>{`
        .fm-manager-pick {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        .fm-manager-pick__card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 2rem;
          margin-bottom: 1.5rem;
        }

        .fm-manager-pick__name {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
