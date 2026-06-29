import { useCallback, useEffect, useState } from 'react';
import { clearRuns, loadRuns, saveRun as persistRun } from '../engine/history';
import type { Run } from '../engine/types';

export function useRunHistory() {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    setRuns(loadRuns());
  }, []);

  const addRun = useCallback((run: Run) => {
    setRuns(persistRun(run));
  }, []);

  const reset = useCallback(() => {
    clearRuns();
    setRuns([]);
  }, []);

  return { runs, addRun, reset };
}
