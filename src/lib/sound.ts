"use client";

/**
 * Game-show stings, synthesized with Web Audio so there are no audio files to
 * license or ship. Browsers keep audio locked until the page gets a click or
 * key press; `unlockAudio` resumes it, and `subscribeAudio` reports changes.
 */
export type SoundName = "tileOpen" | "deepCut" | "correct" | "wrong" | "timerEnd" | "bonus" | "winner" | "streak";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp);
    ctx.onstatechange = () => listeners.forEach((l) => l());
  }
  return ctx;
}

export function audioReady(): boolean {
  return context()?.state === "running";
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state !== "running") c.resume().catch(() => {});
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- Building blocks ----------

function tone(
  freq: number,
  at: number,
  dur: number,
  { type = "sine", gain = 0.2, glideTo, attack = 0.01 }: { type?: OscillatorType; gain?: number; glideTo?: number; attack?: number } = {},
) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function noise(
  at: number,
  dur: number,
  { gain = 0.2, filter = "bandpass", freq = 1000, sweepTo, q = 1 }: { gain?: number; filter?: BiquadFilterType; freq?: number; sweepTo?: number; q?: number } = {},
) {
  const c = ctx!;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.05, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur);
}

// ---------- The sounds ----------

const SOUNDS: Record<SoundName, (t: number) => void> = {
  // A rising whoosh as the tile flips open.
  tileOpen: (t) => {
    noise(t, 0.45, { gain: 0.22, freq: 300, sweepTo: 3500, q: 2 });
    tone(220, t, 0.4, { type: "sine", gain: 0.12, glideTo: 880, attack: 0.05 });
  },
  // The hardest row: a falling whoosh into a low, dissonant drone and a heartbeat.
  deepCut: (t) => {
    noise(t, 0.6, { gain: 0.2, freq: 2400, sweepTo: 180, q: 2 });
    tone(73, t + 0.2, 1.8, { type: "sawtooth", gain: 0.12, attack: 0.25 });
    tone(77.8, t + 0.2, 1.8, { type: "sawtooth", gain: 0.1, attack: 0.25 });
    tone(36.7, t + 0.2, 1.8, { type: "sine", gain: 0.25, attack: 0.2 });
    [0.9, 1.15].forEach((d) => tone(55, t + d, 0.18, { type: "sine", gain: 0.35, glideTo: 40 }));
  },
  // A crackling whoosh and a rising run: the team is on fire.
  streak: (t) => {
    noise(t, 0.7, { gain: 0.16, filter: "bandpass", freq: 900, sweepTo: 5000, q: 0.8 });
    [659, 880, 1175, 1568].forEach((f, i) => tone(f, t + 0.05 + i * 0.06, 0.25, { type: "square", gain: 0.06 }));
    tone(1760, t + 0.3, 0.5, { type: "triangle", gain: 0.1 });
  },
  // Bright three-note ding.
  correct: (t) => {
    [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.35, { type: "triangle", gain: 0.22 }));
    tone(2637, t + 0.18, 0.4, { type: "sine", gain: 0.06 });
  },
  // Low two-tone buzzer.
  wrong: (t) => {
    tone(98, t, 0.6, { type: "sawtooth", gain: 0.16, attack: 0.02 });
    tone(104, t, 0.6, { type: "sawtooth", gain: 0.16, attack: 0.02 });
    tone(196, t, 0.6, { type: "square", gain: 0.04, attack: 0.02 });
  },
  // Three quick beeps and a held tone.
  timerEnd: (t) => {
    [0, 0.18, 0.36].forEach((d) => tone(880, t + d, 0.12, { type: "square", gain: 0.1 }));
    tone(660, t + 0.56, 0.6, { type: "square", gain: 0.1 });
  },
  // Shimmering chord swell with a cymbal hit and a climbing arpeggio.
  bonus: (t) => {
    noise(t, 1.2, { gain: 0.12, filter: "highpass", freq: 6000 });
    [523, 659, 784, 1047].forEach((f) => tone(f, t, 1.4, { type: "sine", gain: 0.07, attack: 0.3 }));
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + 0.1 + i * 0.07, 0.3, { type: "triangle", gain: 0.12 }));
  },
  // Short fanfare.
  winner: (t) => {
    [392, 523, 659].forEach((f, i) => tone(f, t + i * 0.14, 0.2, { type: "sawtooth", gain: 0.08 }));
    [523, 659, 784, 1047].forEach((f) => tone(f, t + 0.42, 1.2, { type: "triangle", gain: 0.1, attack: 0.02 }));
    noise(t + 0.42, 0.9, { gain: 0.08, filter: "highpass", freq: 7000 });
  },
};

export function playSound(name: SoundName): void {
  const c = context();
  if (!c || c.state !== "running") return;
  SOUNDS[name](c.currentTime + 0.01);
}
