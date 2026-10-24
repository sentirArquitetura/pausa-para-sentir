import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AmbientSound } from '../../../core/ambient-sound';
import { RichTextPipe } from '../../../core/format';
import { SiteContent } from '../../../core/models';
import { Reveal } from '../../../shared/reveal';
import { RitualScene, RitualStage } from './ritual-stage';
import { SoundMixer } from './sound-mixer';

/** Cada fase (inspirar ou expirar) dura 4 s; cada sentido dura duas respirações completas. */
const PHASE_MS = 4000;
const PHASES_PER_SENSE = 4;

/** A cena e o clima do palco para cada sentido (na ordem do conteúdo). */
const MOODS: { scene: RitualScene; tint: string; waves: boolean }[] = [
  { scene: 'none', tint: '139, 150, 128', waves: false }, // visão: o mar e o céu
  { scene: 'none', tint: '232, 180, 166', waves: true }, // audição: ondas de som na água
  { scene: 'cup', tint: '207, 174, 130', waves: false }, // paladar: xícara com vapor
  { scene: 'none', tint: '180, 99, 74', waves: true }, // tato: água morna
  { scene: 'incense', tint: '232, 180, 166', waves: false }, // olfato: incenso
];

@Component({
  selector: 'app-senses-ritual',
  imports: [RitualStage, SoundMixer, RichTextPipe, Reveal],
  templateUrl: './senses-ritual.html',
  styleUrl: './senses-ritual.scss',
})
export class SensesRitual {
  readonly senses = input.required<SiteContent['senses']>();

  protected readonly sound = inject(AmbientSound);
  protected readonly stepMs = PHASE_MS * PHASES_PER_SENSE;

  protected readonly active = signal(0);
  protected readonly guided = signal(false);
  protected readonly breath = signal<'in' | 'out' | null>(null);
  private readonly visible = signal(false);

  protected readonly item = computed(() => this.senses().items[this.active()]);
  protected readonly mood = computed(() => MOODS[this.active() % MOODS.length]);
  /** Posição da Audição (onde ficam os sons), mesmo que o admin renomeie os sentidos. */
  protected readonly hearing = computed(() => {
    const i = this.senses().items.findIndex((s) => /audi/i.test(s.sense));
    return i < 0 ? 1 : i;
  });

  private ticks = 0;
  private timer = 0;

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    // A lua/o sol do fundo respira junto: cresce ao inspirar e recolhe ao expirar.
    effect(() => {
      const breath = this.breath();
      const section = el.closest('section');
      section?.style.setProperty('--breath', breath === 'in' ? '1.22' : breath === 'out' ? '0.92' : '1');
    });
    afterNextRender(() => {
      const io = new IntersectionObserver(([entry]) => this.visible.set(entry.isIntersecting), {
        threshold: 0.2,
      });
      io.observe(el);
      destroyRef.onDestroy(() => {
        io.disconnect();
        clearInterval(this.timer);
      });
    });
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected select(index: number): void {
    this.active.set(index);
    this.ticks = 0;
  }

  /** Há um trecho de meditação configurado no admin? */
  protected readonly hasMeditation = computed(() => !!this.senses().meditation?.audio);

  protected toggleGuide(): void {
    if (this.guided()) {
      clearInterval(this.timer);
      this.guided.set(false);
      this.breath.set(null);
      this.sound.stopMeditation();
      return;
    }
    this.guided.set(true);
    this.ticks = 0;
    this.breath.set('in');
    this.timer = window.setInterval(() => this.tick(), PHASE_MS);
    // Ainda dentro do clique: os navegadores só liberam áudio assim.
    if (this.sound.meditationEnabled()) this.playMeditation();
  }

  /** Liga/desliga a voz da meditação (o ritual guiado continua). */
  protected toggleMeditation(): void {
    const on = !this.sound.meditationEnabled();
    this.sound.setMeditationEnabled(on);
    if (on && this.guided()) this.playMeditation();
  }

  private playMeditation(): void {
    const m = this.senses().meditation;
    if (m?.audio) this.sound.playMeditation(m.audio, m.title, m.maxSeconds);
  }

  /** A cada fase alterna inspirar/expirar; a cada duas respirações, o próximo sentido. */
  private tick(): void {
    if (!this.visible()) return;
    this.breath.update((b) => (b === 'in' ? 'out' : 'in'));
    if (++this.ticks % PHASES_PER_SENSE === 0) {
      this.active.update((i) => (i + 1) % this.senses().items.length);
    }
  }

  /** Setas, Home e End navegam entre os sentidos (padrão de abas acessíveis). */
  protected onKey(event: KeyboardEvent): void {
    const count = this.senses().items.length;
    const keys: Record<string, number> = {
      ArrowRight: (this.active() + 1) % count,
      ArrowLeft: (this.active() - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.select(next);
    setTimeout(() => document.getElementById(`sense-tab-${next}`)?.focus());
  }
}
