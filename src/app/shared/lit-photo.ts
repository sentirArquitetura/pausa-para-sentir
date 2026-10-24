import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { RitualSmoke } from '../pages/home/senses/ritual-smoke';

/**
 * Onde estão as velas acesas em cada foto do kit (pixels da imagem original 1254×1254):
 * ponto do pavio (base da chama) e altura da chama.
 */
const FLAME_SPOTS: Record<string, { x: number; y: number; h: number }[]> = {
  'kit1.jpeg': [{ x: 505, y: 432, h: 33 }],
  'kit2.jpeg': [{ x: 547, y: 437, h: 52 }],
  'kit3.jpeg': [{ x: 360.5, y: 673, h: 62 }],
  'kit4.jpeg': [{ x: 628, y: 638, h: 57 }],
  'kit5.jpeg': [{ x: 740.5, y: 535, h: 62 }],
};

/** Altura da chama desenhada (em px, antes da escala). */
const FLAME_H = 53;

let nextId = 0;

/**
 * Foto que "acende": se a imagem for uma das fotos do kit, a chama da vela ganha
 * movimento e solta fumaça, exatamente sobre a chama da foto (considerando o recorte
 * object-fit: cover). Para outras imagens, é só uma <img>.
 */
@Component({
  selector: 'app-lit-photo',
  imports: [RitualSmoke],
  template: `
    <img [src]="src()" [alt]="alt()" [attr.loading]="loading()" (load)="measure()" />
    @for (f of flames(); track $index) {
      <div class="lit" [style.left.px]="f.x" [style.top.px]="f.y" [style.--s]="f.s">
        <app-ritual-smoke variant="candle" class="lit-smoke" />
        <div class="lit-glow"></div>
        <div class="lit-sway">
          <svg class="lit-flame" viewBox="0 0 40 90">
            <defs>
              <radialGradient [attr.id]="gradId" cx="50%" cy="76%" r="62%">
                <stop offset="0" stop-color="#fffef6" />
                <stop offset="0.22" stop-color="#ffeab4" />
                <stop offset="0.48" stop-color="#ffc264" />
                <stop offset="0.76" stop-color="#ee7e35" stop-opacity="0.85" />
                <stop offset="1" stop-color="#d9622a" stop-opacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M20 2 C 24 22, 36 38, 36 60 C 36 76, 29 88, 20 88 C 11 88, 4 76, 4 60 C 4 38, 16 22, 20 2 Z"
              [attr.fill]="'url(#' + gradId + ')'"
            />
          </svg>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    // Ponto zero no pavio; tudo escala com o tamanho da chama na foto.
    .lit {
      position: absolute;
      width: 0;
      height: 0;
      transform: scale(var(--s));
      transform-origin: 0 0;
      pointer-events: none;
    }
    .lit-sway {
      position: absolute;
      left: -12px;
      bottom: -4px;
      width: 24px;
      height: 53px;
      transform-origin: 50% 100%;
      animation: sway 6.5s ease-in-out infinite;
    }
    .lit-flame {
      display: block;
      width: 100%;
      height: 100%;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 0 6px rgba(255, 190, 100, 0.85));
      animation: flicker 2.4s ease-in-out infinite;
    }
    .lit-glow {
      position: absolute;
      left: -70px;
      top: -96px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 214, 150, 0.55) 0%, rgba(255, 170, 90, 0.18) 40%, transparent 70%);
      mix-blend-mode: screen;
      animation: glow 2.4s ease-in-out infinite;
    }
    .lit-smoke {
      left: -60px;
      bottom: 44px;
      opacity: 0.55;
      --smoke-color: rgba(250, 246, 238, 0.6);
    }
    @keyframes flicker {
      0%,
      100% {
        transform: scale(1, 1) skewX(0deg);
      }
      25% {
        transform: scale(1.02, 0.96) skewX(-1deg);
      }
      50% {
        transform: scale(0.98, 1.05) skewX(1.5deg);
      }
      75% {
        transform: scale(1.03, 0.97) skewX(-1.5deg);
      }
    }
    @keyframes sway {
      0%,
      100% {
        transform: rotate(-1.4deg);
      }
      50% {
        transform: rotate(1.6deg);
      }
    }
    @keyframes glow {
      0%,
      100% {
        transform: scale(1);
        opacity: 0.85;
      }
      50% {
        transform: scale(1.07);
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .lit-sway,
      .lit-flame,
      .lit-glow {
        animation: none;
      }
    }
  `,
})
export class LitPhoto {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly loading = input<'lazy' | 'eager'>('lazy');

  protected readonly gradId = `lit-flame-${nextId++}`;
  protected readonly flames = signal<{ x: number; y: number; s: number }[]>([]);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(this.host);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  /** Converte a posição da chama na foto para a posição na tela (object-fit: cover, centralizado). */
  protected measure(): void {
    const img = this.host.querySelector('img');
    const file = this.src().split(/[?#]/)[0].split('/').pop() ?? '';
    const spots = FLAME_SPOTS[file];
    if (!img || !spots || !img.naturalWidth) return this.flames.set([]);
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const offX = (w - img.naturalWidth * scale) / 2;
    const offY = (h - img.naturalHeight * scale) / 2;
    this.flames.set(
      spots
        .map((p) => ({ x: offX + p.x * scale, y: offY + p.y * scale, s: (p.h * scale * 1.08) / FLAME_H }))
        // Fora do recorte, ou pequena demais para valer a pena (miniaturas).
        .filter((f) => f.x > 0 && f.x < w && f.y > 0 && f.y < h && f.s * FLAME_H >= 9),
    );
  }
}
