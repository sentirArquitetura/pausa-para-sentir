import { Component, inject, signal } from '@angular/core';
import { SiteStore } from '../../core/site-store';

/** Animações do ritual (por enquanto: a maré que traz os objetos de cada sentido). */
@Component({
  selector: 'app-ritual-settings',
  template: `
    <section class="card">
      <h2>Animações do ritual</h2>
      <label class="check">
        <input type="checkbox" [checked]="tide()" (change)="toggle($any($event.target).checked)" [disabled]="saving()" />
        <span>
          <strong>Maré</strong>
          <small>
            Ao trocar de sentido, o objeto (livro, cartão, chá, escalda-pés, vela) nasce pequeno no horizonte,
            vem trazido pelas ondas crescendo até o tamanho normal e fica boiando. Desligado, ele apenas aparece.
          </small>
        </span>
      </label>
      @if (message()) {
        <p class="ok">{{ message() }}</p>
      }
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
    </section>
  `,
  styles: `
    h2 {
      font-size: 1.6rem;
    }
    .check {
      display: flex;
      gap: 0.8rem;
      align-items: flex-start;
      cursor: pointer;
      input {
        width: 20px;
        height: 20px;
        margin-top: 0.2rem;
        accent-color: var(--oliva);
        flex-shrink: 0;
      }
      span {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      small {
        color: var(--tinta-suave);
        line-height: 1.45;
      }
    }
    .ok {
      margin: 0.8rem 0 0;
      color: var(--oliva);
    }
  `,
})
export class RitualSettings {
  private readonly store = inject(SiteStore);
  protected readonly tide = signal(this.store.content().senses.tide);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');

  /** Salva na hora, ao marcar/desmarcar. */
  protected async toggle(on: boolean): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.store.saveSection('senses', { ...this.store.content().senses, tide: on });
      this.tide.set(on);
      this.message.set(on ? 'Maré ligada ✓' : 'Maré desligada ✓');
    } catch (e) {
      this.error.set((e as Error).message);
      this.tide.set(!on);
    } finally {
      this.saving.set(false);
    }
  }
}
