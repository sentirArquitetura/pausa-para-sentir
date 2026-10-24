import { Injectable, computed, signal } from '@angular/core';

/**
 * Paisagens sonoras geradas ao vivo com a Web Audio API — sem arquivos de áudio,
 * sem direitos autorais e sem download. Cada som pode ser combinado com os outros.
 */
export type SoundId =
  | 'sinos'
  | 'chuva'
  | 'mar'
  | 'floresta'
  | 'grilos'
  | 'f174'
  | 'f396'
  | 'f432'
  | 'f528'
  | 'f639'
  | 'f741'
  | 'f852'
  | 'f963'
  | 'delta'
  | 'theta'
  | 'alfa';

export type SoundGroup = 'natureza' | 'frequencia' | 'binaural';

export interface SoundDef {
  id: SoundId;
  label: string;
  /** Natureza: o que se ouve. Frequências: o objetivo, segundo a tradição. */
  hint: string;
  group: SoundGroup;
  /** Volume inicial (0–1). */
  volume: number;
  /** Quanto do som vai para a reverberação (0–1). */
  wet: number;
}

export const SOUND_GROUPS: { id: SoundGroup; label: string; note?: string }[] = [
  { id: 'natureza', label: 'Natureza' },
  {
    id: 'frequencia',
    label: 'Frequências',
    note: 'Objetivos segundo as tradições de terapia sonora (frequências Solfeggio e 432 Hz).',
  },
  {
    id: 'binaural',
    label: 'Batidas binaurais',
    note: 'Use fones de ouvido: cada ouvido recebe um tom levemente diferente.',
  },
];

export const SOUNDS: SoundDef[] = [
  { id: 'sinos', label: 'Sinos tibetanos', hint: 'Taças que ressoam e se dissolvem no silêncio', group: 'natureza', volume: 0.7, wet: 0.9 },
  { id: 'chuva', label: 'Chuva', hint: 'Chuva fina e gotas na janela', group: 'natureza', volume: 0.4, wet: 0.15 },
  { id: 'mar', label: 'Mar', hint: 'Ondas que vêm e vão, no ritmo da respiração', group: 'natureza', volume: 0.55, wet: 0.25 },
  { id: 'floresta', label: 'Floresta', hint: 'Vento nas folhas e pássaros ao longe', group: 'natureza', volume: 0.75, wet: 0.45 },
  { id: 'grilos', label: 'Grilos', hint: 'Uma noite quente no campo', group: 'natureza', volume: 0.45, wet: 0.35 },
  { id: 'f174', label: '174 Hz', hint: 'Alívio de tensões e dores', group: 'frequencia', volume: 0.32, wet: 0.5 },
  { id: 'f396', label: '396 Hz', hint: 'Liberar medos e culpa', group: 'frequencia', volume: 0.3, wet: 0.5 },
  { id: 'f432', label: '432 Hz', hint: 'Harmonia com a natureza, calma', group: 'frequencia', volume: 0.3, wet: 0.5 },
  { id: 'f528', label: '528 Hz', hint: '“Frequência do amor”: renovação', group: 'frequencia', volume: 0.3, wet: 0.5 },
  { id: 'f639', label: '639 Hz', hint: 'Relações, afeto e conexão', group: 'frequencia', volume: 0.28, wet: 0.5 },
  { id: 'f741', label: '741 Hz', hint: 'Clareza mental e expressão', group: 'frequencia', volume: 0.26, wet: 0.5 },
  { id: 'f852', label: '852 Hz', hint: 'Intuição e presença', group: 'frequencia', volume: 0.24, wet: 0.5 },
  { id: 'f963', label: '963 Hz', hint: 'Conexão e espiritualidade', group: 'frequencia', volume: 0.22, wet: 0.5 },
  { id: 'delta', label: 'Delta · 2 Hz', hint: 'Sono profundo e reparador', group: 'binaural', volume: 0.35, wet: 0.2 },
  { id: 'theta', label: 'Theta · 6 Hz', hint: 'Meditação profunda e criatividade', group: 'binaural', volume: 0.35, wet: 0.2 },
  { id: 'alfa', label: 'Alfa · 10 Hz', hint: 'Relaxamento com a mente desperta', group: 'binaural', volume: 0.35, wet: 0.2 },
];

