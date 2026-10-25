import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { LITE } from '../../../core/perf';
import { Seagulls } from './seagulls';

/** Mesma curva do @keyframes day-cycle (sea-sky.scss): 0 = noite, 1 = amanhecer/dia. */
function dayAt(p: number): number {
  const ease = (x: number) => x * x * (3 - 2 * x);
  if (p < 0.42) return 0;
  if (p < 0.52) return ease((p - 0.42) / 0.1);
  if (p < 0.88) return 1;
  if (p < 0.97) return 1 - ease((p - 0.88) / 0.09);
  return 0;
}

/** Sequência pseudoaleatória fixa (as estrelas ficam sempre no mesmo lugar). */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * Fundo da seção do ritual: horizonte do mar, céu e areia.
 * O logo é a lua cheia que orbita ao lado do título; depois de um tempo amanhece,
 * a lua se põe e o logo nasce como sol — com o reflexo de cada um no mar.
 *
 * Todo o ciclo é CSS (a propriedade --day vai de 0 = noite a 1 = amanhecer);
 * o componente só mede onde fica o horizonte e pausa o ciclo fora da tela.
 */
@Component({
  selector: 'app-sea-sky',
  imports: [Seagulls],
  templateUrl: './sea-sky.html',
  styleUrl: './sea-sky.scss',
  host: { 'aria-hidden': 'true', '[class.lite]': 'lite' },
})
export class SeaSky {
  /** Celular: só o céu (lua, estrelas, amanhecer); o mar fica parado. */
  protected readonly lite = LITE;
  /** Estrelas que piscam (elementos animados — poucas, para não pesar). */
  protected readonly stars = (() => {
    const rnd = seeded(7);
    return Array.from({ length: LITE ? 18 : 30 }, () => ({
      left: +(rnd() * 100).toFixed(1),
      top: +(28 + rnd() * 64).toFixed(1),
      size: rnd() < 0.2 ? 2.4 : 1.5,
      delay: -+(rnd() * 6).toFixed(2),
    }));
  })();

  /**
   * Céu estrelado de fundo: centenas de estrelas paradas num único SVG (desenhado uma vez),
   * mais densas no alto, com tamanhos e brilhos variados e alguns tons quentes/frios.
   */
  protected readonly starfield = (() => {
    const rnd = seeded(23);
    const tints = ['#f6f1e6', '#f6f1e6', '#f6f1e6', '#dfe6ff', '#ffe9cf'];
    return Array.from({ length: LITE ? 150 : 260 }, () => {
      const y = Math.pow(rnd(), 1.35) * 100; // mais estrelas no alto
      const big = rnd();
      return {
        x: +(rnd() * 200).toFixed(2),
        y: +(y * 0.8).toFixed(2),
        r: big > 0.97 ? 0.24 : big > 0.85 ? 0.15 : 0.09,
        o: +(0.25 + rnd() * 0.6).toFixed(2),
        c: tints[Math.floor(rnd() * tints.length)],
      };
    });
  })();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const section = host.parentElement!;
      // O horizonte fica logo abaixo das abas dos sentidos (que ficam no céu);
      // a areia começa um pouco acima da barra de Paisagens sonoras (que fica na praia).
      const measure = () => {
        const box = section.getBoundingClientRect();
        const tabs = section.querySelector('.tabs');
        if (tabs) {
          const horizon = tabs.getBoundingClientRect().bottom - box.top + 10;
          host.style.setProperty('--horizon', `${Math.round(horizon)}px`);
        }
        // A areia começa logo abaixo do conteúdo (texto e objeto), antes da barra de sons.
        const altar = section.querySelector('.altar');
        if (altar) {
          const shore = box.bottom - altar.getBoundingClientRect().bottom - 8;
          host.style.setProperty('--shore', `${Math.round(shore)}px`);
        }
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(section);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        host.classList.toggle('paused', !visible);
      });
      io.observe(host);

      // Celular: a cor do céu (--day) muda por um relógio de 1 s em vez de animação CSS
      // (que obriga o navegador a recalcular estilos a cada quadro). Segue o mesmo roteiro
      // do CSS: noite → amanhecer → dia → anoitecer, em 120 s, começando 14 s adiante.
      let timer = 0;
      if (this.lite) {
        let elapsed = 14;
        const tick = () => {
          if (visible) elapsed += 1;
          host.style.setProperty('--day', dayAt((elapsed % 120) / 120).toFixed(3));
        };
        tick();
        timer = window.setInterval(tick, 1000);
      }

      destroyRef.onDestroy(() => {
        ro.disconnect();
        io.disconnect();
        clearInterval(timer);
      });
    });
  }
}
