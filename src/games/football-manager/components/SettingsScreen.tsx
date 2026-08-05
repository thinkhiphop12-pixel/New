'use client';

import { useState } from 'react';
import { Icon } from './Icon';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    twoFactor: false,
    vibration: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const settingsList = [
    { key: 'notifications' as const, label: 'Notifications', icon: 'bell' },
    { key: 'sound' as const, label: 'Sound Effects', icon: 'sound' },
    { key: 'twoFactor' as const, label: 'Two-Factor Auth', icon: 'lock' },
    { key: 'vibration' as const, label: 'Vibration', icon: 'vibration' },
  ];

  return (
    <div className="fm-settings">
      <div className="fm-settings__header">Settings</div>

      <div className="fm-settings__list">
        {settingsList.map((setting) => (
          <div key={setting.key} className="fm-settings__row">
            <div className="fm-settings__icon">
              <Icon name={setting.icon as any} size={18} />
            </div>
            <div className="fm-settings__label">{setting.label}</div>
            <button
              className="fm-settings__toggle"
              onClick={() => toggleSetting(setting.key)}
            >
              <div
                className={`fm-settings__toggle-track ${
                  settings[setting.key] ? 'active' : ''
                }`}
              >
                <div className="fm-settings__toggle-thumb" />
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
