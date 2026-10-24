import { DestroyRef, Directive, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/**
 * Faz o elemento surgir suavemente quando entra na tela.
 * Uso: <div appReveal> ou <div appReveal="200"> (atraso em ms).
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'reveal-init',
    '[class.revealed]': 'shown()',
    '[style.--reveal-delay]': 'delay()',
  },
})
export class Reveal {
  readonly appReveal = input<number | string>('');

  protected readonly shown = signal(false);
  protected readonly delay = computed(() => `${Number(this.appReveal()) || 0}ms`);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) {
        this.shown.set(true);
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.shown.set(true);
            io.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
