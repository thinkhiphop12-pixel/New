import { useState } from 'react';
import { CLUBS_DB, NATIONS_DB, PREDICTIONS_TODAY, WC_FIXTURES, PLAYERS_DB } from '@/data/footballData';
import type { XPState } from '@/App';
import type { TabId } from '@/App';

interface Props {
  xp: XPState;
  setActiveTab: (tab: TabId) => void;
}

export default function Dashboard({ xp, setActiveTab }: Props) {
  const [showPlayer, setShowPlayer] = useState<typeof PLAYERS_DB[0] | null>(null);

  const topClubs = [...CLUBS_DB].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const topNations = [...NATIONS_DB].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const featuredPlayers = [PLAYERS_DB[0], PLAYERS_DB[1], PLAYERS_DB[2], PLAYERS_DB[6], PLAYERS_DB[4], PLAYERS_DB[32]];
  const recentFixtures = WC_FIXTURES.slice(-5).reverse();

  const quickActions = [
    { label: 'Compare Stats', icon: 'bar-chart', tab: 'stats' as TabId, desc: 'Club vs Club analysis' },
    { label: 'Tactics Board', icon: 'clipboard', tab: 'tactics' as TabId, desc: 'Plan your formation' },
    { label: 'Daily Quiz', icon: 'brain', tab: 'predict' as TabId, desc: 'Test your knowledge' },
    { label: 'Manager Mode', icon: 'crown', tab: 'manager' as TabId, desc: 'Lead your team' },
  ];

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Hero Section */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h2 className="text-2xl font-black text-white mb-2">Welcome to BallKnw</h2>
          <p className="text-white/60 mb-4">Your ultimate football hub. Explore stats, tactics, predictions, and more.</p>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => setActiveTab(action.tab)}
                className="flex items-center gap-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/30 rounded-lg px-4 py-2.5 transition-all group"
              >
                <span className="text-[#FFD700] group-hover:scale-110 transition-transform">
                  {action.icon === 'bar-chart' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>}
                  {action.icon === 'clipboard' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /></svg>}
                  {action.icon === 'brain' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 01-1.32-4.24 2.5 2.5 0 01-1.48-5.12A2.5 2.5 0 019.5 2z" /><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 001.32-4.24 2.5 2.5 0 001.48-5.12A2.5 2.5 0 0014.5 2z" /></svg>}
                  {action.icon === 'crown' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>}
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{action.label}</div>
                  <div className="text-[10px] text-white/40">{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* XP & Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black gold-text">{xp.level}</div>
          <div className="text-xs text-white/50 mt-1">Current Level</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black gold-text">{xp.streak}</div>
          <div className="text-xs text-white/50 mt-1">Day Streak {xp.streak >= 7 ? '🔥' : ''}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black gold-text">{xp.achievements.filter(a => a.unlocked).length}</div>
          <div className="text-xs text-white/50 mt-1">Achievements</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black gold-text">{PLAYERS_DB.length}+</div>
          <div className="text-xs text-white/50 mt-1">Players in DB</div>
        </div>
      </div>

      {/* Featured Players */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-[#FFD700]">★</span> Featured Players
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {featuredPlayers.map(player => (
            <button
              key={player.id}
              onClick={() => setShowPlayer(player)}
              className={`glass-card p-3 text-center hover:scale-105 transition-transform ${
                player.rating >= 90 ? 'player-card-gold' : player.rating >= 80 ? 'player-card-silver' : 'player-card-bronze'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-2 text-lg font-black"
                style={{ color: player.rating >= 90 ? '#FFD700' : player.rating >= 80 ? '#C0C0C0' : '#CD7F32' }}>
                {player.rating}
              </div>
              <div className="text-xs font-semibold text-white truncate">{player.name}</div>
              <div className="text-[10px] text-white/40">{player.position} · {player.club.slice(0, 12)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Top Clubs & Nations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            Top Clubs
          </h3>
          <div className="space-y-2">
            {topClubs.map((club, i) => (
              <div key={club.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                <span className="text-[#FFD700] font-bold w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{club.name}</div>
                  <div className="text-[10px] text-white/40">{club.league}</div>
                </div>
                <div className="text-sm font-bold" style={{ color: club.rating >= 85 ? '#FFD700' : '#fff' }}>{club.rating}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
            Top Nations
          </h3>
          <div className="space-y-2">
            {topNations.map((nation, i) => (
              <div key={nation.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                <span className="text-[#FFD700] font-bold w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{nation.name}</div>
                  <div className="text-[10px] text-white/40">Group {nation.group}</div>
                </div>
                <div className="text-sm font-bold" style={{ color: nation.rating >= 87 ? '#FFD700' : '#fff' }}>{nation.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Predictions */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
          Today's Predictions
        </h3>
        <div className="space-y-2">
          {PREDICTIONS_TODAY.map(pred => (
            <div key={pred.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-white">{pred.match}</div>
                <div className="text-[10px] text-white/40">{pred.league}</div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">H {pred.homeOdds}</span>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">D {pred.drawOdds}</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">A {pred.awayOdds}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent WC Results */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
          Recent World Cup 2022 Results
        </h3>
        <div className="space-y-2">
          {recentFixtures.map(fix => (
            <div key={fix.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
              <span className="text-xs text-white/60 w-24 truncate">{fix.homeTeam}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded min-w-[28px] text-center">{fix.homeGoals}</span>
                <span className="text-white/30">-</span>
                <span className="text-sm font-bold bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded min-w-[28px] text-center">{fix.awayGoals}</span>
              </div>
              <span className="text-xs text-white/60 w-24 truncate text-right">{fix.awayTeam}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayer(null)}>
          <div className="glass-card max-w-sm w-full p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-black text-white">{showPlayer.name}</h3>
              <button onClick={() => setShowPlayer(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black ${
                showPlayer.rating >= 90 ? 'bg-[#FFD700]/20 text-[#FFD700]' : showPlayer.rating >= 80 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'
              }`}>
                {showPlayer.rating}
              </div>
              <div>
                <div className="text-sm text-white/60">{showPlayer.position} · {showPlayer.age} yrs</div>
                <div className="text-sm text-white/60">{showPlayer.club}</div>
                <div className="text-sm text-[#FFD700]">${(showPlayer.value / 1000000).toFixed(0)}M</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'PAC', val: showPlayer.pace },
                { label: 'SHO', val: showPlayer.shooting },
                { label: 'PAS', val: showPlayer.passing },
                { label: 'DRI', val: showPlayer.dribbling },
                { label: 'DEF', val: showPlayer.defending },
                { label: 'PHY', val: showPlayer.physical },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-white/40">{s.label}</div>
                  <div className="text-sm font-bold" style={{ color: s.val >= 85 ? '#FFD700' : s.val >= 70 ? '#fff' : '#aaa' }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
