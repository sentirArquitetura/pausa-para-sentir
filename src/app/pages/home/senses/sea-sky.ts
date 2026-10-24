import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { LITE } from '../../../core/perf';
import { Seagulls } from './seagulls';

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
  host: { 'aria-hidden': 'true' },
})
export class SeaSky {
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
      // O horizonte fica logo acima do "altar" (vela + sentidos), abaixo do título.
      const measure = () => {
        const altar = section.querySelector('.altar');
        if (!altar) return;
        const top = altar.getBoundingClientRect().top - section.getBoundingClientRect().top;
        host.style.setProperty('--horizon', `${Math.round(top - 18)}px`);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(section);

      const io = new IntersectionObserver(([entry]) => host.classList.toggle('paused', !entry.isIntersecting));
      io.observe(host);

      destroyRef.onDestroy(() => {
        ro.disconnect();
        io.disconnect();
      });
    });
  }
}
