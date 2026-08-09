/**
 * One stylesheet, injected once by `LassoKentProvider`.
 *
 * Why a string instead of Framer Motion or a `.css` file: the game ships as
 * a static export and every kilobyte of JS is felt on mobile, so the bouncy
 * pop-ins, the eyebrow twitch and the mustache wiggle are all CSS keyframes
 * — no animation runtime, no extra dependency, and they keep running even
 * while React is busy simulating a match. Every rule is namespaced `lk-` so
 * it can't collide with the game's Tailwind classes.
 *
 * If you'd rather use Framer Motion, the swap is contained: replace the
 * `lk-pop` / `lk-msg-in` classes with `motion.div` variants and delete the
 * matching keyframes here. Nothing else in the feature depends on them.
 */
export const LASSO_KENT_CSS = `
/* ── shared ─────────────────────────────────────────────────────────── */
.lk-avatar { display: block; overflow: visible; }
.lk-offline { filter: grayscale(1); opacity: 0.45; }

/* ── Roy: eyebrow twitch + eye roll ─────────────────────────────────── */
@keyframes lk-brow-twitch {
  0%, 62%, 100% { transform: translateY(0); }
  68%           { transform: translateY(-3px) rotate(-1.5deg); }
  74%           { transform: translateY(1px); }
  80%           { transform: translateY(-2px); }
}
@keyframes lk-eye-roll {
  0%, 45%, 100% { transform: translate(0, 0); }
  55%           { transform: translate(0, -3px); }
  65%           { transform: translate(2px, -3.5px); }
  80%           { transform: translate(0, -2px); }
}
@keyframes lk-arms-huff {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1.5px) rotate(-0.6deg); }
}
.lk-roy-anim .lk-roy-brows { animation: lk-brow-twitch 1.6s ease-in-out infinite; transform-origin: 50px 35px; }
.lk-roy-anim .lk-roy-pupil { animation: lk-eye-roll 1.9s ease-in-out infinite; }
.lk-roy-anim .lk-roy-arms  { animation: lk-arms-huff 1.6s ease-in-out infinite; transform-origin: 50px 88px; }

/* ── Ted: mustache wiggle + biscuit offer ───────────────────────────── */
@keyframes lk-tache-wiggle {
  0%, 100% { transform: rotate(0deg) scaleX(1); }
  25%      { transform: rotate(-3deg) scaleX(1.05); }
  60%      { transform: rotate(3deg) scaleX(0.97); }
}
@keyframes lk-biscuit-offer {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  40%      { transform: translate(3px, -5px) rotate(-12deg); }
  70%      { transform: translate(1px, -2px) rotate(6deg); }
}
.lk-ted-anim .lk-ted-tache   { animation: lk-tache-wiggle 1.1s ease-in-out infinite; transform-origin: 50px 57px; }
.lk-ted-anim .lk-ted-biscuit { animation: lk-biscuit-offer 1.6s ease-in-out infinite; transform-origin: 24px 86px; }

/* ── floating summon icon ───────────────────────────────────────────── */
@keyframes lk-idle-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes lk-nudge {
  0%, 100% { transform: scale(1) rotate(0deg); }
  20%      { transform: scale(1.14) rotate(-9deg); }
  45%      { transform: scale(1.08) rotate(7deg); }
  70%      { transform: scale(1.12) rotate(-4deg); }
}
@keyframes lk-ping {
  from { transform: scale(0.85); opacity: 0.55; }
  to   { transform: scale(1.7);  opacity: 0; }
}
.lk-fab {
  position: fixed; z-index: 90;
  width: 68px; height: 68px; padding: 0;
  border: 0; border-radius: 50%;
  background: transparent; cursor: grab;
  touch-action: none; -webkit-tap-highlight-color: transparent;
  filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45));
}
.lk-fab:active { cursor: grabbing; }
.lk-fab-idle   { animation: lk-idle-bob 3.4s ease-in-out infinite; }
.lk-fab-nudge  { animation: lk-nudge 0.7s ease-in-out 2; }
.lk-fab-dragging { animation: none; transition: none; }
.lk-fab-ping {
  position: absolute; inset: 0; border-radius: 50%;
  border: 3px solid #f5b942; pointer-events: none;
  animation: lk-ping 1.5s ease-out infinite;
}

/* ── contextual helper trigger ──────────────────────────────────────── */
.fm-assistant-info {
  display: inline-grid; place-items: center; width: 22px; height: 22px;
  padding: 0; border: 1px solid rgba(245,185,66,0.65); border-radius: 50%;
  background: rgba(245,185,66,0.14); color: #f5b942; font: 700 13px/1 Georgia, serif;
  cursor: pointer; touch-action: manipulation;
}
.fm-assistant-info:hover, .fm-assistant-info:focus-visible { background: rgba(245,185,66,0.28); outline: 2px solid #f5b942; outline-offset: 2px; }

/* ── chat window ────────────────────────────────────────────────────── */
@keyframes lk-pop-in {
  0%   { transform: scale(0.7) translateY(24px); opacity: 0; }
  60%  { transform: scale(1.04) translateY(-4px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes lk-msg-in {
  from { transform: translateY(8px) scale(0.96); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes lk-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-5px); }
  75%      { transform: translateX(5px); }
}
.lk-pop    { animation: lk-pop-in 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both; transform-origin: bottom right; }
.lk-msg-in { animation: lk-msg-in 0.22s ease-out both; }
.lk-shake  { animation: lk-shake 0.36s ease-in-out; }

/* Roy's censor bar: a black block that flickers over the swear. */
@keyframes lk-bleep { 0%, 100% { opacity: 1; } 50% { opacity: 0.72; } }
.lk-bleep {
  display: inline-block; background: #111; color: #111;
  border-radius: 2px; padding: 0 0.35em; margin: 0 0.1em;
  user-select: none; animation: lk-bleep 0.35s steps(2) infinite;
}

/* Respect the OS setting — the jokes survive without the movement. */
@media (prefers-reduced-motion: reduce) {
  .lk-avatar *, .lk-fab, .lk-pop, .lk-msg-in, .lk-shake, .lk-fab-ping, .lk-bleep {
    animation: none !important;
  }
}
`;
