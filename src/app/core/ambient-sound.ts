import { Injectable, computed, signal } from '@angular/core';

/**
 * Paisagens sonoras geradas ao vivo com a Web Audio API — sem arquivos de áudio,
 * sem direitos autorais e sem download. Cada som pode ser combinado com os outros.
 */
export type SoundId = 'sinos' | 'chuva' | 'mar' | 'floresta' | 'f432' | 'f528';

export interface SoundDef {
  id: SoundId;
  label: string;
  hint: string;
  /** Volume inicial (0–1). */
  volume: number;
  /** Quanto do som vai para a reverberação (0–1). */
  wet: number;
}

export const SOUNDS: SoundDef[] = [
  { id: 'sinos', label: 'Sinos tibetanos', hint: 'Taças que ressoam e se dissolvem no silêncio', volume: 0.7, wet: 0.9 },
  { id: 'chuva', label: 'Chuva', hint: 'Chuva fina e gotas na janela', volume: 0.4, wet: 0.15 },
  { id: 'mar', label: 'Mar', hint: 'Ondas que vêm e vão, no ritmo da respiração', volume: 0.55, wet: 0.25 },
  { id: 'floresta', label: 'Floresta', hint: 'Vento nas folhas e pássaros ao longe', volume: 0.75, wet: 0.45 },
  { id: 'f432', label: '432 Hz', hint: 'Frequência suave e contínua', volume: 0.3, wet: 0.5 },
  { id: 'f528', label: '528 Hz', hint: 'Frequência suave e contínua', volume: 0.3, wet: 0.5 },
];

/** Atalhos para montar os sons. */
class AudioKit {
  constructor(
    readonly ctx: AudioContext,
    readonly white: AudioBuffer,
    readonly brown: AudioBuffer,
  ) {}

  rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(this.ctx.currentTime, Math.random() * buffer.duration);
    return src;
  }

  filter(type: BiquadFilterType, frequency: number, Q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = Q;
    return f;
  }

  gain(value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  pan(value: number): StereoPannerNode {
    const p = this.ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  }

  /** Oscilador lento que faz um parâmetro "respirar". */
  lfo(frequency: number, depth: number, target: AudioParam): OscillatorNode {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = frequency;
    osc.connect(this.gain(depth)).connect(target);
    osc.start();
    return osc;
  }
}

/** Monta um som ligado a `out` e devolve a função que o encerra. */
type Builder = (k: AudioKit, out: AudioNode) => () => void;

const rain: Builder = (k, out) => {
  const hiss = k.loop(k.white);
  hiss.connect(k.filter('highpass', 900)).connect(k.filter('lowpass', 7000)).connect(k.gain(0.16)).connect(out);
  const body = k.loop(k.brown);
  body.connect(k.filter('lowpass', 700)).connect(k.gain(0.55)).connect(out);

  let timer = 0;
  const drop = () => {
    const t = k.ctx.currentTime;
    const src = k.ctx.createBufferSource();
    src.buffer = k.white;
    const g = k.gain(0);
    src.connect(k.filter('bandpass', k.rand(1800, 6500), 6)).connect(g).connect(k.pan(k.rand(-0.9, 0.9))).connect(out);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(k.rand(0.04, 0.2), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + k.rand(0.03, 0.09));
    src.start(t, k.rand(0, 1.5), 0.12);
    timer = window.setTimeout(drop, k.rand(15, 110));
  };
  drop();
  return () => {
    clearTimeout(timer);
    hiss.stop();
    body.stop();
  };
};

const sea: Builder = (k, out) => {
  const wave = 1 / 9; // uma onda a cada ~9 s
  const swell = k.gain(0.28);
  const lowpass = k.filter('lowpass', 520);
  const src = k.loop(k.brown);
  src.connect(lowpass).connect(swell).connect(out);
  const foamGain = k.gain(0.03);
  const foam = k.loop(k.white);
  foam.connect(k.filter('bandpass', 1400, 0.6)).connect(foamGain).connect(out);
  const lfos = [k.lfo(wave, 0.24, swell.gain), k.lfo(wave, 380, lowpass.frequency), k.lfo(wave, 0.028, foamGain.gain)];
  return () => [src, foam, ...lfos].forEach((n) => n.stop());
};

