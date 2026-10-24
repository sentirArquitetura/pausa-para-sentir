import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Backend } from '../../core/backend';
import { BrlPipe } from '../../core/format';
import { Order, statusLabel } from '../../core/models';

@Component({
  selector: 'app-my-orders',
  imports: [RouterLink, DatePipe, BrlPipe],
  template: `
    <div class="page">
      <div class="container narrow-wide">
        <p class="eyebrow">Minha conta</p>
        <h1 class="page-title">Meus pedidos</h1>

        @if (loading()) {
          <p class="muted">Carregando…</p>
        } @else if (error()) {
          <p class="alert">{{ error() }}</p>
        } @else {
          @for (o of orders(); track o.id) {
            <a class="card order" [routerLink]="['/meus-pedidos', o.id]">
              <div>
                <p class="code">{{ o.code }}</p>
                <p class="muted">{{ o.createdAt | date: 'dd/MM/y' }} · {{ o.quantity }} kit(s)</p>
              </div>
              <strong class="total">{{ o.totalCents | brl }}</strong>
              <span class="status {{ o.status }}">{{ statusLabel(o.status) }}</span>
            </a>
          } @empty {
            <div class="card">
              <p>Você ainda não fez nenhum pedido.</p>
              <a routerLink="/" fragment="kit" class="btn">Conhecer o kit</a>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .narrow-wide {
      max-width: 860px;
    }
    .order {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 1.5rem;
      align-items: center;
      text-decoration: none;
      margin-bottom: 1rem;
      transition: transform 0.2s;
      p {
        margin: 0;
      }
      &:hover {
        transform: translateY(-2px);
      }
      @media (max-width: 560px) {
        grid-template-columns: 1fr auto;
      }
    }
    .code {
      font-family: var(--serif);
      font-size: 1.5rem;
      color: var(--oliva);
    }
    .total {
      font-family: var(--serif);
      font-size: 1.4rem;
      font-weight: 500;
    }
  `,
})
export class MyOrders implements OnInit {
  private readonly backend = inject(Backend);
  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly statusLabel = statusLabel;

  async ngOnInit(): Promise<void> {
    try {
      this.orders.set(await this.backend.myOrders());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
