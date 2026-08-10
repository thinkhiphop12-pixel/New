/** Settings-gated wrapper over navigator.vibrate (no-op where unsupported). */

let enabled = true;

export function setHaptics(on: boolean) {
  enabled = on;
}

const PATTERNS = {
  tap: 10,
  whistle: 20,
  goal: [30, 40, 60],
} as const;

export function vibrate(kind: keyof typeof PATTERNS) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[kind] as number | number[]);
}
