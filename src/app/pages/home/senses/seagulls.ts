import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Gull {
  id: number;
  flap: number;
  delay: number;
}

/**
 * Gaivotas que atravessam o céu de vez em quando, em pequenos bandos.
 * Claras ao luar, em silhueta escura contra o amanhecer (cor pela variável --day do céu).
 */
@Component({
  selector: 'app-seagulls',
  host: { 'aria-hidden': 'true' },
  template: `
    @for (g of gulls(); track g.id) {
      <div class="gull" [attr.data-id]="g.id">
        <svg viewBox="0 0 40 16" width="40" height="16">
          <g class="wing left" [style.animation-duration.s]="g.flap" [style.animation-delay.s]="g.delay">
            <path d="M20 8 Q 13 1 3 5" />
          </g>
          <g class="wing right" [style.animation-duration.s]="g.flap" [style.animation-delay.s]="g.delay">
            <path d="M20 8 Q 27 1 37 5" />
          </g>
          <ellipse cx="20" cy="8.6" rx="2.2" ry="1.4" />
        </svg>
      </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: var(--horizon);
      z-index: 2;
      pointer-events: none;
      overflow: visible;
      --gull: color-mix(in oklab, rgba(239, 232, 221, 0.75), rgba(38, 34, 42, 0.8) calc(var(--day, 0) * 100%));
    }
    .gull {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      will-change: transform, opacity;
    }
    svg {
      display: block;
      overflow: visible;
    }
    path {
      fill: none;
      stroke: var(--gull);
      stroke-width: 1.8;
      stroke-linecap: round;
    }
    ellipse {
      fill: var(--gull);
    }
    .wing {
      transform-box: view-box;
      transform-origin: 20px 8px;
      animation: flap-left 0.9s ease-in-out infinite alternate;
    }
    .wing.right {
      animation-name: flap-right;
    }
    // Bate as asas e, no fim de cada ciclo, plana um pouco.
    @keyframes flap-left {
      0%,
      30% {
        transform: rotate(-4deg);
      }
      100% {
        transform: rotate(-28deg) scaleY(0.6);
      }
    }
    @keyframes flap-right {
      0%,
      30% {
        transform: rotate(4deg);
      }
      100% {
        transform: rotate(28deg) scaleY(0.6);
      }
    }
  `,
})
export class Seagulls {
  protected readonly gulls = signal<Gull[]>([]);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private timer = 0;
  private nextId = 0;
  private stopped = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.timer = window.setTimeout(() => this.flock(), rand(3000, 7000));
    });
    destroyRef.onDestroy(() => {
      this.stopped = true;
      clearTimeout(this.timer);
    });
  }

  private flock(): void {
    if (this.stopped) return;
    const paused = this.host.closest('app-sea-sky')?.classList.contains('paused');
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!paused && w && h) {
      const count = Math.random() < 0.45 ? 1 : Math.random() < 0.6 ? 2 : 3;
      const born = Array.from({ length: count }, (): Gull => ({
        id: ++this.nextId,
        flap: rand(0.32, 0.5),
        delay: -rand(0, 0.4),
      }));
      this.gulls.update((list) => [...list, ...born]);
      // Espera o Angular desenhar as gaivotas novas para animá-las.
      requestAnimationFrame(() => this.fly(born, w, h));
    }
    this.timer = window.setTimeout(() => this.flock(), rand(14000, 32000));
  }

  private fly(born: Gull[], w: number, h: number): void {
    const leftToRight = Math.random() < 0.5;
    const baseY = rand(0.38, 0.86) * h;
    const duration = rand(18000, 30000);
    const depth = rand(0.55, 1.15);
    born.forEach((g, i) => {
      const el = this.host.querySelector<HTMLElement>(`.gull[data-id="${g.id}"]`);
      if (!el) return;
      const s = depth * rand(0.85, 1.1);
      const dir = leftToRight ? 1 : -1;
      const offX = i * rand(30, 55) * -dir;
      const offY = (i % 2 ? 1 : -1) * i * rand(8, 16);
      const x0 = leftToRight ? -60 : w + 60;
      const x1 = leftToRight ? w + 60 : -60;
      const frames: Keyframe[] = Array.from({ length: 7 }, (_, k) => {
        const t = k / 6;
        const x = x0 + (x1 - x0) * t + offX;
        const y = baseY + offY + Math.sin(t * Math.PI * 2 + i) * 18 * s;
        return {
          offset: t,
          transform: `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) scale(${(s * dir).toFixed(2)}, ${s.toFixed(2)})`,
          opacity: t === 0 || t === 1 ? 0 : 0.9,
        };
      });
      const anim = el.animate(frames, { duration: duration + i * 900, delay: i * 400, easing: 'linear', fill: 'forwards' });
      anim.onfinish = () => this.gulls.update((list) => list.filter((x) => x.id !== g.id));
    });
  }
}
