import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Backend } from '../../core/backend';
import { BrlPipe } from '../../core/format';
import { ORDER_STATUSES, Order, OrderStatus, OrderUpdate, orderLines, statusLabel } from '../../core/models';
import { AdminTabs } from '../../shared/admin-tabs';

type Filter = OrderStatus | 'todos';

@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, DatePipe, BrlPipe, AdminTabs],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})
export class AdminOrders implements OnInit {
  private readonly backend = inject(Backend);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly statusLabel = statusLabel;
  protected readonly lines = orderLines;

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filter = signal<Filter>('todos');
  protected readonly search = signal('');
  protected readonly openId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected draft: OrderUpdate = { status: 'aguardando_pagamento', trackingCode: '', adminNote: '' };

  protected readonly counts = computed(() => {
    const counts: Record<string, number> = { todos: this.orders().length };
    for (const o of this.orders()) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  });

  protected readonly pendingTotal = computed(() =>
    this.orders()
      .filter((o) => o.status === 'aguardando_pagamento')
      .reduce((sum, o) => sum + o.totalCents, 0),
  );

  protected readonly visible = computed(() => {
    const filter = this.filter();
    const term = this.search().trim().toLowerCase();
    return this.orders().filter(
      (o) =>
        (filter === 'todos' || o.status === filter) &&
        (!term ||
          [o.code, o.customerName, o.customerUsername, o.customerEmail, o.customerPhone].some((v) =>
            v.toLowerCase().includes(term),
          )),
    );
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.orders.set(await this.backend.allOrders());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected toggle(order: Order): void {
    if (this.openId() === order.id) {
      this.openId.set(null);
      return;
    }
    this.draft = { status: order.status, trackingCode: order.trackingCode, adminNote: order.adminNote };
    this.saved.set(false);
    this.openId.set(order.id);
  }

  protected async save(order: Order, status?: OrderStatus): Promise<void> {
    if (status) this.draft.status = status;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      const updated = await this.backend.updateOrder(order.id, { ...this.draft });
      this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      this.saved.set(true);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  protected whatsapp(order: Order): string {
    let digits = order.customerPhone.replace(/\D/g, '');
    if (digits.length <= 11) digits = '55' + digits;
    const text = `Olá, ${order.customerName.split(' ')[0]}! Aqui é do Pausa para Sentir, sobre o seu pedido ${order.code}.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
}
