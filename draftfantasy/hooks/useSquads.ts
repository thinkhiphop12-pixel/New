import { useEffect, useState } from 'react';
import { loadSquads } from '../engine/squads';
import type { Squad } from '../engine/types';

interface SquadsState {
  squads: Squad[];
  loading: boolean;
  error: string | null;
}

export function useSquads(): SquadsState {
  const [state, setState] = useState<SquadsState>({ squads: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    loadSquads()
      .then((squads) => {
        if (!cancelled) setState({ squads, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            squads: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load squads',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
