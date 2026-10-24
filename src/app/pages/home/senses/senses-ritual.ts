import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { AmbientSound } from '../../../core/ambient-sound';
import { RichTextPipe } from '../../../core/format';
import { SiteContent } from '../../../core/models';
import { Reveal } from '../../../shared/reveal';
import { RitualCandle } from './ritual-candle';
import { SoundMixer } from './sound-mixer';

/** Cada fase (inspirar ou expirar) dura 4 s; cada sentido dura duas respirações completas. */
const PHASE_MS = 4000;
const PHASES_PER_SENSE = 4;

/** O clima da vela para cada sentido (na ordem do conteúdo). */
const MOODS = [
  { tint: '139, 150, 128', smoke: 0.25, waves: false }, // visão
  { tint: '232, 180, 166', smoke: 0.2, waves: true }, // audição: ondas de som
  { tint: '207, 174, 130', smoke: 0.55, waves: false }, // paladar: vapor do chá
  { tint: '180, 99, 74', smoke: 0.3, waves: true }, // tato: água morna
  { tint: '232, 180, 166', smoke: 0.85, waves: false }, // olfato: aroma da vela
];

@Component({
  selector: 'app-senses-ritual',
  imports: [RitualCandle, SoundMixer, RichTextPipe, Reveal],
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
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
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

  protected toggleGuide(): void {
    if (this.guided()) {
      clearInterval(this.timer);
      this.guided.set(false);
      this.breath.set(null);
      return;
    }
    this.guided.set(true);
    this.ticks = 0;
    this.breath.set('in');
    this.timer = window.setInterval(() => this.tick(), PHASE_MS);
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
