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
  untracked,
} from '@angular/core';
import { AmbientSound } from '../../../core/ambient-sound';
import { LITE } from '../../../core/perf';
import { LitCandle } from '../../../shared/lit-candle';

/** O objeto de cada sentido: livro, cartão da meditação, chá, escalda-pés ou vela. */
export type RitualScene = 'book' | 'card' | 'tea' | 'jar' | 'candle';

/** Fotos recortadas (public/img/ritual) e a largura de exibição de cada uma. */
const PRODUCTS: Record<Exclude<RitualScene, 'candle'>, { src: string; w: number; h: number }> = {
  book: { src: 'img/ritual/livro.webp', w: 215, h: 299 },
  card: { src: 'img/ritual/cartao-meditacao.webp', w: 250, h: 245 },
  tea: { src: 'img/ritual/cha.webp', w: 240, h: 250 },
  jar: { src: 'img/ritual/escalda-pes.webp', w: 205, h: 328 },
};

/**
 * O palco do ritual, sobre a areia à beira-mar: o objeto do sentido atual, halo de luz,
 * ondas na água (som/tato) e as palavras e corações desenhados pela fumaça.
 *
 * Na vela (Olfato), a chama e a fumaça reagem:
 * - ao mouse/dedo: o "ar" empurra a chama; movimentos rápidos e toques viram rajadas (sopro);
 * - ao som: com um som tocando, a chama cresce e pulsa com o áudio.
 */
@Component({
  selector: 'app-ritual-stage',
  imports: [LitCandle],
  templateUrl: './ritual-stage.html',
  styleUrl: './ritual-stage.scss',
  host: {
    '[class]': "'scene-' + scene() + (tide() ? ' tide' : '')",
    '[style.--tint]': 'tint()',
  },
})
export class RitualStage {
  readonly scene = input<RitualScene>('book');
  protected readonly product = computed(() => PRODUCTS[this.scene() as keyof typeof PRODUCTS] ?? PRODUCTS.book);
  /** Cor (r, g, b) que tinge o halo conforme o sentido. */
  readonly tint = input('232, 180, 166');
  readonly waves = input(false);
  /** No "Viver o ritual", a fumaça escreve o nome do sentido atual. */
  readonly word = input<string | null>(null);
  /** Maré: o objeto vem do horizonte, crescendo, e fica boiando (Configurações → Animações do ritual). */
  readonly tide = input(true);

  // Desenhos de fumaça (coração ou palavra). O id novo recria o SVG e reinicia a animação.
  private artId = 0;
  protected readonly art = signal<{ id: number; kind: 'heart' | 'word'; text: string } | null>(null);
  protected readonly arts = computed(() => {
    const a = this.art();
    return a ? [a] : [];
  });
  private artTimer = 0;
  private heartTimer = 0;
  private visible = false;

  protected readonly aroma = Array.from({ length: 12 }, (_, i) => ({
    dx: Math.round(Math.sin(i * 2.4) * 46),
    delay: -Math.round(i * 83) / 100,
    size: 3 + (i % 3),
  }));

