import { Component } from '@angular/core';
import { RitualSmoke } from '../pages/home/senses/ritual-smoke';

/**
 * A vela do produto (foto recortada) acesa no rodapé: chama que dança e fumaça subindo.
 * Montada no tamanho original da cena (288 px) e reduzida por inteiro, para manter as proporções.
 */
@Component({
  selector: 'app-footer-candle',
  imports: [RitualSmoke],
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="box">
      <div class="halo"></div>
      <app-ritual-smoke variant="candle" class="smoke" />
      <img src="img/vela-ritual.webp" alt="" width="288" height="331" loading="lazy" />
      <div class="glow"></div>
      <div class="anchor">
        <div class="sway">
          <svg class="flame" viewBox="0 0 40 90">
            <defs>
              <radialGradient id="footer-flame" cx="50%" cy="76%" r="62%">
                <stop offset="0" stop-color="#fffef6" />
                <stop offset="0.22" stop-color="#ffeab4" />
                <stop offset="0.48" stop-color="#ffc264" />
                <stop offset="0.76" stop-color="#ee7e35" stop-opacity="0.85" />
                <stop offset="1" stop-color="#d9622a" stop-opacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M20 2 C 24 22, 36 38, 36 60 C 36 76, 29 88, 20 88 C 11 88, 4 76, 4 60 C 4 38, 16 22, 20 2 Z"
              fill="url(#footer-flame)"
            />
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      width: 150px;
      height: 173px;
      flex-shrink: 0;
    }
    // Cena em 288 px (como era no ritual), reduzida para 150 px.
    .box {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 288px;
      height: 331px;
      transform: scale(0.52);
      transform-origin: 0 100%;
    }
    img {
      position: relative;
      display: block;
      width: 100%;
      height: auto;
      filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.45));
    }
    .halo {
      position: absolute;
      left: -136px;
      bottom: 0;
      width: 560px;
      height: 560px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 196, 130, 0.22) 0%, rgba(232, 180, 166, 0.08) 40%, transparent 68%);
      pointer-events: none;
    }
    .smoke {
      left: 76px;
      bottom: 292px;
      opacity: 0.7;
      --smoke-color: rgba(239, 232, 221, 0.55);
    }
    .glow {
      position: absolute;
      left: 56px;
      bottom: 186px;
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 214, 150, 0.6) 0%, rgba(255, 170, 90, 0.2) 40%, transparent 70%);
      mix-blend-mode: screen;
      animation: glow 2.4s ease-in-out infinite;
    }
    .anchor {
      position: absolute;
      left: 136px;
      bottom: 246px;
      width: 0;
      height: 0;
    }
    .sway {
      position: absolute;
      left: -12px;
      bottom: -3px;
      width: 24px;
      height: 53px;
      transform-origin: 50% 100%;
      animation: sway 6.5s ease-in-out infinite;
    }
    .flame {
      display: block;
      width: 100%;
      height: 100%;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 0 6px rgba(255, 190, 100, 0.85));
      animation: flicker 2.4s ease-in-out infinite;
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
        transform: scale(0.97, 1.06) skewX(1.5deg);
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
      }
      50% {
        transform: scale(1.06);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sway,
      .flame,
      .glow {
        animation: none;
      }
    }
  `,
})
export class FooterCandle {}
