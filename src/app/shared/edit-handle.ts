import { Component, inject, input } from '@angular/core';
import { SectionKey } from '../core/models';
import { SiteStore } from '../core/site-store';

/** Botão "Editar" que aparece no canto da section quando o admin ativa o modo de edição. */
@Component({
  selector: 'app-edit-handle',
  template: `
    @if (store.canEdit()) {
      <button type="button" class="edit-handle" (click)="store.editing.set(section())">
        ✎ Editar seção
      </button>
    }
  `,
  styles: `
    .edit-handle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 5;
      padding: 0.55em 1.1em;
      border-radius: 999px;
      border: 0;
      background: var(--terracota);
      color: #fff;
      font-family: var(--sans);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.4);
    }
    .edit-handle:hover {
      background: #9d523b;
    }
  `,
})
export class EditHandle {
  protected readonly store = inject(SiteStore);
  readonly section = input.required<SectionKey>();
}
