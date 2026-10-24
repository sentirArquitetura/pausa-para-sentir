import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Beija-flores que surgem, pairam, disparam para outro ponto e somem.
 * Cada voo é sorteado; ao terminar, o pássaro descansa e volta por outro caminho.
 */
@Component({
  selector: 'app-hummingbirds',
  host: { 'aria-hidden': 'true' },
  template: `
    @for (b of birds; track $index) {
      <div class="bird">
        <div class="bob" [style.animation-delay.s]="-$index * 0.37">
          <svg viewBox="0 0 60 40" width="64" height="43">
            <path class="wing far" d="M30 18 C 27 9, 22 3, 13 1 C 17 7, 22 13, 28 19 Z" />
            <path class="tail" d="M16 22 L 3 17 L 8 22.5 L 2 27 L 16 24.5 Z" />
            <path class="body" d="M14 22 C 20 15, 32 13, 40 15.5 C 44 17, 46 19, 46 21 C 44 24, 38 26, 30 26 C 24 26, 18 25, 14 22 Z" />
            <circle class="head" cx="42" cy="17" r="4.6" />
            <ellipse class="throat" cx="41.5" cy="21.2" rx="3.6" ry="2.4" />
            <path class="beak" d="M46 16.4 L 59 14.6 L 46 18.2 Z" />
            <circle class="eye" cx="43.6" cy="16" r="0.85" />
            <path class="wing near" d="M31 18 C 29 8, 25 1, 16 -2 C 19 6, 23 13, 29 19.5 Z" />
          </svg>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .bird {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      will-change: transform, opacity;
    }
    .bob {
      animation: bob 0.9s ease-in-out infinite;
    }
    svg {
      display: block;
      overflow: visible;
      filter: drop-shadow(0 0 6px rgba(255, 210, 160, 0.25));
    }
    .body {
      fill: #a7b298;
    }
    .head {
      fill: #8b9680;
    }
    .throat {
      fill: #e8b4a6;
    }
    .tail {
      fill: #5d684f;
    }
    .beak,
    .eye {
      fill: #1d2318;
    }
    .wing {
      fill: rgba(239, 232, 221, 0.6);
      transform-box: view-box;
      transform-origin: 30px 18px;
      animation: flap 0.07s linear infinite alternate;
    }
    .wing.far {
      fill: rgba(239, 232, 221, 0.3);
      animation-delay: -0.035s;
    }
    @keyframes flap {
      from {
        transform: rotate(-6deg) scaleY(1);
      }
      to {
        transform: rotate(8deg) scaleY(-0.4);
      }
    }
    @keyframes bob {
      50% {
        transform: translateY(-3px);
      }
    }
  `,
})
export class Hummingbirds {
  protected readonly birds = [0, 1, 2, 3];

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private stopped = false;
  private readonly timers: number[] = [];

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.host.querySelectorAll('.bird').forEach((el, i) => {
        this.timers.push(window.setTimeout(() => this.fly(el as HTMLElement), i * 1600 + rand(200, 1400)));
      });
    });
    destroyRef.onDestroy(() => {
      this.stopped = true;
      this.timers.forEach(clearTimeout);
    });
  }

  private fly(el: HTMLElement): void {
    if (this.stopped) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;

    const scale = rand(0.65, 1.15);
    const stops = Math.round(rand(3, 5));
    const points = Array.from({ length: stops }, () => ({ x: rand(0.04, 0.92) * w, y: rand(0.04, 0.75) * h }));
    // Começa perto de uma borda lateral.
    const fromLeft = Math.random() < 0.5;
    points.unshift({ x: fromLeft ? rand(-0.02, 0.08) * w : rand(0.88, 0.98) * w, y: rand(0.08, 0.6) * h });

    // Cada parada: chega rápido (disparo) e paira um pouco.
    const frames: Keyframe[] = [];
    const total = points.length;
    let dir = fromLeft ? 1 : -1;
    points.forEach((p, i) => {
      const next = points[i + 1];
      if (next && Math.abs(next.x - p.x) > 8) dir = next.x > p.x ? 1 : -1;
      const arrive = i / total;
      const hold = Math.min(1, arrive + (0.55 / total));
      const t = (x: number, y: number, d: number) => `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) scale(${(d * scale).toFixed(2)}, ${scale.toFixed(2)})`;
      frames.push({ offset: arrive, transform: t(p.x, p.y, dir), opacity: i === 0 ? 0 : 0.85, easing: 'ease-in-out' });
      // Pairando: pequena deriva enquanto bebe o néctar imaginário.
      frames.push({ offset: hold, transform: t(p.x + rand(-6, 6), p.y + rand(-5, 5), dir), opacity: 0.85, easing: 'cubic-bezier(.5,0,.2,1)' });
    });
    const last = points[total - 1];
    frames.push({ offset: 1, transform: `translate(${last.x.toFixed(0)}px, ${(last.y - 20).toFixed(0)}px) scale(${(dir * scale).toFixed(2)}, ${scale.toFixed(2)})`, opacity: 0 });

    const anim = el.animate(frames, { duration: rand(9000, 14000), fill: 'forwards' });
    anim.onfinish = () => this.timers.push(window.setTimeout(() => this.fly(el), rand(800, 3500)));
  }
}
