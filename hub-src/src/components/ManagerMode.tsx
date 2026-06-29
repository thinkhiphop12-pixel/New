import { useState, useRef, useEffect, useCallback } from 'react';
import { PLAYERS_DB, CLUBS_DB, NATIONS_DB, getFormationPositions } from '@/data/footballData';
import { Stage, Layer, Circle, Line, Rect, Text as KonvaText } from 'react-konva';
import type { Player } from '@/types/football';

interface Props {
  addXP: (amount: number, achievementId?: string) => void;
}

interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeRating: number;
  awayRating: number;
  injuries: string[];
  scorers: string[];
}

interface LeagueRecord {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

const PITCH_W = 500;
const PITCH_H = 360;
const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2'];
const MENTALITIES = ['Ultra Defensive', 'Defensive', 'Balanced', 'Attacking', 'Ultra Attacking'];

function simulateMatch(homeSquad: Player[], awaySquad: Player[], homeName: string, awayName: string): MatchResult {
  const homeRating = homeSquad.reduce((a, b) => a + b.rating, 0) / homeSquad.length;
  const awayRating = awaySquad.reduce((a, b) => a + b.rating, 0) / awaySquad.length;
  const homeGoals = Math.floor((homeRating / 100) * 2.5 + (Math.random() * 1.5));
  const awayGoals = Math.floor((awayRating / 100) * 2.5 + (Math.random() * 1.5));
  const injuries: string[] = [];
  const scorers: string[] = [];

  // Injury check (15% chance per match)
  if (Math.random() < 0.15 && homeSquad.length > 0) {
    const injured = homeSquad[Math.floor(Math.random() * homeSquad.length)];
    injuries.push(`${injured.name} (${homeName})`);
  }
  if (Math.random() < 0.15 && awaySquad.length > 0) {
    const injured = awaySquad[Math.floor(Math.random() * awaySquad.length)];
    injuries.push(`${injured.name} (${awayName})`);
  }

  // Generate scorers
  for (let i = 0; i < homeGoals; i++) {
    const scorer = homeSquad[Math.floor(Math.random() * homeSquad.length)];
    scorers.push(`${scorer.name} (${homeName})`);
  }
  for (let i = 0; i < awayGoals; i++) {
    const scorer = awaySquad[Math.floor(Math.random() * awaySquad.length)];
    scorers.push(`${scorer.name} (${awayName})`);
  }

  return { homeTeam: homeName, awayTeam: awayName, homeGoals, awayGoals, homeRating, awayRating, injuries, scorers };
}

export default function ManagerMode({ addXP }: Props) {
  const [managerTab, setManagerTab] = useState<'squad' | 'calendar' | 'tactics' | 'transfers' | 'league'>('squad');
  const [mode, setMode] = useState<'club' | 'national'>('club');
  const [selectedTeam, setSelectedTeam] = useState(CLUBS_DB[0].id);
  const [formation, setFormation] = useState('4-3-3');
  const [mentality, setMentality] = useState('Balanced');
  const [budget, setBudget] = useState(100000000);
  const [squad, setSquad] = useState<Player[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [ballPos, setBallPos] = useState({ x: PITCH_W / 2, y: PITCH_H / 2 });
  const [season, setSeason] = useState(1);
  const [fixtures, setFixtures] = useState<{ home: string; away: string; played: boolean; result?: MatchResult }[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueRecord[]>([]);
  const [fixtureIndex, setFixtureIndex] = useState(0);
  const [searchPlayer, setSearchPlayer] = useState('');

  const animationRef = useRef<number | null>(null);

  const teams = mode === 'club' ? CLUBS_DB : NATIONS_DB;
  const teamData = teams.find(t => t.id === selectedTeam) || teams[0];

  // Initialize squad from players
  useEffect(() => {
    const teamPlayers = PLAYERS_DB.filter(p =>
      mode === 'club' ? p.club === teamData.name : p.nation === teamData.name
    ).slice(0, 18);
    if (teamPlayers.length === 0) {
      // Fallback: assign random players
      const shuffled = [...PLAYERS_DB].sort(() => Math.random() - 0.5);
      setSquad(shuffled.slice(0, 18));
    } else {
      setSquad(teamPlayers);
    }
  }, [selectedTeam, mode]);

  // Generate fixtures
  useEffect(() => {
    const otherTeams = teams.filter(t => t.id !== selectedTeam).slice(0, 7);
    const sched = otherTeams.map(t => ({
      home: teamData.name,
      away: t.name,
      played: false,
    }));
    const away = otherTeams.map(t => ({
      home: t.name,
      away: teamData.name,
      played: false,
    }));
    setFixtures([...sched, ...away]);
    setFixtureIndex(0);
    setLeagueTable(
      [teamData, ...otherTeams].map(t => ({ team: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }))
    );
  }, [selectedTeam, mode, season]);

  const handleSimulateMatch = useCallback(() => {
    if (fixtureIndex >= fixtures.length) return;
    setSimulating(true);
    setMatchResult(null);

    const fix = fixtures[fixtureIndex];
    const isHome = fix.home === teamData.name;
    const mySquad = squad.filter(p => p.fitness > 30).slice(0, 11);
    if (mySquad.length < 11) {
      // Fill with squad players
      while (mySquad.length < 11 && mySquad.length < squad.length) mySquad.push(squad[mySquad.length]);
    }
    const oppSquad = [...PLAYERS_DB].sort(() => Math.random() - 0.5).slice(0, 11);

    const result = simulateMatch(
      isHome ? mySquad : oppSquad,
      isHome ? oppSquad : mySquad,
      fix.home,
      fix.away
    );

    // Animate ball
    let frame = 0;
    const animate = () => {
      frame++;
      const x = Math.random() * (PITCH_W - 40) + 20;
      const y = Math.random() * (PITCH_H - 40) + 20;
      setBallPos({ x, y });
      if (frame < 30) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSimulating(false);
        setMatchResult(result);
        // Update league table
        setLeagueTable(prev => prev.map(rec => {
          if (rec.team === result.homeTeam) {
            return {
              ...rec,
              played: rec.played + 1,
              won: rec.won + (result.homeGoals > result.awayGoals ? 1 : 0),
              drawn: rec.drawn + (result.homeGoals === result.awayGoals ? 1 : 0),
              lost: rec.lost + (result.homeGoals < result.awayGoals ? 1 : 0),
              gf: rec.gf + result.homeGoals,
              ga: rec.ga + result.awayGoals,
              points: rec.points + (result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0),
            };
          }
          if (rec.team === result.awayTeam) {
            return {
              ...rec,
              played: rec.played + 1,
              won: rec.won + (result.awayGoals > result.homeGoals ? 1 : 0),
              drawn: rec.drawn + (result.awayGoals === result.homeGoals ? 1 : 0),
              lost: rec.lost + (result.awayGoals < result.homeGoals ? 1 : 0),
              gf: rec.gf + result.awayGoals,
              ga: rec.ga + result.homeGoals,
              points: rec.points + (result.awayGoals > result.homeGoals ? 3 : result.awayGoals === result.homeGoals ? 1 : 0),
            };
          }
          return rec;
        }));
        setFixtures(prev => prev.map((f, i) => i === fixtureIndex ? { ...f, played: true, result } : f));
        setFixtureIndex(prev => prev + 1);
        addXP(50, 'a5');
      }
    };
    animate();
  }, [fixtureIndex, fixtures, squad, teamData, addXP]);

  const buyPlayer = (player: Player) => {
    if (budget >= player.value && squad.length < 23) {
      setBudget(prev => prev - player.value);
      setSquad(prev => [...prev, { ...player, fitness: 100 }]);
    }
  };

  const sellPlayer = (player: Player) => {
    setBudget(prev => prev + Math.floor(player.value * 0.7));
    setSquad(prev => prev.filter(p => p.id !== player.id));
  };

  const randomPlayersForTransfer = [...PLAYERS_DB]
    .filter(p => !squad.find(s => s.id === p.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);

  const sortedTable = [...leagueTable].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  // Pitch drawing
  const drawPitch = () => (
    <>
      <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="#1a5f3f" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect key={i} x={0} y={i * (PITCH_H / 8)} width={PITCH_W} height={PITCH_H / 16} fill="rgba(255,255,255,0.03)" />
      ))}
      <Rect x={8} y={8} width={PITCH_W - 16} height={PITCH_H - 16} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Line points={[8, PITCH_H / 2, PITCH_W - 8, PITCH_H / 2]} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Circle x={PITCH_W / 2} y={PITCH_H / 2} radius={40} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Circle x={PITCH_W / 2} y={PITCH_H / 2} radius={3} fill="rgba(255,255,255,0.4)" />
      <Rect x={PITCH_W / 2 - 60} y={8} width={120} height={50} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Rect x={PITCH_W / 2 - 60} y={PITCH_H - 58} width={120} height={50} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Rect x={PITCH_W / 2 - 30} y={4} width={60} height={6} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <Rect x={PITCH_W / 2 - 30} y={PITCH_H - 10} width={60} height={6} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
    </>
  );

