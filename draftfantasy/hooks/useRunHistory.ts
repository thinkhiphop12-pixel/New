import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Run, Squad } from '@/engine/types';
import { getAnonymousId } from '@/lib/anonymousId';
import { clearLocalRuns, loadLocalRuns, saveLocalRun } from '@/lib/localRuns';
import { buildPlayerIndex, rowToRun, runToInsert, type RunRow } from '@/lib/runsApi';

export type PersistMode = 'supabase' | 'local';

interface RunHistory {
  runs: Run[];
  mode: PersistMode;
  addRun: (run: Run) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Run history backed by Supabase via /api/runs, with a transparent localStorage
 * fallback so the game keeps working before the database is provisioned or when
 * the network is unavailable. Picks for remote runs are reconstructed from the
 * loaded squad data.
 */
export function useRunHistory(squads: Squad[]): RunHistory {
  const [runs, setRuns] = useState<Run[]>([]);
  const [mode, setMode] = useState<PersistMode>('local');
  const playerIndex = useMemo(() => buildPlayerIndex(squads), [squads]);

  const refresh = useCallback(async () => {
    const anonymousId = getAnonymousId();
    if (!anonymousId) {
      setRuns(loadLocalRuns());
      setMode('local');
      return;
    }
    try {
      const res = await fetch(`/api/runs?anonymousId=${encodeURIComponent(anonymousId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: RunRow[] = await res.json();
      setRuns(rows.map((row) => rowToRun(row, playerIndex)));
      setMode('supabase');
    } catch {
      // Supabase not reachable / table missing — show whatever is cached locally.
      setRuns(loadLocalRuns());
      setMode('local');
    }
  }, [playerIndex]);

  // Load history once squads are available (needed to reconstruct remote picks).
  useEffect(() => {
    if (squads.length > 0) void refresh();
  }, [squads.length, refresh]);

  const addRun = useCallback(async (run: Run) => {
    // Optimistic: show immediately and cache locally.
    setRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
    saveLocalRun(run);

    const anonymousId = getAnonymousId();
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runToInsert(run, anonymousId)),
      });
      if (res.ok) setMode('supabase');
      else setMode('local');
    } catch {
      setMode('local');
    }
  }, []);

  const reset = useCallback(async () => {
    clearLocalRuns();
    setRuns([]);
    const anonymousId = getAnonymousId();
    if (!anonymousId) return;
    try {
      // Best-effort remote clear so synced history doesn't reappear on refresh.
      await fetch(`/api/runs?anonymousId=${encodeURIComponent(anonymousId)}`, { method: 'DELETE' });
    } catch {
      // offline / DB not provisioned — local cache is already cleared
    }
  }, []);

  return { runs, mode, addRun, reset, refresh };
}
