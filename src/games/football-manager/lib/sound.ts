/**
 * WebAudio-synthesized sound effects. Zero audio assets — everything is
 * oscillators and noise buffers, so the static export stays lean and there
 * is nothing to preload. All functions no-op when muted, on the server, or
 * when the browser refuses to give us an AudioContext.
 */

let ctx: AudioContext | null = null;
let volume = 0.7;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (crowdGain && ctx) crowdGain.gain.value = crowdBase * volume;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m) crowd.stop();
}

function gainNode(c: AudioContext, value: number): GainNode {
  const g = c.createGain();
  g.gain.value = value * volume;
  g.connect(c.destination);
  return g;
}

/** 1.5s of white noise, built once per context. */
function noiseBuffer(c: AudioContext, seconds = 1.5): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function blip(c: AudioContext, type: OscillatorType, freq: number, at: number, dur: number, peak: number) {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = gainNode(c, 0);
  g.gain.setValueAtTime(peak * volume, at);
  g.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(g);
  osc.start(at);
  osc.stop(at + dur);
}

function whistleBlast(c: AudioContext, at: number, dur: number) {
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 2200;
  const lfo = c.createOscillator();
  lfo.frequency.value = 6;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const g = gainNode(c, 0);
  g.gain.setValueAtTime(0.12 * volume, at);
  g.gain.setValueAtTime(0.12 * volume, at + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(g);
  lfo.start(at);
  osc.start(at);
  osc.stop(at + dur);
  lfo.stop(at + dur);
}

// Crowd ambience loop state (module scope so start/stop survive re-renders).
let crowdSrc: AudioBufferSourceNode | null = null;
let crowdGain: GainNode | null = null;
let crowdBase = 0.05;

export const sfx = {
  click() {
    const c = ac();
    if (!c || muted) return;
    blip(c, 'triangle', 600, c.currentTime, 0.03, 0.15);
  },

  notify() {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime;
    blip(c, 'sine', 880, t, 0.08, 0.2);
    blip(c, 'sine', 1320, t + 0.14, 0.08, 0.2);
  },

  whistle(kind: 'short' | 'full') {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime;
    if (kind === 'short') {
      whistleBlast(c, t, 0.25);
    } else {
      whistleBlast(c, t, 0.18);
      whistleBlast(c, t + 0.3, 0.18);
      whistleBlast(c, t + 0.6, 0.35);
    }
  },

  card() {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.linearRampToValueAtTime(300, t + 0.15);
    const g = gainNode(c, 0);
    g.gain.setValueAtTime(0.2 * volume, t);
    g.gain.linearRampToValueAtTime(0, t + 0.15);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.15);
  },

  goal(kind: 'for' | 'against') {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'for' ? 1000 : 400;
    bp.Q.value = 0.7;
    const g = gainNode(c, 0);
    const peak = (kind === 'for' ? 0.5 : 0.25) * volume;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 1.5);
    src.connect(bp);
    bp.connect(g);
    src.start(t);
    src.stop(t + 1.5);
    if (kind === 'for') {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.6);
      const og = gainNode(c, 0);
      og.gain.setValueAtTime(0.08 * volume, t);
      og.gain.linearRampToValueAtTime(0, t + 0.6);
      osc.connect(og);
      osc.start(t);
      osc.stop(t + 0.6);
    }
  },
};

export const crowd = {
  start() {
    const c = ac();
    if (!c || muted || crowdSrc) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 2);
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    const g = c.createGain();
    crowdBase = 0.05;
    g.gain.value = crowdBase * volume;
    src.connect(lp);
    lp.connect(g);
    g.connect(c.destination);
    src.start();
    crowdSrc = src;
    crowdGain = g;
  },

  /** level 0..1 (e.g. match momentum) — scales the ambience gain. */
  setLevel(level: number) {
    if (!crowdGain) return;
    crowdBase = 0.05 + 0.1 * Math.max(0, Math.min(1, level));
    crowdGain.gain.value = crowdBase * volume;
  },

  stop() {
    if (crowdSrc) {
      try {
        crowdSrc.stop();
      } catch {
        // already stopped
      }
      crowdSrc.disconnect();
      crowdSrc = null;
    }
    if (crowdGain) {
      crowdGain.disconnect();
      crowdGain = null;
    }
  },
};
