'use client';

/**
 * @deprecated The interactive matchday now lives in components/match/MatchScreen
 * (tick-engine replay with heatmap pitch, live tactics and subs). This shim
 * keeps old imports working; safe to delete along with MatchPitchView and
 * components/live2d once nothing references them.
 */
export { default } from './match/MatchScreen';
