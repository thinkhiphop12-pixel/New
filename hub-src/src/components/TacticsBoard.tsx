import { useState, useRef } from 'react';
import { Stage, Layer, Circle, Line, Text, Rect } from 'react-konva';
import { PLAYERS_DB, getFormationPositions } from '@/data/footballData';
import type { TacticPlayer } from '@/types/football';

interface Props {
  addXP: (amount: number, achievementId?: string) => void;
}

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2'];
const PITCH_W = 600;
const PITCH_H = 450;

export default function TacticsBoard({ addXP }: Props) {
  const [formation, setFormation] = useState('4-4-2');
  const [players, setPlayers] = useState<TacticPlayer[]>(() =>
    getFormationPositions('4-4-2').map((p, i) => ({
      id: `tp${i}`,
      x: (p.x / 100) * PITCH_W,
      y: (p.y / 100) * PITCH_H,
      number: i + 1,
      position: p.pos,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<any>(null);
  const [saved, setSaved] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<Record<string, typeof PLAYERS_DB[0]>>({});

  const handleDragStart = () => setDragging(true);
  const handleDragEnd = (e: any, id: string) => {
    setDragging(false);
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, x: e.target.x(), y: e.target.y() } : p));
  };

  const handleFormationChange = (f: string) => {
    setFormation(f);
    const positions = getFormationPositions(f);
    setPlayers(positions.map((p, i) => {
      return {
        id: `tp${i}`,
        x: (p.x / 100) * PITCH_W,
        y: (p.y / 100) * PITCH_H,
        number: i + 1,
        position: p.pos,
      };
    }));
  };

  const saveTactics = () => {
    const data = { formation, players, assignedPlayers };
    localStorage.setItem('ballknw_tactics', JSON.stringify(data));
    setSaved(true);
    addXP(50, 'a2');
    setTimeout(() => setSaved(false), 2000);
  };

  const loadTactics = () => {
    const saved = localStorage.getItem('ballknw_tactics');
    if (saved) {
      const data = JSON.parse(saved);
      setFormation(data.formation);
      setPlayers(data.players);
      setAssignedPlayers(data.assignedPlayers || {});
    }
  };

  const clearTactics = () => {
    handleFormationChange(formation);
    setAssignedPlayers({});
  };

  const openPlayerPicker = (slotIdx: number) => {
    setPickerSlot(slotIdx);
    setShowPlayerPicker(true);
  };

  const assignPlayer = (player: typeof PLAYERS_DB[0]) => {
    if (pickerSlot !== null) {
      setAssignedPlayers(prev => ({ ...prev, [`tp${pickerSlot}`]: player }));
      setShowPlayerPicker(false);
      setPickerSlot(null);
    }
  };

  // Draw pitch
  const drawPitch = () => (
    <>
      {/* Grass */}
      <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="#1a5f3f" />
      {/* Stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect key={i} x={0} y={i * (PITCH_H / 8)} width={PITCH_W} height={PITCH_H / 16} fill="rgba(255,255,255,0.03)" />
      ))}
      {/* Border */}
      <Rect x={10} y={10} width={PITCH_W - 20} height={PITCH_H - 20} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      {/* Center line */}
      <Line points={[10, PITCH_H / 2, PITCH_W - 10, PITCH_H / 2]} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      {/* Center circle */}
      <Circle x={PITCH_W / 2} y={PITCH_H / 2} radius={50} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Circle x={PITCH_W / 2} y={PITCH_H / 2} radius={4} fill="rgba(255,255,255,0.4)" />
      {/* Top penalty area */}
      <Rect x={PITCH_W / 2 - 80} y={10} width={160} height={60} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Rect x={PITCH_W / 2 - 40} y={10} width={80} height={25} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      {/* Bottom penalty area */}
      <Rect x={PITCH_W / 2 - 80} y={PITCH_H - 70} width={160} height={60} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      <Rect x={PITCH_W / 2 - 40} y={PITCH_H - 35} width={80} height={25} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
      {/* Top goal */}
      <Rect x={PITCH_W / 2 - 30} y={5} width={60} height={8} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* Bottom goal */}
      <Rect x={PITCH_W / 2 - 30} y={PITCH_H - 13} width={60} height={8} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* Corner arcs */}
      <Line points={[10, 20, 20, 10]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <Line points={[PITCH_W - 10, 20, PITCH_W - 20, 10]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <Line points={[10, PITCH_H - 20, 20, PITCH_H - 10]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <Line points={[PITCH_W - 10, PITCH_H - 20, PITCH_W - 20, PITCH_H - 10]} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
    </>
  );

  const positionColors: Record<string, string> = {
    GK: '#FF6B6B', CB: '#4ECDC4', LB: '#45B7D1', RB: '#45B7D1',
    CM: '#96CEB4', CDM: '#88D8B0', CAM: '#FFEAA7',
    LM: '#DDA0DD', RM: '#DDA0DD', LW: '#FFB347', RW: '#FFB347',
    ST: '#FFD700', CF: '#FFD700', LWB: '#98D8C8', RWB: '#98D8C8',
  };

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="glass-card p-4">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /></svg>
          Tactics Board
        </h2>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1">
            {FORMATIONS.map(f => (
              <button key={f} onClick={() => handleFormationChange(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formation === f ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/50 border border-transparent'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={saveTactics} className="btn-gold text-xs">Save</button>
            <button onClick={loadTactics} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-all">Load</button>
            <button onClick={clearTactics} className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-lg text-xs text-white transition-all">Clear</button>
          </div>
        </div>

        {saved && <div className="mb-3 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 text-center">Tactics saved! +50 XP</div>}

        {/* Pitch & Players */}
        <div className="overflow-x-auto">
          <div className="pitch-bg rounded-xl border border-white/20 inline-block" style={{ minWidth: PITCH_W }}>
            <Stage width={PITCH_W} height={PITCH_H} ref={stageRef}>
              <Layer>{drawPitch()}</Layer>
              <Layer>
                {players.map((player, i) => {
                  const isSelected = selectedId === player.id;
                  const color = positionColors[player.position] || '#FFD700';
                  const assigned = assignedPlayers[player.id];
                  return (
                    <>
                      <Circle
                        key={player.id}
                        x={player.x}
                        y={player.y}
                        radius={18}
                        fill={isSelected ? '#FFD700' : color}
                        stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.5)'}
                        strokeWidth={isSelected ? 3 : 2}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={e => handleDragEnd(e, player.id)}
                        onClick={() => { if (!dragging) { setSelectedId(player.id); openPlayerPicker(i); } }}
                        onTap={() => { setSelectedId(player.id); openPlayerPicker(i); }}
                        shadowColor={color}
                        shadowBlur={10}
                        shadowOpacity={0.5}
                      />
                      <Text
                        x={player.x - 20}
                        y={player.y - 6}
                        text={assigned ? assigned.rating.toString() : player.position}
                        fontSize={10}
                        fontStyle="bold"
                        fill="white"
                        align="center"
                        width={40}
                      />
                      {assigned && (
                        <Text
                          x={player.x - 25}
                          y={player.y + 22}
                          text={assigned.name.split(' ').pop() || ''}
                          fontSize={8}
                          fill="rgba(255,255,255,0.8)"
                          align="center"
                          width={50}
                        />
                      )}
                    </>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Position Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(positionColors).map(([pos, color]) => (
            <div key={pos} className="flex items-center gap-1 text-[10px] text-white/50">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              {pos}
            </div>
          ))}
        </div>

        {/* Selected Player Info */}
        {selectedId && assignedPlayers[selectedId] && (
          <div className="mt-4 bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFD700]/20 flex items-center justify-center text-[#FFD700] font-black">
                {assignedPlayers[selectedId].rating}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{assignedPlayers[selectedId].name}</div>
                <div className="text-xs text-white/50">{assignedPlayers[selectedId].position} · {assignedPlayers[selectedId].club}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Picker Modal */}
      {showPlayerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayerPicker(false)}>
          <div className="glass-card max-w-lg w-full max-h-[70vh] overflow-hidden flex flex-col animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Assign Player</h3>
              <button onClick={() => setShowPlayerPicker(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {PLAYERS_DB.slice(0, 60).map(player => (
                <button key={player.id} onClick={() => assignPlayer(player)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all text-left ${
                    player.rating >= 90 ? 'border border-[#FFD700]/30' : ''
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    player.rating >= 90 ? 'bg-[#FFD700]/20 text-[#FFD700]' : player.rating >= 80 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-700/20 text-orange-400'
                  }`}>
                    {player.rating}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{player.name}</div>
                    <div className="text-[10px] text-white/40">{player.position} · {player.club}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
