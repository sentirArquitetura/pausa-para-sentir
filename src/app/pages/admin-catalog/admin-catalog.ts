import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrlPipe, formatBRL, parseBRL } from '../../core/format';
import { CatalogItem, CatalogKind, newCatalogItem } from '../../core/models';
import { SiteStore } from '../../core/site-store';
import { AdminTabs } from '../../shared/admin-tabs';
import { FieldDef } from '../../shared/section-editor/schema';
import { EditorField } from '../../shared/section-editor/editor-field';

type Filter = 'todos' | CatalogKind;

/** Cadastro de produtos avulsos e de kits montados com eles. */
@Component({
  selector: 'app-admin-catalog',
  imports: [FormsModule, BrlPipe, AdminTabs, EditorField],
  templateUrl: './admin-catalog.html',
  styleUrl: './admin-catalog.scss',
})
export class AdminCatalog {
  protected readonly store = inject(SiteStore);

  protected readonly filter = signal<Filter>('todos');
  protected readonly visible = computed(() => {
    const f = this.filter();
    return this.store.catalog().filter((i) => f === 'todos' || i.kind === f);
  });
  protected readonly products = computed(() => this.store.catalog().filter((i) => i.kind === 'product'));

  protected readonly imagesField: FieldDef = {
    key: 'images',
    label: 'Fotos',
    type: 'images',
    hint: 'A primeira foto é a capa. As imagens são reduzidas automaticamente antes do envio.',
  };

  /** Rascunho em edição (null = nenhum). */
  protected form: CatalogItem | null = null;
  protected price = '';
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');

  protected open(item: CatalogItem): void {
    this.form = structuredClone(item);
    this.price = item.priceCents ? formatBRL(item.priceCents).replace(/^R\$\s*/, '') : '';
    this.error.set('');
    this.message.set('');
    this.editingId.set(item.id || 'novo');
  }

  protected create(kind: CatalogKind): void {
    const next = newCatalogItem(kind);
    next.sort = (Math.max(0, ...this.store.catalog().map((i) => i.sort)) || 0) + 10;
    this.open(next);
  }

  protected close(): void {
    this.form = null;
    this.editingId.set(null);
  }

  protected componentsTotal(): number {
    if (!this.form) return 0;
    return this.form.components.reduce((sum, c) => {
      const p = this.store.item(c.productId);
      return sum + (p?.priceCents ?? 0) * c.quantity;
    }, 0);
  }

  protected available(): CatalogItem[] {
    const used = new Set(this.form?.components.map((c) => c.productId));
    return this.products().filter((p) => !used.has(p.id));
  }

  protected addComponent(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const product = this.store.item(select.value);
    select.value = '';
    if (!product || !this.form) return;
    this.form.components = [...this.form.components, { productId: product.id, name: product.name, quantity: 1 }];
  }

  protected removeComponent(productId: string): void {
    if (!this.form) return;
    this.form.components = this.form.components.filter((c) => c.productId !== productId);
  }

  protected async save(): Promise<void> {
    const form = this.form;
    if (!form) return;
    const priceCents = this.price.trim() ? parseBRL(this.price) : 0;
    if (!form.name.trim()) return this.error.set('Dê um nome ao item.');
    if (Number.isNaN(priceCents)) return this.error.set('Preço inválido. Use o formato 89,90.');
    if (form.active && priceCents <= 0) return this.error.set('Para colocar à venda, informe um preço.');
    if (form.kind === 'kit' && !form.components.length) return this.error.set('Escolha os produtos que compõem o kit.');

    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.store.saveCatalogItem({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        priceCents,
        // Atualiza o nome gravado de cada produto do kit.
        components: form.components.map((c) => ({
          ...c,
          name: this.store.item(c.productId)?.name ?? c.name,
          quantity: Math.max(1, Math.floor(c.quantity || 1)),
        })),
        featured: form.kind === 'kit' && form.featured,
      });
      this.open(saved);
      this.message.set('Salvo.');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const form = this.form;
    if (!form?.id) return;
    if (!confirm(`Excluir "${form.name}"? Pedidos já feitos não são afetados.`)) return;
    this.saving.set(true);
    try {
      await this.store.deleteCatalogItem(form.id);
      this.close();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
