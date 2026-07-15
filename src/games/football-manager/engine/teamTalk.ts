export type TeamTalkTone = 'encourage' | 'calm' | 'demand';

export interface TeamTalkOutcome {
  quote: string;
  reaction: string;
  /** Applied to match momentum (home-perspective, caller flips sign for the away side). */
  momentumDelta: number;
}

/**
 * How a team talk lands depends on the tone and the scoreline: a demanding
 * hairdryer fires the squad up when losing or level, but backfires on a
 * team that's already winning comfortably.
 */
export function teamTalkEffect(tone: TeamTalkTone, scoreDiff: number): TeamTalkOutcome {
  if (tone === 'calm') {
    return {
      quote: '"Let\'s stick to the plan and stay composed."',
      reaction: 'A measured word — steady, if unspectacular.',
      momentumDelta: 0.06,
    };
  }
  if (tone === 'encourage') {
    return {
      quote: '"I believe in this team — go out there and enjoy it."',
      reaction: 'The squad responds well to the vote of confidence.',
      momentumDelta: 0.14,
    };
  }
  // demand
  if (scoreDiff < 0) {
    return {
      quote: '"That is not good enough. I want a reaction, right now!"',
      reaction: 'The rollicking lights a fire under the dressing room.',
      momentumDelta: 0.3,
    };
  }
  if (scoreDiff === 0) {
    return {
      quote: '"We should be ahead here — raise it, now!"',
      reaction: 'A firm word gets the message across.',
      momentumDelta: 0.22,
    };
  }
  return {
    quote: '"Don\'t get comfortable — I want more!"',
    reaction: "Some senior players bristle at being pushed while leading — it doesn't land well.",
    momentumDelta: -0.12,
  };
}
