import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Backend } from '../../core/backend';
import { BrlPipe } from '../../core/format';
import { ORDER_STATUSES, Order, statusLabel } from '../../core/models';
import { SiteStore } from '../../core/site-store';
import { PixPayment } from '../../shared/pix-payment';

const FLOW = ORDER_STATUSES.filter((s) => s.value !== 'cancelado');

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, BrlPipe, PixPayment],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  private readonly backend = inject(Backend);
  protected readonly store = inject(SiteStore);

  readonly id = input.required<string>();

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly statusLabel = statusLabel;
  protected readonly flow = FLOW;

  protected readonly step = computed(() => {
    const status = this.order()?.status;
    return FLOW.findIndex((s) => s.value === status);
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.order.set(await this.backend.getOrder(this.id()));
    } finally {
      this.loading.set(false);
    }
  }

  protected reachedAt(status: string): string | undefined {
    return [...(this.order()?.history ?? [])].reverse().find((h) => h.status === status)?.at;
  }
}
