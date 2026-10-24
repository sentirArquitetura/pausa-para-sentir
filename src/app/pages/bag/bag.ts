import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cart } from '../../core/cart';
import { BrlPipe } from '../../core/format';
import { SiteStore } from '../../core/site-store';

@Component({
  selector: 'app-bag',
  imports: [RouterLink, BrlPipe],
  template: `
    <div class="page">
      <div class="container narrow-wide">
        <p class="eyebrow">Sua sacola</p>
        <h1 class="page-title">O que vai na sua pausa</h1>

        @if (cart.rows().length) {
          <div class="card">
            @for (r of cart.rows(); track r.item.id) {
              <div class="line">
                <button type="button" class="thumb" (click)="cart.viewing.set(r.item.id)" [attr.aria-label]="'Ver ' + r.item.name">
                  @if (r.item.images[0]; as img) {
                    <img [src]="img" alt="" />
                  }
                </button>
                <div class="what">
                  <p class="name">{{ r.item.name }}</p>
                  <p class="muted small">
                    {{ r.item.kind === 'kit' ? 'Kit' : 'Produto' }} · {{ r.item.priceCents | brl }} cada
                  </p>
                </div>
                <div class="stepper">
                  <button type="button" (click)="cart.setQuantity(r.item.id, r.quantity - 1)" aria-label="Diminuir">−</button>
                  <span>{{ r.quantity }}</span>
                  <button type="button" (click)="cart.setQuantity(r.item.id, r.quantity + 1)" [disabled]="r.quantity >= 20" aria-label="Aumentar">+</button>
                </div>
                <strong class="sub">{{ r.totalCents | brl }}</strong>
                <button type="button" class="remove" (click)="cart.remove(r.item.id)" aria-label="Remover">×</button>
              </div>
            }
            <div class="total">
              <span>Total</span>
              <strong>{{ cart.totalCents() | brl }}</strong>
            </div>
            <p class="muted small">Pagamento via Pix. Na próxima etapa você confirma os dados de entrega.</p>
            <div class="actions">
              <a routerLink="/" fragment="loja" class="btn btn-ghost">Continuar escolhendo</a>
              <a routerLink="/comprar" class="btn" [class.disabled]="!store.salesOpen()">Finalizar compra</a>
            </div>
          </div>
        } @else {
          <div class="card empty">
            <p>Sua sacola está vazia — por enquanto.</p>
            <a routerLink="/" fragment="kit" class="btn">Conhecer o kit</a>
            <a routerLink="/" fragment="loja" class="btn btn-ghost">Ver a loja</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .narrow-wide {
      max-width: 860px;
    }
    .line {
      display: grid;
      grid-template-columns: 72px 1fr auto auto auto;
      gap: 1rem;
      align-items: center;
      padding: 0.9rem 0;
      border-bottom: 1px solid var(--linha);
      @media (max-width: 600px) {
        grid-template-columns: 56px 1fr auto;
        .sub {
          grid-column: 2;
        }
      }
    }
    .thumb {
      width: 100%;
      aspect-ratio: 1;
      padding: 0;
      border: 0;
      border-radius: 8px;
      overflow: hidden;
      background: var(--creme);
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    .name {
      font-family: var(--serif);
      font-size: 1.3rem;
      color: var(--oliva);
      margin: 0;
    }
    .small {
      font-size: 0.85rem;
      margin: 0;
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      button {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid var(--salvia);
        background: none;
        color: var(--oliva);
        cursor: pointer;
        &:disabled {
          opacity: 0.35;
        }
      }
    }
    .sub {
      font-weight: 400;
      min-width: 6.5rem;
      text-align: right;
    }
    .remove {
      border: 0;
      background: none;
      font-size: 1.5rem;
      color: var(--tinta-suave);
      cursor: pointer;
    }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1.2rem 0 0.6rem;
      strong {
        font-family: var(--serif);
        font-size: 2.2rem;
        font-weight: 500;
        color: var(--oliva);
      }
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.8rem;
      flex-wrap: wrap;
      margin-top: 1.2rem;
    }
    .disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    .empty {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      align-items: center;
      p {
        width: 100%;
      }
    }
  `,
})
export class Bag {
  protected readonly cart = inject(Cart);
  protected readonly store = inject(SiteStore);
}