/** Atalhos para montar os sons. */
class AudioKit {
  constructor(
    readonly ctx: AudioContext,
    readonly white: AudioBuffer,
    readonly brown: AudioBuffer,
    readonly drops: AudioBuffer,
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
  // Gotas: um laço pré-gravado em estéreo (leve no celular — nada é criado a cada gota).
  const drops = k.loop(k.drops);
  drops.connect(k.filter('bandpass', 3800, 0.8)).connect(k.gain(1.4)).connect(out);
  return () => [hiss, body, drops].forEach((n) => n.stop());
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
    // Tons agudos soam mais fortes ao ouvido: compensa para todas soarem parecidas.
    const g = k.gain(0.16 * Math.min(1.3, Math.sqrt(432 / freq)));
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

/**
 * Batida binaural: um tom grave em cada ouvido, com `beat` Hz de diferença.
 * O cérebro percebe uma pulsação nessa frequência (precisa de fones).
 */
const binaural =
  (beat: number, carrier = 200): Builder =>
  (k, out) => {
    const oscs = [
      [carrier, -1],
      [carrier + beat, 1],
    ].map(([f, pan]) => {
      const osc = k.ctx.createOscillator();
      osc.frequency.value = f;
      osc.connect(k.gain(0.2)).connect(k.pan(pan)).connect(out);
      osc.start();
      return osc;
    });
    return () => oscs.forEach((o) => o.stop());
  };

/** Grilos: um laço pré-gravado de 8 s com vários grilos (leve — nada é criado a cada cri-cri). */
const crickets: Builder = (k, out) => {
  const src = k.loop(cricketBuffer(k.ctx));
  src.connect(out);
  return () => src.stop();
};

let cricketCache: AudioBuffer | undefined;
function cricketBuffer(ctx: AudioContext): AudioBuffer {
  if (cricketCache?.sampleRate === ctx.sampleRate) return cricketCache;
  const rate = ctx.sampleRate;
  const seconds = 8;
  const buffer = ctx.createBuffer(2, rate * seconds, rate);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  // Cada grilo: frequência, posição, volume e ritmo próprios.
  const insects = [
    { f: 4650, pan: 0.2, amp: 0.27, period: 0.62, offset: 0.05 },
    { f: 4980, pan: 0.85, amp: 0.16, period: 0.81, offset: 0.33 },
    { f: 4300, pan: 0.45, amp: 0.11, period: 0.55, offset: 0.21 },
    { f: 5200, pan: 0.05, amp: 0.08, period: 0.93, offset: 0.6 },
  ];
  for (const c of insects) {
    for (let t = c.offset; t < seconds - 0.2; t += c.period * (0.9 + Math.random() * 0.2)) {
      // "cri-cri": 3 a 4 pulsos curtos.
      const pulses = 3 + Math.round(Math.random());
      for (let p = 0; p < pulses; p++) {
        const start = Math.floor((t + p * 0.038) * rate);
        const len = Math.floor(0.024 * rate);
        for (let i = 0; i < len && start + i < L.length; i++) {
          const env = Math.sin((Math.PI * i) / len) ** 2;
          const v = Math.sin((2 * Math.PI * c.f * i) / rate) * env * c.amp;
          L[start + i] += v * (1 - c.pan);
          R[start + i] += v * c.pan;
        }
      }
    }
  }
  cricketCache = buffer;
  return buffer;
}

const BUILDERS: Record<SoundId, Builder> = {
  sinos: bowls,
  chuva: rain,
  mar: sea,
  floresta: forest,
  grilos: crickets,
  f174: drone(174),
  f396: drone(396),
  f432: drone(432),
  f528: drone(528),
  f639: drone(639),
  f741: drone(741),
  f852: drone(852),
  f963: drone(963),
  delta: binaural(2),
  theta: binaural(6),
  alfa: binaural(10),
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

/** Laço de 6 s com ~500 gotas (estalinhos de ruído que decaem), espalhadas em estéreo. */
function dropsBuffer(ctx: AudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, rate * 6, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let n = 0; n < 500; n++) {
    const start = Math.floor(Math.random() * left.length);
    const amp = 0.04 + Math.random() * 0.22;
    const tau = rate * (0.004 + Math.random() * 0.012);
    const pan = Math.random();
    const len = Math.min(left.length - start, Math.floor(tau * 6));
    for (let i = 0; i < len; i++) {
      const v = (Math.random() * 2 - 1) * amp * Math.exp(-i / tau);
      left[start + i] += v * (1 - pan);
      right[start + i] += v * pan;
    }
  }
  return buffer;
}

/**
 * Reverberação leve: quatro ecos com realimentação abafada (comb filters).
 * Bem mais barata que um ConvolverNode — importante em celulares Android mais simples.
 */
function lightReverb(ctx: AudioContext): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  output.gain.value = 0.35;
  for (const [delay, pan] of [
    [0.113, -0.6],
    [0.157, 0.5],
    [0.211, -0.3],
    [0.269, 0.7],
  ]) {
    const d = ctx.createDelay(1);
    d.delayTime.value = delay;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.62;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    input.connect(d);
    d.connect(damp);
    damp.connect(feedback).connect(d);
    damp.connect(p).connect(output);
  }
  return { input, output };
}

/** Duração (s) da descida de volume no fim do trecho da meditação. */
const MEDITATION_FADE = 6;
const MEDITATION_PREF = 'pps.meditation';

function readPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
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
  /** Meditação guiada tocando agora (título), ou null. */
  readonly meditation = signal<string | null>(null);
  /** Player da meditação: pausada?, segundos decorridos e duração do trecho. */
  readonly meditationPaused = signal(false);
  readonly meditationTime = signal(0);
  readonly meditationTotal = signal(0);
  /** O visitante quer ouvir a meditação no ritual guiado (lembrado neste navegador). */
  readonly meditationEnabled = signal(readPref(MEDITATION_PREF, true));
  readonly meditationError = signal('');

