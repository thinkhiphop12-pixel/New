'use client';

import type { GameState, InboxItem } from '@/engine/types';
import { Icon, type IconName } from './Icon';

const CATEGORY_ICON: Record<string, IconName> = {
  club: 'stadium',
  transfer: 'transfers',
  injury: 'injury',
  contract: 'document',
  youth: 'sprout',
  board: 'target',
  match: 'trophy',
  press: 'mic',
};

export default function MessageDetailScreen({
  message,
  onBack,
}: {
  message: InboxItem | null;
  onBack: () => void;
}) {
  if (!message) {
    return (
      <div className="fm-screen">
        <p className="fm-hint">No message selected</p>
      </div>
    );
  }

  return (
    <div className="fm-message-detail">
      {/* Large Banner Icon */}
      <div className="fm-message-detail__banner">
        <div className="fm-message-detail__icon">
          <Icon name={CATEGORY_ICON[message.category] || 'mail'} size={48} />
        </div>
      </div>

      {/* Content */}
      <div className="fm-message-detail__content">
        <h2 className="fm-message-detail__title">{message.title}</h2>
        <div className="fm-message-detail__meta">
          {message.title} · {new Date().toLocaleDateString()}
        </div>
        <div className="fm-message-detail__body">{message.body}</div>
      </div>

      {/* Footer Button */}
      <div className="fm-message-detail__footer">
        <button className="fm-btn fm-btn--primary" onClick={onBack}>
          Acknowledge
        </button>
      </div>
    </div>
  );
}
