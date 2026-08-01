import type { SideStats } from './types';

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export const goalText = (scorer: string, club: string, hg: number, ag: number, homeName: string, awayName: string) =>
  `GOAL! ${scorer} scores for ${club} — ${homeName} ${hg}-${ag} ${awayName}`;

export const saveText = (shooter: string) =>
  pick([
    `What a save to deny ${shooter}!`,
    `${shooter} shoots! Saved by the keeper!`,
    `${shooter} forces a fingertip stop!`,
    `The keeper stands tall and beats ${shooter}'s effort away.`,
  ]);

export const missText = (shooter: string) =>
  pick([
    `${shooter} drags it just wide of the far post.`,
    `${shooter} curls one inches over the bar.`,
    `${shooter} blazes it into the stand.`,
    `${shooter} rattles the woodwork from distance!`,
  ]);

export const bigMissText = (shooter: string) =>
  pick([
    `${shooter} should score! Somehow it stays out.`,
    `A glorious chance goes begging for ${shooter}.`,
    `${shooter} miscues from six yards — huge let-off.`,
  ]);

export const blockText = (shooter: string) => pick([`Blocked! ${shooter}'s effort is smothered.`, `${shooter}'s shot is charged down.`]);

export const cornerText = (club: string) => pick([`Corner to ${club}.`, `Blocked! The cross is deflected out for a corner to ${club}.`]);

export const foulText = (player: string) => pick([`${player} is penalised for a late challenge.`, `Free kick — ${player} catches his man.`, `Cynical from ${player}.`]);

export const yellowText = (player: string) => `Yellow card for ${player}.`;
export const secondYellowText = (player: string) => `Second yellow — ${player} is off!`;
export const redText = (player: string) => `RED CARD! ${player} is sent off!`;

export const injuryText = (player: string, label = 'Knock', days = 7) =>
  `${player} goes down injured and cannot continue — ${label.toLowerCase()}, an estimated ${days} days out.`;

/**
 * Context-aware colour on a goal (gap 30): a line that reads the archetype,
 * the scoreline it just produced and the clock, so commentary can never
 * contradict what actually happened.
 */
export function goalColour(
  minute: number,
  archetype: string,
  hg: number,
  ag: number,
  scorerIsHome: boolean,
  scorerGoalsSoFar: number,
  matchEnd: number
): string {
  const gf = scorerIsHome ? hg : ag;
  const ga = scorerIsHome ? ag : hg;
  const bits: string[] = [];
  if (archetype === 'penalty') bits.push('Sent the keeper the wrong way from twelve yards.');
  else if (archetype === 'long_range' || archetype === 'edge_box') bits.push('An unstoppable strike from range.');
  else if (archetype === 'header_cross' || archetype === 'corner_header') bits.push('Rose highest and buried the header.');
  else if (archetype === 'tap_in') bits.push('The simplest of finishes.');
  else if (archetype === 'one_on_one') bits.push('Clean through, and he made no mistake.');
  else if (archetype === 'rebound') bits.push('Quickest to the loose ball.');
  else if (archetype === 'free_kick') bits.push('Straight over the wall and in.');

  if (scorerGoalsSoFar === 3) bits.push('That is his hat-trick!');
  else if (scorerGoalsSoFar === 2) bits.push('His second of the afternoon.');

  const stoppage = minute > 90;
  if (gf === ga) bits.push(stoppage ? 'A stoppage-time equaliser — parity restored!' : 'Level again.');
  else if (gf === ga + 1 && minute >= 80) bits.push(stoppage ? 'A stoppage-time winner — surely that is that!' : 'That could be the winner.');
  else if (gf === ga + 1) bits.push('They lead for the first time.');
  else if (gf - ga >= 3) bits.push('This is turning into a rout.');
  if (minute >= matchEnd - 2 && gf !== ga) bits.push('There is barely time to respond.');

  return bits.length ? ` ${bits.join(' ')}` : '';
}
export const subText = (inName: string, outName: string) => `Substitution: ${inName} ON for ${outName}.`;

export const buildupText = (club: string) =>
  pick([
    `${club} knocking it around at the back.`,
    `Patient build-up from ${club}.`,
    `${club} probing for an opening.`,
    `${club} work it forward through midfield.`,
  ]);

/** Assistant analysis lines, gated to the phase of the match. */
export function assistantLine(
  minute: number,
  stats: { home: SideStats; away: SideStats },
  score: { home: number; away: number },
  homeName: string,
  awayName: string,
  userIsHome: boolean | null
): string | null {
  const us = userIsHome === null ? null : userIsHome ? stats.home : stats.away;
  const them = userIsHome === null ? null : userIsHome ? stats.away : stats.home;
  if (minute >= 15 && minute < 60) {
    if (us && them) {
      if (us.possession >= 62 && us.shots <= them.shots) return `Lots of the ball for us, but it's been sterile so far.`;
      if (them.possession >= 62) return `We're not seeing enough of the ball — consider pressing higher.`;
      if (us.shots - them.shots >= 4) return `We're on top here — keep feeding the front line.`;
    }
    const dom = stats.home.possession >= 60 ? homeName : stats.away.possession >= 60 ? awayName : null;
    if (dom) return `${dom} are dictating the tempo of this one.`;
    return null;
  }
  if (minute >= 60) {
    const gf = userIsHome === null ? null : userIsHome ? score.home : score.away;
    const ga = userIsHome === null ? null : userIsHome ? score.away : score.home;
    if (gf !== null && ga !== null) {
      if (gf < ga) return `Time is running out — we may need to gamble with a more attacking mentality.`;
      if (gf > ga) return `We're ahead — worth thinking about shutting up shop.`;
      if (us && them && us.xg > them.xg + 0.5) return `We've created the better chances; a winner feels close.`;
    }
    return null;
  }
  return null;
}