  /** Só os sons de fundo ativos (sem a meditação). */
  readonly activeLabelsAmbient = computed(() =>
    this.active()
      .map((id) => SOUNDS.find((s) => s.id === id)!.label)
      .join(' · '),
  );
  readonly playing = computed(() => this.active().length > 0 || !!this.meditation());
  readonly activeLabels = computed(() =>
    [this.meditation(), ...this.active().map((id) => SOUNDS.find((s) => s.id === id)!.label)]
      .filter(Boolean)
      .join(' · '),
  );

  private kit?: AudioKit;
  private master?: GainNode;
  /** Barramento dos sons de fundo: abaixa sozinho enquanto a meditação fala. */
  private ambient?: GainNode;
  private reverb?: GainNode;
  private idleTimer = 0;
  private analyser?: AnalyserNode;
  private samples?: Float32Array<ArrayBuffer>;
  private readonly voices = new Map<SoundId, Voice>();
  private med?: {
    audio: HTMLAudioElement;
    gain: GainNode;
    source: MediaElementAudioSourceNode;
    endTimer: number;
    pauseTimer: number;
  };

  /** Intensidade do som agora (RMS, ~0–0.3) — usada para a chama "dançar" com a música. */
  level(): number {
    if (!this.analyser || !this.samples || !this.playing()) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (const v of this.samples) sum += v * v;
    return Math.sqrt(sum / this.samples.length);
  }

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
    this.stopMeditation();
  }

  setMeditationEnabled(on: boolean): void {
    this.meditationEnabled.set(on);
    writePref(MEDITATION_PREF, on);
    if (!on) this.stopMeditation();
  }

  /**
   * Toca o trecho da meditação: entra suave (≈1 s) e, nos últimos segundos do trecho
   * (fim do arquivo ou `maxSeconds`), o volume desce devagar até o silêncio.
   * Precisa ser chamado dentro de um clique (regra dos navegadores para áudio).
   */
  playMeditation(url: string, title: string, maxSeconds = 0): void {
    this.stopMeditation(0);
    this.meditationError.set('');
    const k = this.setup();
    const ctx = k.ctx;
    const audio = new Audio();
    // Necessário para o Web Audio "ouvir" arquivos de outro domínio (Supabase Storage).
    if (!url.startsWith('data:')) audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(this.master!);
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.35);
    this.duck(true);

    const med = { audio, gain, source, endTimer: 0, pauseTimer: 0 };
    this.med = med;
    this.meditation.set(title || 'Meditação guiada');
    this.meditationPaused.set(false);
    this.meditationTime.set(0);
    this.meditationTotal.set(0);

    // Tempo decorrido e total do trecho (para o player).
    const trackTime = () => {
      if (this.med !== med) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const total = maxSeconds > 0 ? (duration ? Math.min(duration, maxSeconds) : maxSeconds) : duration;
      this.meditationTotal.set(total);
      this.meditationTime.set(total ? Math.min(audio.currentTime, total) : audio.currentTime);
    };
    audio.addEventListener('loadedmetadata', trackTime);
    audio.addEventListener('durationchange', trackTime);
    audio.addEventListener('timeupdate', trackTime);

    // Agenda o "fade-out" quando já se sabe a duração.
    const scheduleEnd = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
      const end = Math.min(duration, maxSeconds > 0 ? maxSeconds : Infinity);
      if (!Number.isFinite(end)) return;
      const fade = Math.min(MEDITATION_FADE, end / 3);
      const remaining = Math.max(0, end - audio.currentTime);
      clearTimeout(med.endTimer);
      med.endTimer = window.setTimeout(() => {
        if (this.med !== med) return;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
        med.endTimer = window.setTimeout(() => this.finishMeditation(med), fade * 1000 + 100);
      }, Math.max(0, remaining - fade) * 1000);
    };
    audio.addEventListener('loadedmetadata', scheduleEnd, { once: true });
    audio.addEventListener('playing', scheduleEnd);
    audio.addEventListener('ended', () => this.finishMeditation(med), { once: true });
    audio.addEventListener('error', () => {
      if (this.med !== med) return;
      this.meditationError.set('Não foi possível tocar a meditação.');
      this.finishMeditation(med);
    });
    audio.play().catch(() => {
      if (this.med !== med) return;
      this.meditationError.set('O navegador bloqueou o áudio. Toque em “Viver o ritual” de novo.');
      this.finishMeditation(med);
    });
  }

  /** Pausa a meditação (o volume desce rápido antes de parar) — retoma de onde parou. */
  pauseMeditation(): void {
    const med = this.med;
    if (!med || !this.kit || this.meditationPaused()) return;
    this.meditationPaused.set(true);
    clearTimeout(med.endTimer);
    const now = this.kit.ctx.currentTime;
    med.gain.gain.cancelScheduledValues(now);
    med.gain.gain.setValueAtTime(med.gain.gain.value, now);
    med.gain.gain.linearRampToValueAtTime(0, now + 0.4);
    med.pauseTimer = window.setTimeout(() => med.audio.pause(), 450);
    this.duck(false);
  }

  resumeMeditation(): void {
    const med = this.med;
    if (!med || !this.meditationPaused()) return;
    const ctx = this.setup().ctx;
    clearTimeout(med.pauseTimer);
    this.meditationPaused.set(false);
    void med.audio.play();
    med.gain.gain.cancelScheduledValues(ctx.currentTime);
    med.gain.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
    this.duck(true);
  }

  toggleMeditationPause(): void {
    if (this.meditationPaused()) this.resumeMeditation();
    else this.pauseMeditation();
  }

  /** Para a meditação descendo o volume em `fadeSeconds`. */
  stopMeditation(fadeSeconds = 1.2): void {
    const med = this.med;
    if (!med || !this.kit) return;
    this.med = undefined;
    this.meditation.set(null);
    this.meditationPaused.set(false);
    clearTimeout(med.endTimer);
    clearTimeout(med.pauseTimer);
    const now = this.kit.ctx.currentTime;
    med.gain.gain.cancelScheduledValues(now);
    med.gain.gain.setValueAtTime(med.gain.gain.value, now);
    med.gain.gain.linearRampToValueAtTime(0, now + Math.max(0.02, fadeSeconds));
    setTimeout(() => this.release(med), fadeSeconds * 1000 + 150);
    this.duck(false);
    this.suspendIfIdle();
  }

  private finishMeditation(med: NonNullable<typeof this.med>): void {
    if (this.med === med) {
      this.med = undefined;
      this.meditation.set(null);
      this.meditationPaused.set(false);
    }
    clearTimeout(med.endTimer);
    clearTimeout(med.pauseTimer);
    this.release(med);
    if (!this.med) this.duck(false);
    this.suspendIfIdle();
  }

  /** Com a meditação falando, os sons de fundo descem para ~35%; depois voltam devagar. */
  private duck(on: boolean): void {
    if (!this.ambient || !this.kit) return;
    this.ambient.gain.setTargetAtTime(on ? 0.35 : 1, this.kit.ctx.currentTime, on ? 0.8 : 1.5);
  }

  private release(med: NonNullable<typeof this.med>): void {
    med.audio.pause();
    med.audio.removeAttribute('src');
    med.audio.load();
    med.source.disconnect();
    med.gain.disconnect();
  }

  /** Sem nenhum som tocando, desliga o motor de áudio (economiza bateria e processador). */
  private suspendIfIdle(): void {
    if (!this.kit || this.voices.size || this.med) return;
    const ctx = this.kit.ctx;
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => void ctx.suspend(), 3500);
  }

  /** O navegador só libera o áudio depois de um clique — por isso tudo nasce aqui. */
  private setup(): AudioKit {
    clearTimeout(this.idleTimer);
    if (this.kit) {
      void this.kit.ctx.resume();
      return this.kit;
    }
    // "playback": buffers maiores — menos falhas/travadas em celulares.
    const ctx = new AudioContext({ latencyHint: 'playback' });
    void ctx.resume();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(compressor);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.samples = new Float32Array(this.analyser.fftSize);
    compressor.connect(this.analyser);
    this.ambient = ctx.createGain();
    this.ambient.connect(this.master);
    const reverb = lightReverb(ctx);
    reverb.output.connect(this.ambient);
    this.reverb = reverb.input;
    this.kit = new AudioKit(ctx, noiseBuffer(ctx, false), noiseBuffer(ctx, true), dropsBuffer(ctx));
    return this.kit;
  }

  private start(id: SoundId): void {
    const k = this.setup();
    const def = SOUNDS.find((s) => s.id === id)!;
    const out = k.gain(0);
    out.connect(this.ambient!);
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
    this.suspendIfIdle();
  }
}
