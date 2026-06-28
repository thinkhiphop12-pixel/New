import { useState } from 'react';
import type { XPState } from '@/App';

interface Props {
  xp: XPState;
}

export default function XPQuests({ xp }: Props) {
  const [tab, setTab] = useState<'progress' | 'achievements'>('progress');

  const levelProgress = (xp.xp / xp.xpToNext) * 100;
  const unlockedCount = xp.achievements.filter(a => a.unlocked).length;
  const totalCount = xp.achievements.length;

  const levelRewards = [
    { level: 1, reward: 'Dashboard Access' },
    { level: 3, reward: 'Advanced Stats Compare' },
    { level: 5, reward: 'Custom Formations' },
    { level: 7, reward: 'Manager Mode: National Teams' },
    { level: 10, reward: 'World Cup Tournament' },
    { level: 15, reward: 'Legendary Draft Pool' },
    { level: 20, reward: 'BallKnw Master Title' },
  ];

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          XP & Quests
        </h2>

        {/* Level Card */}
        <div className="bg-gradient-to-br from-[#FFD700]/20 to-transparent rounded-xl p-6 mb-6 border border-[#FFD700]/20">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FFD700]/30">
              <span className="text-3xl font-black text-[#0D1B2A]">{xp.level}</span>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white mb-1">Level {xp.level}</div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
              </div>
              <div className="text-xs text-white/50">{xp.xp} / {xp.xpToNext} XP to next level</div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-center">
            <div>
              <div className="text-xl font-bold text-[#FFD700]">{xp.streak}</div>
              <div className="text-[10px] text-white/40">Day Streak {xp.streak >= 7 ? '🔥' : ''}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#FFD700]">{unlockedCount}/{totalCount}</div>
              <div className="text-[10px] text-white/40">Achievements</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#FFD700]">{xp.xp + (xp.level - 1) * xp.xpToNext}</div>
              <div className="text-[10px] text-white/40">Total XP</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('progress')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'progress' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
            Level Progress
          </button>
          <button onClick={() => setTab('achievements')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'achievements' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
            Achievements
          </button>
        </div>

        {tab === 'progress' ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white mb-2">Level Rewards</h3>
            {levelRewards.map(lr => (
              <div key={lr.level} className={`flex items-center gap-3 p-3 rounded-lg ${xp.level >= lr.level ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' : 'bg-white/5 border border-transparent'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${xp.level >= lr.level ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/30'}`}>
                  {lr.level}
                </div>
                <div className="flex-1">
                  <div className={`text-sm ${xp.level >= lr.level ? 'text-white font-medium' : 'text-white/40'}`}>{lr.reward}</div>
                </div>
                {xp.level >= lr.level && <span className="text-green-400 text-xs">Unlocked</span>}
              </div>
            ))}

            {/* Daily Quests */}
            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Daily Quests</h3>
            {[
              { name: 'Complete the Daily Quiz', xp: 50, done: false },
              { name: 'Make 3 Predictions', xp: 30, done: false },
              { name: 'Read 2 Analysis Articles', xp: 40, done: false },
              { name: 'Simulate a Match in Manager Mode', xp: 60, done: false },
              { name: 'Save a Tactics Board', xp: 50, done: false },
            ].map((quest, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-6 h-6 rounded border border-[#FFD700]/30 flex items-center justify-center">
                  {quest.done && <span className="text-[#FFD700] text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{quest.name}</div>
                </div>
                <span className="text-xs text-[#FFD700]">+{quest.xp} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {xp.achievements.map(ach => (
              <div key={ach.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${ach.unlocked ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' : 'bg-white/5 border border-transparent'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ach.unlocked ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/30'}`}>
                  {ach.icon === 'star' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                  {ach.icon === 'clipboard' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /></svg>}
                  {ach.icon === 'target' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>}
                  {ach.icon === 'users' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
                  {ach.icon === 'trophy' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 006 6 6 6 0 006-6V2z" /></svg>}
                  {ach.icon === 'flame' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>}
                  {ach.icon === 'brain' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 01-1.32-4.24 2.5 2.5 0 01-1.48-5.12A2.5 2.5 0 019.5 2z" /><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 001.32-4.24 2.5 2.5 0 001.48-5.12A2.5 2.5 0 0014.5 2z" /></svg>}
                  {ach.icon === 'crown' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${ach.unlocked ? 'text-white' : 'text-white/30'}`}>{ach.name}</div>
                  <div className="text-xs text-white/40">{ach.description}</div>
                </div>
                <div className="text-right">
                  {ach.unlocked ? (
                    <span className="text-xs text-green-400">✓ Unlocked</span>
                  ) : (
                    <span className="text-xs text-[#FFD700]/50">+{ach.reward} XP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