  // Squad positions for visual
  const squadPositions = getFormationPositions(formation);
  const startingXI = squad.slice(0, 11);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>
            Manager Mode
          </h2>
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setMode('club')} className={`px-3 py-1 rounded text-xs font-medium ${mode === 'club' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>Club</button>
            <button onClick={() => setMode('national')} className={`px-3 py-1 rounded text-xs font-medium ${mode === 'national' ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>National</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="text-sm py-1">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="text-sm text-[#FFD700] font-medium">${(budget / 1000000).toFixed(0)}M</div>
          <div className="text-xs text-white/40">Squad: {squad.length}/23</div>
          <div className="text-xs text-white/40">Season {season}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {(['squad', 'calendar', 'tactics', 'transfers', 'league'] as const).map(tab => (
          <button key={tab} onClick={() => setManagerTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${managerTab === tab ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50 border border-transparent'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Squad Tab */}
      {managerTab === 'squad' && (
        <div className="space-y-4">
          {/* Pitch View */}
          <div className="glass-card p-4 overflow-x-auto">
            <div className="pitch-bg rounded-xl border border-white/20 inline-block" style={{ minWidth: PITCH_W }}>
              <Stage width={PITCH_W} height={PITCH_H}>
                <Layer>{drawPitch()}</Layer>
                <Layer>
                  {startingXI.map((player, i) => {
                    const pos = squadPositions[i] || { x: 50, y: 50 };
                    const px = (pos.x / 100) * PITCH_W;
                    const py = (pos.y / 100) * PITCH_H;
                    const color = player.rating >= 90 ? '#FFD700' : player.rating >= 80 ? '#C0C0C0' : '#CD7F32';
                    return (
                      <>
                        <Circle key={player.id} x={px} y={py} radius={16} fill={color} stroke="white" strokeWidth={2} shadowColor={color} shadowBlur={8} />
                        <KonvaText x={px - 12} y={py - 5} text={player.position} fontSize={8} fontStyle="bold" fill="#0D1B2A" align="center" width={24} />
                      </>
                    );
                  })}
                  {simulating && (
                    <Circle x={ballPos.x} y={ballPos.y} radius={6} fill="white" stroke="#FFD700" strokeWidth={2} shadowColor="#FFD700" shadowBlur={10} />
                  )}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Player Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {squad.map(player => {
              const isGold = player.rating >= 90;
              const isSilver = player.rating >= 80;
              return (
                <div key={player.id} className={`glass-card p-3 ${isGold ? 'player-card-gold' : isSilver ? 'player-card-silver' : 'player-card-bronze'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isGold ? 'bg-[#FFD700]/20 text-[#FFD700]' : isSilver ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'}`}>
                      {player.rating}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{player.name}</div>
                      <div className="text-[9px] text-white/40">{player.position}</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${player.fitness}%`, background: player.fitness > 70 ? '#4ade80' : player.fitness > 40 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                  <div className="text-[9px] text-white/30">Fitness: {player.fitness}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {managerTab === 'calendar' && (
        <div className="glass-card p-4 space-y-4">
          <h3 className="text-lg font-bold text-white">Fixtures</h3>
          <div className="space-y-2">
            {fixtures.map((fix, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${i === fixtureIndex ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' : fix.played ? 'bg-white/5 opacity-60' : 'bg-white/5'}`}>
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-xs ${fix.home === teamData.name ? 'text-[#FFD700] font-semibold' : 'text-white/60'}`}>{fix.home}</span>
                  {fix.played && fix.result ? (
                    <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded">{fix.result.homeGoals} - {fix.result.awayGoals}</span>
                  ) : (
                    <span className="text-xs text-white/30">vs</span>
                  )}
                  <span className={`text-xs ${fix.away === teamData.name ? 'text-[#FFD700] font-semibold' : 'text-white/60'}`}>{fix.away}</span>
                </div>
                {fix.played && <span className="text-[10px] text-green-400">Done</span>}
                {i === fixtureIndex && <span className="text-[10px] text-[#FFD700]">Next</span>}
              </div>
            ))}
          </div>

          {fixtureIndex < fixtures.length ? (
            <div>
              <button onClick={handleSimulateMatch} disabled={simulating} className="btn-gold w-full disabled:opacity-50">
                {simulating ? 'Simulating...' : `Simulate vs ${fixtures[fixtureIndex].home === teamData.name ? fixtures[fixtureIndex].away : fixtures[fixtureIndex].home}`}
              </button>
              {matchResult && (
                <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-1">
                  <div className="text-center font-bold text-white">{matchResult.homeTeam} {matchResult.homeGoals} - {matchResult.awayGoals} {matchResult.awayTeam}</div>
                  {matchResult.scorers.length > 0 && (
                    <div className="text-[10px] text-white/50">
                      Scorers: {matchResult.scorers.join(', ')}
                    </div>
                  )}
                  {matchResult.injuries.length > 0 && (
                    <div className="text-[10px] text-red-400">
                      Injuries: {matchResult.injuries.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-lg font-bold text-[#FFD700] mb-2">Season {season} Complete!</div>
              <button onClick={() => { setSeason(prev => prev + 1); setFixtureIndex(0); setMatchResult(null); }} className="btn-gold">
                Start Season {season + 1}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tactics Tab */}
      {managerTab === 'tactics' && (
        <div className="glass-card p-4 space-y-4">
          <h3 className="text-lg font-bold text-white">Tactics</h3>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Formation</label>
            <div className="flex gap-2">
              {FORMATIONS.map(f => (
                <button key={f} onClick={() => setFormation(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${formation === f ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Mentality</label>
            <div className="flex gap-2 flex-wrap">
              {MENTALITIES.map(m => (
                <button key={m} onClick={() => setMentality(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${mentality === m ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-sm text-white/60">Current Setup: <span className="text-[#FFD700] font-semibold">{formation}</span> with <span className="text-[#FFD700] font-semibold">{mentality}</span> mentality</div>
            <div className="text-xs text-white/40 mt-1">
              {mentality === 'Ultra Defensive' && 'Focus on keeping a clean sheet. Low line, compact defense.'}
              {mentality === 'Defensive' && 'Solid defensive structure with counter-attack opportunities.'}
              {mentality === 'Balanced' && 'Equal emphasis on attack and defense. Standard positioning.'}
              {mentality === 'Attacking' && 'Push for goals. Higher line, more players in attack.'}
              {mentality === 'Ultra Attacking' && 'All-out attack. High press, maximum players forward.'}
            </div>
          </div>
        </div>
      )}

      {/* Transfers Tab */}
      {managerTab === 'transfers' && (
        <div className="glass-card p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Transfers</h3>
            <span className="text-sm text-[#FFD700]">Budget: ${(budget / 1000000).toFixed(0)}M</span>
          </div>
          <input placeholder="Search players..." value={searchPlayer} onChange={e => setSearchPlayer(e.target.value)} className="w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {randomPlayersForTransfer
              .filter(p => !searchPlayer || p.name.toLowerCase().includes(searchPlayer.toLowerCase()))
              .map(player => (
                <div key={player.id} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${player.rating >= 90 ? 'bg-[#FFD700]/20 text-[#FFD700]' : player.rating >= 80 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'}`}>
                    {player.rating}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{player.name}</div>
                    <div className="text-[10px] text-white/40">{player.position} · {player.club}</div>
                    <div className="text-xs text-[#FFD700]">${(player.value / 1000000).toFixed(0)}M</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => buyPlayer(player)} disabled={budget < player.value || squad.length >= 23} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-[10px] disabled:opacity-30">Buy</button>
                  </div>
                </div>
              ))}
          </div>
          <h3 className="text-sm font-semibold text-white mt-4">Sell Players</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {squad.map(player => (
              <div key={player.id} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${player.rating >= 90 ? 'bg-[#FFD700]/20 text-[#FFD700]' : player.rating >= 80 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'}`}>
                  {player.rating}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{player.name}</div>
                  <div className="text-[10px] text-[#FFD700]">Sell: ${(player.value * 0.7 / 1000000).toFixed(0)}M</div>
                </div>
                <button onClick={() => sellPlayer(player)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px]">Sell</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* League Table Tab */}
      {managerTab === 'league' && (
        <div className="glass-card p-4">
          <h3 className="text-lg font-bold text-white mb-3">League Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-left py-2 px-1">Team</th>
                  <th className="py-2 px-1">P</th>
                  <th className="py-2 px-1">W</th>
                  <th className="py-2 px-1">D</th>
                  <th className="py-2 px-1">L</th>
                  <th className="py-2 px-1">GF</th>
                  <th className="py-2 px-1">GA</th>
                  <th className="py-2 px-1">GD</th>
                  <th className="py-2 px-1 text-[#FFD700]">Pts</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map((rec, i) => (
                  <tr key={rec.team} className={`border-b border-white/5 ${rec.team === teamData.name ? 'bg-[#FFD700]/5' : ''}`}>
                    <td className="py-2 px-1 text-white/40">{i + 1}</td>
                    <td className="py-2 px-1 text-white font-medium">{rec.team}</td>
                    <td className="py-2 px-1 text-center text-white/60">{rec.played}</td>
                    <td className="py-2 px-1 text-center text-green-400">{rec.won}</td>
                    <td className="py-2 px-1 text-center text-yellow-400">{rec.drawn}</td>
                    <td className="py-2 px-1 text-center text-red-400">{rec.lost}</td>
                    <td className="py-2 px-1 text-center text-white/60">{rec.gf}</td>
                    <td className="py-2 px-1 text-center text-white/60">{rec.ga}</td>
                    <td className="py-2 px-1 text-center text-white/60">{rec.gf - rec.ga}</td>
                    <td className="py-2 px-1 text-center font-bold text-[#FFD700]">{rec.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
