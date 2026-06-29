import { useState, useCallback } from 'react';
import { DRAFT_POOL } from '@/data/footballData';
import type { Player } from '@/types/football';

interface Props {
  addXP: (amount: number, achievementId?: string) => void;
}

interface DraftState {
  status: 'setup' | 'drafting' | 'complete';
  numPlayers: number;
  participants: string[];
  currentParticipant: number;
  squads: Record<string, Player[]>;
  availablePool: Player[];
  currentPick: number;
  direction: 1 | -1;
  draftLog: string[];
}

export default function DraftRoom({ addXP: _addXP }: Props) {
  const [draft, setDraft] = useState<DraftState>({
    status: 'setup',
    numPlayers: 2,
    participants: ['You', 'Bot'],
    currentParticipant: 0,
    squads: {},
    availablePool: [],
    currentPick: 0,
    direction: 1,
    draftLog: [],
  });
  const [participantNames, setParticipantNames] = useState(['You', 'Bot']);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  const startDraft = () => {
    const shuffled = [...DRAFT_POOL].sort(() => Math.random() - 0.5);
    const squads: Record<string, Player[]> = {};
    participantNames.forEach(name => squads[name] = []);
    setDraft({
      status: 'drafting',
      numPlayers: participantNames.length,
      participants: participantNames,
      currentParticipant: 0,
      squads,
      availablePool: shuffled,
      currentPick: 1,
      direction: 1,
      draftLog: [`Draft started! ${participantNames[0]} picks first.`],
    });
  };

  const pickPlayer = useCallback((player: Player) => {
    setDraft(prev => {
      const currentName = prev.participants[prev.currentParticipant];
      const newSquads = { ...prev.squads, [currentName]: [...(prev.squads[currentName] || []), player] };
      const newPool = prev.availablePool.filter(p => p.id !== player.id);
      const nextIdx = prev.currentParticipant + prev.direction;
      let newDirection = prev.direction;
      let newCurrent = nextIdx;

      // Snake draft logic
      if (nextIdx >= prev.numPlayers) {
        newCurrent = prev.numPlayers - 1;
        newDirection = -1;
      } else if (nextIdx < 0) {
        newCurrent = 0;
        newDirection = 1;
      }

      const isComplete = Object.values(newSquads).every(squad => squad.length >= 11);
      const newLog = [...prev.draftLog, `Pick #${prev.currentPick}: ${currentName} selected ${player.name} (${player.rating})`];

      if (isComplete) {
        return { ...prev, status: 'complete' as const, squads: newSquads, availablePool: newPool, draftLog: newLog };
      }

      // Bot pick
      if (isComplete === false && prev.participants[newCurrent] === 'Bot' && newPool.length > 0) {
        const botPick = newPool[0]; // Simple bot: picks highest rated available
        const botSquad = [...(newSquads['Bot'] || []), botPick];
        const afterBotPool = newPool.filter(p => p.id !== botPick.id);
        const afterBotIdx = newCurrent + newDirection;
        let afterBotDir = newDirection;
        let afterBotCurrent = afterBotIdx;
        if (afterBotIdx >= prev.numPlayers) {
          afterBotCurrent = prev.numPlayers - 1;
          afterBotDir = -1;
        } else if (afterBotIdx < 0) {
          afterBotCurrent = 0;
          afterBotDir = 1;
        }
        const afterBotLog = [...newLog, `Pick #${prev.currentPick + 1}: Bot selected ${botPick.name} (${botPick.rating})`];
        return {
          ...prev,
          squads: { ...newSquads, 'Bot': botSquad },
          availablePool: afterBotPool,
          currentParticipant: afterBotCurrent,
          direction: afterBotDir,
          currentPick: prev.currentPick + 2,
          draftLog: afterBotLog,
        };
      }

      return {
        ...prev,
        squads: newSquads,
        availablePool: newPool,
        currentParticipant: newCurrent,
        direction: newDirection,
        currentPick: prev.currentPick + 1,
        draftLog: newLog,
      };
    });
    setShowPlayerPicker(false);
  }, []);

  const totalPicks = draft.currentPick;
  const currentSquad = draft.participants[draft.currentParticipant] ? draft.squads[draft.participants[draft.currentParticipant]] || [] : [];

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
          Draft Room
        </h2>

        {draft.status === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Set up your draft. Snake draft format - 11 players per squad.</p>
            <div>
              <label className="text-xs text-white/50 mb-2 block">Participants</label>
              <div className="space-y-2">
                {participantNames.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={name} onChange={e => {
                      const newNames = [...participantNames];
                      newNames[i] = e.target.value;
                      setParticipantNames(newNames);
                    }} className="flex-1" />
                    {participantNames.length > 2 && (
                      <button onClick={() => setParticipantNames(prev => prev.filter((_, idx) => idx !== i))}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              {participantNames.length < 6 && (
                <button onClick={() => setParticipantNames(prev => [...prev, `Player ${prev.length + 1}`])}
                  className="mt-2 text-xs text-[#FFD700] hover:underline">+ Add participant</button>
              )}
            </div>
            <button onClick={startDraft} className="btn-gold w-full">Start Draft</button>
          </div>
        )}

        {draft.status === 'drafting' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Pick #{totalPicks}</span>
              <span className="text-sm font-bold text-[#FFD700]">{draft.participants[draft.currentParticipant]}&apos;s turn</span>
              <span className="text-sm text-white/60">{currentSquad.length}/11</span>
            </div>

            <div className="w-full h-1 bg-white/10 rounded-full">
              <div className="h-full bg-[#FFD700] rounded-full" style={{ width: `${(totalPicks / (participantNames.length * 11)) * 100}%` }} />
            </div>

            {/* Current Squads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.participants.map(name => (
                <div key={name} className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${name === draft.participants[draft.currentParticipant] ? 'text-[#FFD700]' : 'text-white'}`}>
                      {name} {name === draft.participants[draft.currentParticipant] && '◀'}
                    </span>
                    <span className="text-xs text-white/40">{(draft.squads[name] || []).length}/11</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(draft.squads[name] || []).map((p, i) => (
                      <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${p.rating >= 90 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/60'}`}>
                        {p.rating} {p.position}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] text-white/30">
                    Avg: {(draft.squads[name] || []).length > 0 ? ((draft.squads[name] || []).reduce((a, b) => a + b.rating, 0) / (draft.squads[name] || []).length).toFixed(1) : '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Pick Button */}
            <button onClick={() => setShowPlayerPicker(true)} className="btn-gold w-full">
              Select Player
            </button>

            {/* Draft Log */}
            <div className="bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto">
              {draft.draftLog.slice(-10).map((log, i) => (
                <div key={i} className="text-[10px] text-white/40">{log}</div>
              ))}
            </div>
          </div>
        )}

        {draft.status === 'complete' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-4">Draft Complete!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
              {draft.participants.map(name => {
                const squad = draft.squads[name] || [];
                const avg = squad.length > 0 ? (squad.reduce((a, b) => a + b.rating, 0) / squad.length).toFixed(1) : '0';
                return (
                  <div key={name} className="glass-card p-4">
                    <h4 className="font-bold text-white mb-2">{name}&apos;s Squad</h4>
                    <div className="text-xs text-[#FFD700] mb-2">Average Rating: {avg}</div>
                    <div className="space-y-1">
                      {squad.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-white/70">{p.name}</span>
                          <span className="text-white/40">{p.position} · {p.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => { setDraft({ status: 'setup', numPlayers: 2, participants: ['You', 'Bot'], currentParticipant: 0, squads: {}, availablePool: [], currentPick: 0, direction: 1, draftLog: [] }); setParticipantNames(['You', 'Bot']); }} className="btn-gold px-6 py-2">
              New Draft
            </button>
          </div>
        )}
      </div>

      {/* Player Picker Modal */}
      {showPlayerPicker && draft.status === 'drafting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlayerPicker(false)}>
          <div className="glass-card max-w-lg w-full max-h-[70vh] overflow-hidden flex flex-col animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Pick a Player</h3>
              <button onClick={() => setShowPlayerPicker(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {draft.availablePool.slice(0, 80).map(player => (
                <button key={player.id} onClick={() => pickPlayer(player)}
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
