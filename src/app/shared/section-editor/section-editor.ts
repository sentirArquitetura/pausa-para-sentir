import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { SiteStore } from '../../core/site-store';
import { SiteContent } from '../../core/models';
import { EditorField } from './editor-field';
import { SECTION_SCHEMA } from './schema';

type Draft = Record<string, any>;

/** Painel lateral onde o admin edita os textos e imagens de uma section. */
@Component({
  selector: 'app-section-editor',
  imports: [EditorField],
  templateUrl: './section-editor.html',
  styleUrl: './section-editor.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export class SectionEditor {
  protected readonly store = inject(SiteStore);

  protected readonly def = computed(() => {
    const key = this.store.editing();
    return key ? SECTION_SCHEMA[key] : null;
  });
  protected readonly draft = signal<Draft | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly openItem = signal(0);

  constructor() {
    effect(() => {
      const key = this.store.editing();
      untracked(() => {
        this.draft.set(key ? structuredClone(this.store.content()[key]) : null);
        this.error.set('');
        this.openItem.set(0);
      });
    });
  }

  protected items(): Draft[] {
    const items = this.def()?.items;
    return items ? (this.draft()?.[items.key] ?? []) : [];
  }

  protected set(key: string, value: unknown): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected setItem(index: number, key: string, value: unknown): void {
    const itemsKey = this.def()!.items!.key;
    this.draft.update((d) => {
      const items = [...(d![itemsKey] as Draft[])];
      items[index] = { ...items[index], [key]: value };
      return { ...d, [itemsKey]: items };
    });
  }

  protected close(): void {
    if (!this.saving()) this.store.editing.set(null);
  }

  protected async save(): Promise<void> {
    const key = this.store.editing();
    const draft = this.draft();
    if (!key || !draft) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.store.saveSection(key, draft as SiteContent[typeof key]);
      this.store.editing.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
