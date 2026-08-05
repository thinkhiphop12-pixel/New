'use client';

import { Icon } from './Icon';

export default function MoreMenuScreen({
  onNavigate,
}: {
  onNavigate: (screen: string) => void;
}) {
  const tiles = [
    { label: 'Settings', icon: 'settings', screen: 'settings' },
    { label: 'Help', icon: 'help', screen: 'help' },
    { label: 'Stats', icon: 'stats', screen: 'stats' },
    { label: 'Achievements', icon: 'trophy', screen: 'achievements' },
    { label: 'Settings', icon: 'settings', screen: 'settings' },
    { label: 'About', icon: 'info', screen: 'about' },
  ];

  return (
    <div className="fm-more-menu">
      <div className="fm-more-menu__header">More</div>

      <div className="fm-more-menu__grid">
        {tiles.map((tile) => (
          <button
            key={tile.screen}
            className="fm-more-menu__tile"
            onClick={() => onNavigate(tile.screen)}
          >
            <div className="fm-more-menu__tile-icon">
              <Icon name={tile.icon as any} size={24} />
            </div>
            <div className="fm-more-menu__tile-label">{tile.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