const forest: Builder = (k, out) => {
  const band = k.filter('bandpass', 450, 0.6);
  const windGain = k.gain(0.55);
  const wind = k.loop(k.brown);
  wind.connect(band).connect(windGain).connect(out);
  const leavesGain = k.gain(0.012);
  const leaves = k.loop(k.white);
  leaves.connect(k.filter('highpass', 4000)).connect(leavesGain).connect(out);
  const lfos = [k.lfo(0.05, 220, band.frequency), k.lfo(0.13, 0.15, windGain.gain), k.lfo(0.09, 0.01, leavesGain.gain)];

  // Pássaros: pequenas frases de 2 a 5 trinados, de tempos em tempos.
  let timer = 0;
  const phrase = () => {
    let t = k.ctx.currentTime + 0.05;
    const base = k.rand(2400, 4200);
    const pan = k.pan(k.rand(-0.8, 0.8));
    pan.connect(out);
    const notes = Math.floor(k.rand(2, 6));
    for (let i = 0; i < notes; i++) {
      const osc = k.ctx.createOscillator();
      const g = k.gain(0);
      osc.connect(g).connect(pan);
      const f = base * k.rand(0.92, 1.08);
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.3, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(k.rand(0.015, 0.04), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.start(t);
      osc.stop(t + 0.13);
      t += k.rand(0.12, 0.22);
    }
    timer = window.setTimeout(phrase, k.rand(2500, 8000));
  };
  timer = window.setTimeout(phrase, 1200);
  return () => {
    clearTimeout(timer);
    [wind, leaves, ...lfos].forEach((n) => n.stop());
  };
};

// Taça tibetana: parciais inarmônicos, cada um em par levemente desafinado (o "batimento").
const BOWL_NOTES = [196, 220, 246.9, 261.6, 293.7];
const BOWL_PARTIALS: [ratio: number, amp: number, decay: number][] = [
  [1, 1, 9],
  [2.76, 0.42, 6],
  [5.4, 0.2, 3.5],
  [8.93, 0.08, 2.2],
];

const bowls: Builder = (k, out) => {
  let timer = 0;
  const strike = () => {
    const t = k.ctx.currentTime + 0.02;
    const f = BOWL_NOTES[Math.floor(Math.random() * BOWL_NOTES.length)];
    const pan = k.pan(k.rand(-0.35, 0.35));
    pan.connect(out);
    for (const [ratio, amp, decay] of BOWL_PARTIALS) {
      for (const beat of [0, k.rand(0.5, 1.6)]) {
        const osc = k.ctx.createOscillator();
        osc.frequency.value = f * ratio + beat;
        const g = k.gain(0);
        osc.connect(g).connect(pan);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp * 0.2, t + 0.012);
        g.gain.setTargetAtTime(0, t + 0.015, decay / 4);
        osc.start(t);
        osc.stop(t + decay * 1.5);
      }
    }
    // O toque do bastão na borda da taça.
    const hit = k.ctx.createBufferSource();
    hit.buffer = k.white;
    const hg = k.gain(0);
    hit.connect(k.filter('bandpass', f * 6, 2)).connect(hg).connect(pan);
    hg.gain.setValueAtTime(0.05, t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    hit.start(t, 0, 0.05);
    timer = window.setTimeout(strike, k.rand(7000, 12000));
  };
  strike();
  // As taças já tocadas silenciam sozinhas; o fade-out do volume cuida do resto.
  return () => clearTimeout(timer);
};

const drone =
  (freq: number): Builder =>
  (k, out) => {
    const g = k.gain(0.16);
    g.connect(out);
    const oscs = (
      [
        [freq, 1],
        [freq / 2, 0.5],
        [freq * 1.5, 0.08],
      ] as const
    ).map(([f, amp]) => {
      const osc = k.ctx.createOscillator();
      osc.frequency.value = f;
      osc.connect(k.gain(amp)).connect(g);
      osc.start();
      return osc;
    });
    const tremolo = k.lfo(0.12, 0.05, g.gain);
    return () => [...oscs, tremolo].forEach((o) => o.stop());
  };

const BUILDERS: Record<SoundId, Builder> = {
  sinos: bowls,
  chuva: rain,
  mar: sea,
  floresta: forest,
  f432: drone(432),
  f528: drone(528),
};

function noiseBuffer(ctx: AudioContext, brown: boolean): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

/** Resposta de uma sala ampla e macia, para a reverberação. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
  }
  return buffer;
}

interface Voice {
  out: GainNode;
  stop: () => void;
}

@Injectable({ providedIn: 'root' })
export class AmbientSound {
  readonly sounds = SOUNDS;
  readonly active = signal<SoundId[]>([]);
  readonly volumes = signal(
    Object.fromEntries(SOUNDS.map((s) => [s.id, s.volume])) as Record<SoundId, number>,
  );
  readonly playing = computed(() => this.active().length > 0);
  readonly activeLabels = computed(() =>
    this.active()
      .map((id) => SOUNDS.find((s) => s.id === id)!.label)
      .join(' · '),
  );

  private kit?: AudioKit;
  private master?: GainNode;
  private reverb?: ConvolverNode;
  private readonly voices = new Map<SoundId, Voice>();

  isOn(id: SoundId): boolean {
    return this.active().includes(id);
  }

  toggle(id: SoundId): void {
    if (this.isOn(id)) this.stop(id);
    else this.start(id);
  }

  setVolume(id: SoundId, value: number): void {
    this.volumes.update((v) => ({ ...v, [id]: value }));
    const voice = this.voices.get(id);
    if (voice && this.kit) voice.out.gain.setTargetAtTime(value, this.kit.ctx.currentTime, 0.1);
  }

  stopAll(): void {
    for (const id of this.active()) this.stop(id);
  }

  /** O navegador só libera o áudio depois de um clique — por isso tudo nasce aqui. */
  private setup(): AudioKit {
    if (this.kit) {
      void this.kit.ctx.resume();
      return this.kit;
    }
    const ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(compressor);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx, 3.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    this.reverb.connect(wet).connect(this.master);
    this.kit = new AudioKit(ctx, noiseBuffer(ctx, false), noiseBuffer(ctx, true));
    return this.kit;
  }

  private start(id: SoundId): void {
    const k = this.setup();
    const def = SOUNDS.find((s) => s.id === id)!;
    const out = k.gain(0);
    out.connect(this.master!);
    out.connect(k.gain(def.wet)).connect(this.reverb!);
    const stop = BUILDERS[id](k, out);
    // Entra devagar, como quem aumenta o som com cuidado.
    out.gain.setTargetAtTime(this.volumes()[id], k.ctx.currentTime, 0.6);
    this.voices.set(id, { out, stop });
    this.active.update((list) => [...list, id]);
  }

  private stop(id: SoundId): void {
    const voice = this.voices.get(id);
    if (!voice || !this.kit) return;
    this.voices.delete(id);
    this.active.update((list) => list.filter((s) => s !== id));
    const now = this.kit.ctx.currentTime;
    voice.out.gain.cancelScheduledValues(now);
    voice.out.gain.setTargetAtTime(0, now, 0.35);
    setTimeout(() => {
      voice.stop();
      voice.out.disconnect();
    }, 2500);
  }
}
