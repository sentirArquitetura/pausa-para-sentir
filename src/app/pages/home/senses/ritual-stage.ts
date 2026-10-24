import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input } from '@angular/core';
import { AmbientSound } from '../../../core/ambient-sound';
import { RitualSmoke } from './ritual-smoke';

export type RitualScene = 'candle' | 'cup' | 'incense';

/**
 * O palco do ritual: a vela (foto real, com chama animada), a xícara de chá ou o incenso,
 * com halo de luz, ondas e o círculo da respiração guiada.
 *
 * A chama e a fumaça reagem:
 * - ao mouse/dedo: o "ar" empurra a chama para longe do ponteiro; movimentos rápidos e
 *   toques viram rajadas que fazem a chama tremer e a fumaça se agitar;
 * - ao som: com um som tocando, a chama cresce e pulsa com a intensidade do áudio.
 */
@Component({
  selector: 'app-ritual-stage',
  imports: [RitualSmoke],
  templateUrl: './ritual-stage.html',
  styleUrl: './ritual-stage.scss',
  host: {
    '[class]': "'scene-' + scene()",
    '[style.--tint]': 'tint()',
    '[style.--smoke]': 'smoke()',
  },
})
export class RitualStage {
  readonly scene = input<RitualScene>('candle');
  /** Cor (r, g, b) que tinge o halo conforme o sentido. */
  readonly tint = input('232, 180, 166');
  /** Intensidade da fumaça da vela (0–1). */
  readonly smoke = input(0.4);
  readonly waves = input(false);
  readonly breath = input<'in' | 'out' | null>(null);

  protected readonly hint = computed(() => {
    const what = { candle: 'da chama', cup: 'do vapor', incense: 'da fumaça' }[this.scene()];
    return `Passe o dedo ou o mouse perto ${what} — ou toque para soprar`;
  });

  protected readonly aroma = Array.from({ length: 12 }, (_, i) => ({
    dx: Math.round(Math.sin(i * 2.4) * 46),
    delay: -Math.round(i * 83) / 100,
    size: 3 + (i % 3),
  }));

  private readonly sound = inject(AmbientSound);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // Estado da "física" da chama (atualizado a cada quadro, fora do Angular).
  private lean = 0;
  private targetLean = 0;
  private gust = 0;
  private pulse = 0;
  private pointerInside = false;
  private last?: { x: number; y: number; t: number };
  private raf = 0;
  private frame = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Listeners nativos: não disparam detecção de mudanças a cada movimento.
      const opts = { passive: true } as const;
      const move = (e: PointerEvent) => this.onMove(e);
      const down = (e: PointerEvent) => this.onDown(e);
      const leave = () => (this.pointerInside = false);
      this.host.addEventListener('pointermove', move, opts);
      this.host.addEventListener('pointerdown', down, opts);
      this.host.addEventListener('pointerleave', leave, opts);
      this.host.addEventListener('pointercancel', leave, opts);

      const io = new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(this.raf);
        if (entry.isIntersecting) this.raf = requestAnimationFrame(this.tick);
      });
      io.observe(this.host);

      destroyRef.onDestroy(() => {
        io.disconnect();
        cancelAnimationFrame(this.raf);
        this.host.removeEventListener('pointermove', move);
        this.host.removeEventListener('pointerdown', down);
        this.host.removeEventListener('pointerleave', leave);
        this.host.removeEventListener('pointercancel', leave);
      });
    });
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
  }

  private readonly tick = () => {
    const level = this.sound.level();
    this.pulse += (Math.min(1, level * 7) - this.pulse) * 0.18;
    this.gust *= 0.955;
    if (!this.pointerInside) this.targetLean *= 0.96;

    // Rajadas e som deixam a chama inquieta.
    const jitter = (Math.random() - 0.5) * (this.gust * 18 + this.pulse * 7);
    this.lean += (this.targetLean + jitter - this.lean) * 0.12;

    const s = this.host.style;
    s.setProperty('--lean', `${this.lean.toFixed(2)}deg`);
    s.setProperty('--lean-n', this.lean.toFixed(2));
    s.setProperty('--gust', this.gust.toFixed(3));
    s.setProperty('--pulse', this.pulse.toFixed(3));

    // Fumaça mais turbulenta com vento e som (a cada 3 quadros basta).
    if (++this.frame % 3 === 0) {
      const scale = (14 + this.gust * 46 + this.pulse * 22).toFixed(1);
      this.host.querySelectorAll('feDisplacementMap').forEach((el) => el.setAttribute('scale', scale));
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
