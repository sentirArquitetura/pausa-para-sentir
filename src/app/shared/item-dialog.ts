import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Cart } from '../core/cart';
import { BrlPipe, RichTextPipe } from '../core/format';
import { SiteStore } from '../core/site-store';
import { Toast } from '../core/toast';
import { LitPhoto } from './lit-photo';

/** Janela de detalhes de um produto ou kit: fotos, descrição, conteúdo e "adicionar à sacola". */
@Component({
  selector: 'app-item-dialog',
  imports: [BrlPipe, RichTextPipe, LitPhoto],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (item(); as it) {
      <div class="backdrop" (click)="close()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="it.name">
        <button type="button" class="close" aria-label="Fechar" (click)="close()">×</button>
        <div class="media">
          @if (it.images.length) {
            <app-lit-photo class="main" [src]="it.images[photo()] ?? it.images[0]" [alt]="it.name" loading="eager" />
            @if (it.images.length > 1) {
              <div class="thumbs">
                @for (src of it.images; track $index) {
                  <button type="button" [class.on]="$index === photo()" (click)="photo.set($index)" aria-label="Ver foto">
                    <img [src]="src" alt="" />
                  </button>
                }
              </div>
            }
          } @else {
            <div class="main placeholder">Pausa para Sentir</div>
          }
        </div>
        <div class="info">
          <p class="eyebrow">{{ it.kind === 'kit' ? 'Kit' : 'Produto' }}</p>
          <h2>{{ it.name }}</h2>
          @if (it.description) {
            <div class="desc" [innerHTML]="it.description | rich"></div>
          }
          @if (it.kind === 'kit' && it.components.length) {
            <p class="label">O que vem no kit</p>
            <ul class="components">
              @for (c of it.components; track c.productId) {
                <li><span>{{ c.quantity }}×</span> {{ c.name }}</li>
              }
            </ul>
          }
          <p class="price">{{ it.priceCents | brl }}</p>
          <div class="buy">
            <div class="stepper">
              <button type="button" (click)="qty.set(qty() - 1)" [disabled]="qty() <= 1" aria-label="Diminuir">−</button>
              <span aria-live="polite">{{ qty() }}</span>
              <button type="button" (click)="qty.set(qty() + 1)" [disabled]="qty() >= 20" aria-label="Aumentar">+</button>
            </div>
            <button type="button" class="btn" (click)="add()">Adicionar à sacola</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 95;
      background: rgba(29, 35, 24, 0.55);
      backdrop-filter: blur(3px);
    }
    .dialog {
      position: fixed;
      z-index: 96;
      left: 50%;
      top: 50%;
      translate: -50% -50%;
      width: min(920px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 2rem;
      padding: clamp(1.2rem, 3vw, 2.2rem);
      background: var(--papel);
      border-radius: var(--radius);
      box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.6);
      animation: pop 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
      @media (max-width: 720px) {
        grid-template-columns: 1fr;
        gap: 1.2rem;
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        scale: 0.97;
      }
    }
    .close {
      position: absolute;
      top: 0.6rem;
      right: 0.8rem;
      border: 0;
      background: none;
      font-size: 2rem;
      line-height: 1;
      color: var(--oliva);
      cursor: pointer;
      z-index: 1;
    }
    .main {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 10px;
    }
    .placeholder {
      display: grid;
      place-items: center;
      background: var(--creme);
      font-family: var(--serif);
      color: var(--salvia);
    }
    .thumbs {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.7rem;
      flex-wrap: wrap;
      button {
        width: 58px;
        height: 58px;
        padding: 0;
        border: 2px solid transparent;
        border-radius: 8px;
        overflow: hidden;
        opacity: 0.6;
        cursor: pointer;
        background: none;
        &.on,
        &:hover {
          opacity: 1;
          border-color: var(--terracota);
        }
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    h2 {
      font-size: clamp(1.9rem, 3.4vw, 2.6rem);
    }
    .desc {
      color: var(--tinta-suave);
    }
    .label {
      font-size: 0.72rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--tinta-suave);
      margin: 1rem 0 0.4rem;
    }
    .components {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
      li {
        padding: 0.35rem 0;
        border-bottom: 1px solid var(--linha);
      }
      span {
        font-family: var(--serif);
        color: var(--terracota);
        margin-right: 0.4rem;
      }
    }
    .price {
      font-family: var(--serif);
      font-size: 2.2rem;
      color: var(--oliva);
      margin: 0.8rem 0;
    }
    .buy {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      button {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--salvia);
        background: none;
        color: var(--oliva);
        font-size: 1.1rem;
        cursor: pointer;
        &:disabled {
          opacity: 0.35;
          cursor: default;
        }
      }
    }
  `,
})
export class ItemDialog {
  private readonly cart = inject(Cart);
  private readonly store = inject(SiteStore);
  private readonly toast = inject(Toast);

  protected readonly item = computed(() => {
    const id = this.cart.viewing();
    return id ? (this.store.item(id) ?? null) : null;
  });
  protected readonly photo = signal(0);
  protected readonly qty = signal(1);

  constructor() {
    effect(() => {
      this.item();
      untracked(() => {
        this.photo.set(0);
        this.qty.set(1);
      });
    });
  }

  protected close(): void {
    this.cart.viewing.set(null);
  }

  protected add(): void {
    const it = this.item();
    if (!it) return;
    this.cart.add(it.id, this.qty());
    this.close();
    this.toast.show(`${it.name} está na sua sacola.`, { label: 'Ver sacola', url: '/sacola' });
  }
}
