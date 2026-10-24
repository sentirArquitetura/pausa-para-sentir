import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
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
  protected readonly stars = (() => {
    const rnd = seeded(7);
    return Array.from({ length: 34 }, () => ({
      left: +(rnd() * 100).toFixed(1),
      top: +(32 + rnd() * 58).toFixed(1),
      size: rnd() < 0.15 ? 2.4 : 1.4,
      delay: -+(rnd() * 6).toFixed(2),
    }));
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