  protected readonly lite = LITE;
  private readonly sound = inject(AmbientSound);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // Estado da "física" da chama (atualizado a cada quadro, fora do Angular).
  private lean = 0;
  private targetLean = 0;
  private gust = 0;
  private pulse = 0;
  private pointerInside = false;
  // Brisa: de tempos em tempos o vento muda de direção e leva a fumaça.
  private breeze = 0;
  private breezeTarget = 0;
  private nextBreeze = 0;
  private last?: { x: number; y: number; t: number };
  private raf = 0;
  private frame = 0;
  private liteFrame = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      const word = this.word();
      untracked(() => word && this.showArt('word', word));
    });
    destroyRef.onDestroy(() => {
      clearTimeout(this.artTimer);
      clearTimeout(this.heartTimer);
    });
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.scheduleHeart();
      // Listeners nativos: não disparam detecção de mudanças a cada movimento.
      const opts = { passive: true } as const;
      const move = (e: PointerEvent) => this.onMove(e);
      const down = (e: PointerEvent) => this.onDown(e);
      const leave = () => (this.pointerInside = false);
      this.host.addEventListener('pointermove', move, opts);
      this.host.addEventListener('pointerdown', down, opts);
      this.host.addEventListener('pointerleave', leave, opts);
      this.host.addEventListener('pointercancel', leave, opts);

      // Maré: distância (px) do horizonte até onde o objeto boia — é dela que ele vem.
      const section = this.host.closest('section');
      const measureTide = () => {
        const stage = this.host.querySelector('.stage')?.getBoundingClientRect();
        const tabs = section?.querySelector('.tabs')?.getBoundingClientRect();
        if (!stage || !tabs) return;
        const floatY = stage.bottom - (innerWidth <= 880 ? 18 : 30);
        const horizon = tabs.bottom + 10;
        // No celular o texto fica entre o horizonte e o objeto: ele nasce no topo do palco.
        const rise = Math.max(80, Math.min(floatY - horizon - 4, stage.height - 50));
        this.host.style.setProperty('--tide-rise', `${Math.round(rise)}px`);
      };
      measureTide();
      const ro = new ResizeObserver(measureTide);
      if (section) ro.observe(section);

      const io = new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(this.raf);
        this.visible = entry.isIntersecting;
        if (entry.isIntersecting) this.raf = requestAnimationFrame(this.tick);
      });
      io.observe(this.host);

      destroyRef.onDestroy(() => {
        ro.disconnect();
        io.disconnect();
        cancelAnimationFrame(this.raf);
        this.host.removeEventListener('pointermove', move);
        this.host.removeEventListener('pointerdown', down);
        this.host.removeEventListener('pointerleave', leave);
        this.host.removeEventListener('pointercancel', leave);
      });
    });
  }

  private showArt(kind: 'heart' | 'word', text = ''): void {
    clearTimeout(this.artTimer);
    this.art.set({ id: ++this.artId, kind, text });
    this.artTimer = window.setTimeout(() => this.art.set(null), 8500);
  }

  /** De tempos em tempos, a fumaça desenha um coração (fora do ritual guiado). */
  private scheduleHeart(): void {
    this.heartTimer = window.setTimeout(() => {
      if (this.visible && !this.word() && !this.art() && this.scene() === 'candle') this.showArt('heart');
      this.scheduleHeart();
    }, 14000 + Math.random() * 14000);
  }

  /** Ponto da chama/vapor na tela (onde o "ar" faz efeito). */
  private focus(): { x: number; y: number } {
    const rect = this.host.querySelector('.stage')!.getBoundingClientRect();
    const style = getComputedStyle(this.host);
    return {
      x: rect.left + rect.width / 2 + parseFloat(style.getPropertyValue('--focus-x') || '0'),
      y: rect.bottom - parseFloat(style.getPropertyValue('--focus-y') || '0'),
    };
  }

  private onMove(e: PointerEvent): void {
    this.pointerInside = true;
    const f = this.focus();
    const dx = e.clientX - f.x;
    const dy = e.clientY - f.y;
    const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 280);
    // A chama se inclina para longe do ponteiro, como se ele soprasse.
    this.targetLean = -Math.sign(dx) * influence * 24;
    const now = performance.now();
    if (this.last) {
      const dt = Math.max(16, now - this.last.t);
      const speed = Math.hypot(e.clientX - this.last.x, e.clientY - this.last.y) / dt; // px/ms
      this.gust = Math.min(1, this.gust + speed * 0.12 * (0.35 + influence));
    }
    this.last = { x: e.clientX, y: e.clientY, t: now };
  }

  private onDown(e: PointerEvent): void {
    const f = this.focus();
    const dx = e.clientX - f.x;
    // Um toque é um sopro: rajada forte para o lado oposto.
    this.gust = 1;
    this.targetLean = (dx < 0 ? 1 : -1) * 20;
    // ...e às vezes o sopro vira um coração de fumaça.
    if (!this.art() && !this.word() && this.scene() === 'candle' && Math.random() < 0.3) this.showArt('heart');
  }

  private readonly tick = () => {
    // Celular: a "física" da chama só importa com a vela na tela — e meia velocidade basta.
    if (LITE && (this.scene() !== 'candle' || ++this.liteFrame % 2)) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    const now = performance.now();
    if (now > this.nextBreeze) {
      // Às vezes calmaria; às vezes um vento para um lado ou para o outro.
      this.breezeTarget = Math.random() < 0.3 ? 0 : (Math.random() - 0.5) * 30;
      if (Math.abs(this.breezeTarget) > 8) this.gust = Math.max(this.gust, 0.25);
      this.nextBreeze = now + 3500 + Math.random() * 6500;
    }
    this.breeze += (this.breezeTarget - this.breeze) * 0.012;

    const level = this.sound.level();
    this.pulse += (Math.min(1, level * 7) - this.pulse) * 0.18;
    this.gust *= 0.955;
    if (!this.pointerInside) this.targetLean *= 0.96;

    // Rajadas e som deixam a chama inquieta.
    const jitter = (Math.random() - 0.5) * (this.gust * 18 + this.pulse * 7);
    // A brisa inclina pouco a chama, mas carrega bastante a fumaça (--wind-n).
    this.lean += (this.targetLean + this.breeze * 0.3 + jitter - this.lean) * 0.12;

    const s = this.host.style;
    s.setProperty('--lean', `${this.lean.toFixed(2)}deg`);
    s.setProperty('--lean-n', this.lean.toFixed(2));
    s.setProperty('--wind-n', this.breeze.toFixed(2));
    s.setProperty('--gust', this.gust.toFixed(3));
    s.setProperty('--pulse', this.pulse.toFixed(3));

    // Fumaça mais turbulenta com vento e som (a cada 3 quadros basta).
    // No celular, só de vez em quando (cada mudança redesenha os filtros).
    if (++this.frame % (LITE ? 20 : 3) === 0) {
      const scale = (14 + this.gust * 46 + this.pulse * 22).toFixed(1);
      this.host.querySelectorAll('feDisplacementMap').forEach((el) => el.setAttribute('scale', scale));
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
