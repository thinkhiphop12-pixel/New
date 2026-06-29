import { useState, useEffect, type JSX } from 'react';
import Dashboard from '@/components/Dashboard';
import StatsCompare from '@/components/StatsCompare';
import TacticsBoard from '@/components/TacticsBoard';
import PredictorQuiz from '@/components/PredictorQuiz';
import AnalysisBlog from '@/components/AnalysisBlog';
import DraftRoom from '@/components/DraftRoom';
import ManagerMode from '@/components/ManagerMode';
import './App.css';

export interface XPState {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  lastActive: string;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  reward: number;
}

export const defaultAchievements: Achievement[] = [
  { id: 'a1', name: 'First Steps', description: 'Complete your first quiz', icon: 'star', unlocked: false, reward: 50 },
  { id: 'a2', name: 'Tactician', description: 'Save your first tactics board', icon: 'clipboard', unlocked: false, reward: 100 },
  { id: 'a3', name: 'Predictor', description: 'Make 5 correct predictions', icon: 'target', unlocked: false, reward: 150 },
  { id: 'a4', name: 'Draft Master', description: 'Complete your first draft', icon: 'users', unlocked: false, reward: 200 },
  { id: 'a5', name: 'Manager', description: 'Win your first match in Manager Mode', icon: 'trophy', unlocked: false, reward: 250 },
  { id: 'a6', name: 'On Fire', description: 'Maintain a 7-day streak', icon: 'flame', unlocked: false, reward: 300 },
  { id: 'a7', name: 'Know It All', description: 'Score 10/10 on a quiz', icon: 'brain', unlocked: false, reward: 500 },
  { id: 'a8', name: 'Champion', description: 'Win a tournament in Manager Mode', icon: 'crown', unlocked: false, reward: 1000 },
];

function loadXP(): XPState {
  try {
    const saved = localStorage.getItem('ballknw_xp');
    if (saved) return JSON.parse(saved);
  } catch { /* empty */ }
  return {
    level: 1,
    xp: 0,
    xpToNext: 100,
    streak: 1,
    lastActive: new Date().toISOString().split('T')[0],
    achievements: defaultAchievements
  };
}

export function saveXP(xp: XPState) {
  localStorage.setItem('ballknw_xp', JSON.stringify(xp));
}

export type TabId = 'dashboard' | 'stats' | 'tactics' | 'predict' | 'analysis' | 'draft' | 'manager';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'stats', label: 'Stats', icon: 'bar-chart-3' },
  { id: 'tactics', label: 'Tactics', icon: 'clipboard-list' },
  { id: 'predict', label: 'Predict', icon: 'trending-up' },
  { id: 'analysis', label: 'Analysis', icon: 'newspaper' },
  { id: 'draft', label: 'Draft', icon: 'users' },
  { id: 'manager', label: 'Manager', icon: 'crown' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [xp, setXP] = useState<XPState>(loadXP);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (xp.lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];
      const newStreak = xp.lastActive === yestStr ? xp.streak + 1 : 1;
      setXP(prev => {
        const updated = { ...prev, lastActive: today, streak: newStreak };
        saveXP(updated);
        return updated;
      });
    }
  }, []);

  const addXP = (amount: number, achievementId?: string) => {
    setXP(prev => {
      let newXP = prev.xp + amount;
      let newLevel = prev.level;
      let newXpToNext = prev.xpToNext;
      while (newXP >= newXpToNext) {
        newXP -= newXpToNext;
        newLevel++;
        newXpToNext = Math.floor(newXpToNext * 1.2);
      }
      const newAchievements = prev.achievements.map(a =>
        a.id === achievementId ? { ...a, unlocked: true } : a
      );
      const updated = { ...prev, xp: newXP, level: newLevel, xpToNext: newXpToNext, achievements: newAchievements };
      saveXP(updated);
      return updated;
    });
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard xp={xp} setActiveTab={setActiveTab} />;
      case 'stats': return <StatsCompare />;
      case 'tactics': return <TacticsBoard addXP={addXP} />;
      case 'predict': return <PredictorQuiz addXP={addXP} />;
      case 'analysis': return <AnalysisBlog addXP={addXP} />;
      case 'draft': return <DraftRoom addXP={addXP} />;
      case 'manager': return <ManagerMode addXP={addXP} />;
      default: return <Dashboard xp={xp} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D1B2A]/90 backdrop-blur-md border-b border-[#FFD700]/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center font-black text-[#0D1B2A] text-lg shadow-lg shadow-[#FFD700]/20">
              BK
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">BALLKNW</h1>
              <p className="text-[10px] text-[#FFD700] uppercase tracking-widest font-medium">Ultimate Football Hub</p>
            </div>
          </div>

          {/* XP Display */}
          <div className="hidden sm:flex items-center gap-4">
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-[#FFD700]/20 rounded-lg px-3 py-1.5 transition-all">
              <span className="text-[#FFD700] text-sm font-bold">Lv.{xp.level}</span>
              <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full transition-all" style={{ width: `${(xp.xp / xp.xpToNext) * 100}%` }} />
              </div>
              <span className="text-xs text-white/50">{xp.streak > 1 ? `${xp.streak}🔥` : ''}</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden w-10 h-10 rounded-lg bg-white/5 border border-[#FFD700]/20 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#FFD700]">
              {mobileMenuOpen ? (
                <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
              ) : (
                <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:block border-t border-white/5`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <TabIcon name={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderModule()}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 py-6 text-center text-white/30 text-sm">
        <p>&copy; 2024 BallKnw - Ultimate Football Hub</p>
      </footer>
    </div>
  );
}

function TabIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    'layout-dashboard': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
    'bar-chart-3': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>,
    'clipboard-list': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>,
    'trending-up': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    'newspaper': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" /></svg>,
    'users': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    'crown': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>,
  };
  return icons[name] || null;
}

export default App;
