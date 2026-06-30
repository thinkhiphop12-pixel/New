import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Run, Squad } from '@/engine/types';
import { getAnonymousId } from '@/lib/anonymousId';
import { clearLocalRuns, loadLocalRuns, saveLocalRun } from '@/lib/localRuns';
import { createClient } from '@/lib/supabase/client';
import { buildPlayerIndex, rowToRun, runToRow, type RunRow } from '@/lib/runsApi';

export type PersistMode = 'supabase' | 'local';

interface RunHistory {
  runs: Run[];
  mode: PersistMode;
  addRun: (run: Run) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Run history backed by Supabase (queried directly from the browser with the
 * publishable key), with a transparent localStorage fallback so the game keeps
 * working when the database is unreachable. Picks for remote runs are
 * reconstructed from the loaded squad data.
 */
export function useRunHistory(squads: Squad[]): RunHistory {
  const [runs, setRuns] = useState<Run[]>([]);
  const [mode, setMode] = useState<PersistMode>('local');
  const playerIndex = useMemo(() => buildPlayerIndex(squads), [squads]);
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const anonymousId = getAnonymousId();
    if (!supabase || !anonymousId) {
      setRuns(loadLocalRuns());
      setMode('local');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('runs')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .order('played_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRuns((data as RunRow[]).map((row) => rowToRun(row, playerIndex)));
      setMode('supabase');
    } catch {
      setRuns(loadLocalRuns());
      setMode('local');
    }
  }, [supabase, playerIndex]);

  useEffect(() => {
    if (squads.length > 0) void refresh();
  }, [squads.length, refresh]);

  const addRun = useCallback(
    async (run: Run) => {
      setRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      saveLocalRun(run);

      const anonymousId = getAnonymousId();
      if (!supabase || !anonymousId) {
        setMode('local');
        return;
      }
      try {
        const { error } = await supabase.from('runs').insert(runToRow(run, anonymousId));
        setMode(error ? 'local' : 'supabase');
      } catch {
        setMode('local');
      }
    },
    [supabase]
  );

  const reset = useCallback(async () => {
    clearLocalRuns();
    setRuns([]);
    const anonymousId = getAnonymousId();
    if (!supabase || !anonymousId) return;
    try {
      await supabase.from('runs').delete().eq('anonymous_id', anonymousId);
    } catch {
      // offline / DB not provisioned — local cache already cleared
    }
  }, [supabase]);

  return { runs, mode, addRun, reset, refresh };
}
