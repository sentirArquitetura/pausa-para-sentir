import { Component, computed, input } from '@angular/core';
import { LITE } from '../../../core/perf';

export type SmokeVariant = 'candle' | 'steam' | 'incense';

interface WispSpec {
  height: number;
  count: number;
  amplitude: number;
  width: number;
  /** Duração base da subida (s). */
  duration: number;
  dash: number;
  /** Distância máxima (px) entre os pontos de saída dos fios. */
  spread: number;
  /** Camada larga e difusa por trás dos fios, que dá volume. */
  plume: boolean;
}

const SPECS: Record<SmokeVariant, WispSpec> = {
  candle: { height: 260, count: 6, amplitude: 13, width: 2.6, duration: 8, dash: 80, spread: 6, plume: true },
  steam: { height: 170, count: 5, amplitude: 11, width: 3.4, duration: 5, dash: 60, spread: 46, plume: true },
  incense: { height: 320, count: 5, amplitude: 22, width: 3, duration: 10, dash: 110, spread: 0, plume: true },
};

/** Curva suave (Catmull-Rom → Bézier) passando pelos pontos. */
function smoothPath(points: [number, number][]): string {
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = x1 + (x2 - p0[0]) / 6;
    const c1y = y1 + (y2 - p0[1]) / 6;
    const c2x = x2 - (p3[0] - x1) / 6;
    const c2y = y2 - (p3[1] - y1) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

/** Fios que sobem ondulando e abrindo, cada um com sua fase. */
function wisps(spec: WispSpec): string[] {
  return Array.from({ length: spec.count }, (_, w) => {
    const steps = 7;
    const phase = w * 1.9 + 0.6;
    const drift = (w % 2 ? 1 : -1) * (4 + w * 3);
    // Saídas distribuídas (ex.: o vapor sobe de toda a superfície do chá).
    const start = spec.count > 1 ? (w / (spec.count - 1) - 0.5) * spec.spread : 0;
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const spread = spec.amplitude * (0.25 + t * 1.2);
      points.push([60 + start * (1 - t * 0.6) + Math.sin(phase + t * 5.2) * spread + drift * t, spec.height * (1 - t)]);
    }
    return smoothPath(points);
  });
}

let nextId = 0;

/**
 * Fumaça/vapor: fios de traço que "viajam" para cima, distorcidos por ruído animado
 * (feTurbulence) para parecer ar de verdade. A intensidade da distorção é ajustada
 * pelo palco (som, mouse e toque) no atributo `scale` do feDisplacementMap.
 */
@Component({
  selector: 'app-ritual-smoke',
  template: `
    @let s = spec();
    <svg [attr.viewBox]="'0 0 120 ' + s.height" [attr.height]="s.height" width="120" aria-hidden="true">
      <defs>
        <filter [attr.id]="filterId" x="-80%" y="-10%" width="260%" height="125%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" [attr.seed]="seed" result="noise">
            <animate
              attributeName="baseFrequency"
              [attr.begin]="lite ? 'indefinite' : '0s'"
              dur="17s"
              values="0.012 0.03;0.017 0.042;0.012 0.03"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur [attr.stdDeviation]="variant() === 'steam' ? 1.6 : 2.2" />
        </filter>
      </defs>
      <g [attr.filter]="'url(#' + filterId + ')'">
        @if (s.plume) {
          @for (d of paths().slice(0, lite ? 1 : 2); track $index) {
            <path
              class="plume"
              [attr.d]="d"
              [attr.stroke-width]="s.width * 5"
              [attr.stroke-dasharray]="s.dash * 1.6 + ' ' + (s.height + 220)"
              [style.--dash]="s.dash * 1.6"
              [style.--travel]="-(s.height + 120)"
              [style.animation-duration.s]="s.duration * 1.3 + $index"
              [style.animation-delay.s]="-$index * s.duration * 0.6"
            />
          }
        }
        @for (d of paths(); track $index) {
          <path
            [attr.d]="d"
            [attr.stroke-width]="s.width"
            [attr.stroke-dasharray]="s.dash + ' ' + (s.height + 220)"
            [style.--dash]="s.dash"
            [style.--travel]="-(s.height + 80)"
            [style.animation-duration.s]="s.duration + $index * 0.9"
            [style.animation-delay.s]="-$index * (s.duration / s.count)"
          />
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      position: absolute;
      width: 120px;
      pointer-events: none;
      transform-origin: 50% 100%;
      // O ar empurra a fumaça para o mesmo lado da chama.
      // ...e a brisa (--wind-n) leva a fumaça para longe, mais do que a chama.
      transform: skewX(calc((var(--lean-n, 0) + var(--wind-n, 0) * 1.4) * -1.3deg))
        translateX(calc((var(--lean-n, 0) + var(--wind-n, 0)) * 1.2px));
      -webkit-mask-image: linear-gradient(to top, #000 0%, #000 35%, transparent 100%);
      mask-image: linear-gradient(to top, #000 0%, #000 35%, transparent 100%);
    }
    svg {
      display: block;
      overflow: visible;
    }
    path {
      fill: none;
      stroke: var(--smoke-color, rgba(239, 232, 221, 0.6));
      stroke-linecap: round;
      animation: rise linear infinite;
    }
    .plume {
      stroke-opacity: 0.22;
    }
    @keyframes rise {
      0% {
        stroke-dashoffset: calc(var(--dash) * 1px);
        opacity: 0;
      }
      14% {
        opacity: 1;
      }
      70% {
        opacity: 0.65;
      }
      100% {
        stroke-dashoffset: calc(var(--travel) * 1px);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      path {
        animation: none;
        stroke-dashoffset: -60;
        opacity: 0.45;
      }
    }
  `,
})
export class RitualSmoke {
  readonly variant = input<SmokeVariant>('candle');

  protected readonly filterId = `ritual-smoke-${nextId++}`;
  protected readonly seed = nextId * 7;
  /** Celular: ruído parado (a fumaça continua subindo) e metade dos fios. */
  protected readonly lite = LITE;
  protected readonly spec = computed(() => {
    const spec = SPECS[this.variant()];
    return LITE ? { ...spec, count: Math.ceil(spec.count / 2) } : spec;
  });
  protected readonly paths = computed(() => wisps(this.spec()));
}
