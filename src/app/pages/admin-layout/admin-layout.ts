import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_SECTION_ORDER, SectionKey, sectionOrder } from '../../core/models';
import { SiteStore } from '../../core/site-store';
import { AdminTabs } from '../../shared/admin-tabs';
import { SECTION_SCHEMA } from '../../shared/section-editor/schema';

/** Ordem e visibilidade das seções da vitrine. */
@Component({
  selector: 'app-admin-layout',
  imports: [AdminTabs, RouterLink],
  template: `
    <div class="page">
      <div class="container narrow-wide">
        <p class="eyebrow">Administração</p>
        <h1 class="page-title">Seções da vitrine</h1>
        <app-admin-tabs />

        <p class="muted intro">
          Use as setas para mudar a ordem e o botão ao lado para mostrar ou ocultar cada seção. Seções ocultas
          continuam guardadas — é só exibir de novo. O conteúdo de cada uma se edita na própria
          <a routerLink="/">vitrine</a>, com “Editar vitrine” ligado.
        </p>

        <ol class="sections">
          @for (key of order(); track key; let i = $index, first = $first, last = $last) {
            <li [class.off]="hidden().includes(key)">
              <span class="pos">{{ i + 1 }}</span>
              <span class="label">
                {{ label(key) }}
                @if (key === 'senses') {
                  <small>céu, mar, lua e as animações do ritual</small>
                }
              </span>
              <div class="move">
                <button type="button" (click)="move(i, -1)" [disabled]="first" aria-label="Subir">↑</button>
                <button type="button" (click)="move(i, 1)" [disabled]="last" aria-label="Descer">↓</button>
              </div>
              <button type="button" class="toggle" [class.on]="!hidden().includes(key)" (click)="toggle(key)">
                {{ hidden().includes(key) ? 'Oculta' : 'Visível' }}
              </button>
            </li>
          }
        </ol>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }
        <div class="actions">
          <button type="button" class="link-btn" (click)="reset()">Voltar ao padrão</button>
          @if (saved()) {
            <span class="ok">Salvo ✓</span>
          }
          <button type="button" class="btn" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .narrow-wide {
      max-width: 760px;
    }
    .intro {
      margin-bottom: 1.5rem;
    }
    .sections {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.5rem;
    }
    li {
      display: grid;
      grid-template-columns: 2rem 1fr auto auto;
      gap: 1rem;
      align-items: center;
      padding: 0.8rem 1rem;
      border: 1px solid var(--linha);
      border-radius: 12px;
      background: #fffdf9;
      transition: opacity 0.3s;
      &.off {
        opacity: 0.55;
        background: transparent;
      }
    }
    .pos {
      font-family: var(--serif);
      font-size: 1.4rem;
      color: var(--terracota);
    }
    .label {
      font-family: var(--serif);
      font-size: 1.25rem;
      color: var(--oliva);
      small {
        display: block;
        font-family: var(--sans);
        font-size: 0.8rem;
        color: var(--tinta-suave);
      }
    }
    .move {
      display: flex;
      gap: 0.3rem;
      button {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--salvia);
        background: none;
        color: var(--oliva);
        cursor: pointer;
        &:disabled {
          opacity: 0.3;
          cursor: default;
        }
      }
    }
    .toggle {
      min-width: 6.5rem;
      padding: 0.4em 1em;
      border-radius: 999px;
      border: 1px solid var(--linha);
      background: none;
      font: inherit;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--tinta-suave);
      cursor: pointer;
      &.on {
        background: var(--oliva);
        border-color: var(--oliva);
        color: var(--creme);
      }
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      .link-btn {
        margin-right: auto;
      }
    }
    .ok {
      color: var(--oliva);
    }
    @media (max-width: 560px) {
      li {
        grid-template-columns: 1.5rem 1fr auto;
      }
      .toggle {
        grid-column: 2 / -1;
        justify-self: start;
      }
    }
  `,
})
export class AdminLayout {
  private readonly store = inject(SiteStore);

  protected readonly order = signal<SectionKey[]>(sectionOrder(this.store.content().layout));
  protected readonly hidden = signal<SectionKey[]>([...this.store.content().layout.hidden]);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');

  protected label(key: SectionKey): string {
    return SECTION_SCHEMA[key].label;
  }

  protected move(index: number, delta: number): void {
    this.order.update((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
    this.saved.set(false);
  }

  protected toggle(key: SectionKey): void {
    this.hidden.update((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));
    this.saved.set(false);
  }

  protected reset(): void {
    this.order.set([...DEFAULT_SECTION_ORDER]);
    this.hidden.set([]);
    this.saved.set(false);
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.store.saveLayout({ order: this.order(), hidden: this.hidden() });
      this.saved.set(true);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
