import type { Objective } from '../engine/types';

export function SimulatingScreen({ objective }: { objective: Objective }) {
  return (
    <div className="pc-screen pc-simulating">
      <div className="pc-spinner pc-spinner--large" />
      <h2>Simulating the run&hellip;</h2>
      <p>
        {objective === 'perfect'
          ? 'Three group games and five knockout rounds. Win all eight.'
          : 'Through the group stage to the final. Lift the trophy.'}
      </p>
    </div>
  );
}
