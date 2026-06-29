import { useState } from 'react';
import { CLUBS_DB, NATIONS_DB } from '@/data/footballData';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function StatsCompare() {
  const [mode, setMode] = useState<'club' | 'nation'>('club');
  const [leftId, setLeftId] = useState(CLUBS_DB[0].id);
  const [rightId, setRightId] = useState(CLUBS_DB[11].id);

  const data = mode === 'club' ? CLUBS_DB : NATIONS_DB;
  const left = data.find(d => d.id === leftId) || data[0];
  const right = data.find(d => d.id === rightId) || data[1];

  const radarData = {
    labels: ['Attack', 'Midfield', 'Defense', 'Possession', 'Clean Sheets'],
    datasets: [
      {
        label: left.name,
        data: [left.attack, left.midfield, left.defense, left.possession, left.cleanSheets * 4],
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: '#FFD700',
        borderWidth: 2,
      },
      {
        label: right.name,
        data: [right.attack, right.midfield, right.defense, right.possession, right.cleanSheets * 4],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        angleLines: { color: 'rgba(255,255,255,0.1)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        pointLabels: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } },
        ticks: { display: false, max: 100 },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      legend: { labels: { color: 'white' } },
    },
  };

  const stats = [
    { label: 'Overall Rating', leftVal: left.rating, rightVal: right.rating, max: 100 },
    { label: 'Goals Scored', leftVal: left.goals, rightVal: right.goals, max: 100 },
    { label: 'Goals Conceded', leftVal: left.conceded, rightVal: right.conceded, max: 60, lowerIsBetter: true },
    { label: 'Possession %', leftVal: left.possession, rightVal: right.possession, max: 70 },
    { label: 'Clean Sheets', leftVal: left.cleanSheets, rightVal: right.cleanSheets, max: 25 },
    { label: 'Wins', leftVal: left.wins, rightVal: right.wins, max: 35 },
    { label: 'Draws', leftVal: (left as any).draws, rightVal: (right as any).draws, max: 15 },
    { label: 'Losses', leftVal: (left as any).losses, rightVal: (right as any).losses, max: 15, lowerIsBetter: true },
  ];

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
          Stats Compare
        </h2>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('club'); setLeftId(CLUBS_DB[0].id); setRightId(CLUBS_DB[11].id); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'club' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50 border border-transparent'}`}>
            Clubs
          </button>
          <button onClick={() => { setMode('nation'); setLeftId(NATIONS_DB[0].id); setRightId(NATIONS_DB[1].id); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'nation' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50 border border-transparent'}`}>
            Nations
          </button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Select {mode === 'club' ? 'Club' : 'Nation'} A</label>
            <select value={leftId} onChange={e => setLeftId(e.target.value)} className="w-full">
              {data.map(d => <option key={d.id} value={d.id}>{d.name} ({mode === 'club' ? (d as any).league : 'Group ' + (d as any).group})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Select {mode === 'club' ? 'Club' : 'Nation'} B</label>
            <select value={rightId} onChange={e => setRightId(e.target.value)} className="w-full">
              {data.map(d => <option key={d.id} value={d.id}>{d.name} ({mode === 'club' ? (d as any).league : 'Group ' + (d as any).group})</option>)}
            </select>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="max-w-md mx-auto mb-6">
          <Radar data={radarData} options={radarOptions} />
        </div>

        {/* Comparison Bars */}
        <div className="space-y-3">
          {stats.map(stat => {
            const leftPct = Math.min((stat.leftVal / stat.max) * 100, 100);
            const rightPct = Math.min((stat.rightVal / stat.max) * 100, 100);
            const leftBetter = stat.lowerIsBetter ? stat.leftVal < stat.rightVal : stat.leftVal > stat.rightVal;
            return (
              <div key={stat.label} className="bg-white/5 rounded-lg p-3">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{stat.label}</span>
                  <span>{stat.leftVal} vs {stat.rightVal}</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${leftPct}%`, background: leftBetter ? '#FFD700' : 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${rightPct}%`, background: !leftBetter ? '#FFD700' : 'rgba(255,255,255,0.3)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
