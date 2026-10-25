import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Pausa as animações CSS do elemento (e dos filhos) enquanto ele está fora da tela.
 * Uso: hostDirectives: [PauseOffscreen] — e no CSS do componente: :host(.offscreen) * { animation-play-state: paused }.
 */
@Directive({ selector: '[appPauseOffscreen]' })
export class PauseOffscreen {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      el.classList.add('offscreen');
      const io = new IntersectionObserver(([entry]) => el.classList.toggle('offscreen', !entry.isIntersecting), {
        rootMargin: '80px 0px',
      });
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
