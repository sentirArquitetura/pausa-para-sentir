import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CartLine, CatalogItem } from './models';
import { SiteStore } from './site-store';

const KEY = 'pps.cart';

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export interface CartRow {
  item: CatalogItem;
  quantity: number;
  totalCents: number;
}

/** Sacola de compras. Fica guardada neste navegador até a compra ser concluída. */
@Injectable({ providedIn: 'root' })
export class Cart {
  private readonly store = inject(SiteStore);

  readonly lines = signal<CartLine[]>(readCart());
  /** Item aberto na janela de detalhes (id), ou null. */
  readonly viewing = signal<string | null>(null);

  /** Só o que ainda está à venda (itens retirados do catálogo somem da sacola). */
  readonly rows = computed<CartRow[]>(() =>
    this.lines()
      .map((l) => ({ item: this.store.forSale().find((i) => i.id === l.itemId), quantity: l.quantity }))
      .filter((r): r is { item: CatalogItem; quantity: number } => !!r.item)
      .map((r) => ({ ...r, totalCents: r.item.priceCents * r.quantity })),
  );
  readonly count = computed(() => this.rows().reduce((n, r) => n + r.quantity, 0));
  readonly totalCents = computed(() => this.rows().reduce((n, r) => n + r.totalCents, 0));

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.lines()));
      } catch {
        // Sem armazenamento (navegação privada): a sacola vale só nesta visita.
      }
    });
  }

  add(itemId: string, quantity = 1): void {
    this.lines.update((lines) => {
      const found = lines.find((l) => l.itemId === itemId);
      if (found) return lines.map((l) => (l === found ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l));
      return [...lines, { itemId, quantity: Math.min(20, quantity) }];
    });
  }

  setQuantity(itemId: string, quantity: number): void {
    if (quantity < 1) return this.remove(itemId);
    this.lines.update((lines) => lines.map((l) => (l.itemId === itemId ? { ...l, quantity: Math.min(20, quantity) } : l)));
  }

  remove(itemId: string): void {
    this.lines.update((lines) => lines.filter((l) => l.itemId !== itemId));
  }

  clear(): void {
    this.lines.set([]);
  }
}
