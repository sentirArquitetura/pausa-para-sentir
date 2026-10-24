import { Component, computed, input } from '@angular/core';
import { BrlPipe } from '../core/format';
import { CatalogItem, onSale, salePrice } from '../core/models';

/**
 * Preço de um produto/kit. Em promoção: "era R$ 199,90" riscado, menor e em cinza,
 * seguido do preço promocional.
 */
@Component({
  selector: 'app-price-tag',
  imports: [BrlPipe],
  template: `
    @if (sale()) {
      <span class="was">era <s>{{ item().priceCents | brl }}</s></span>
    }
    <span class="now">{{ price() | brl }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.15em 0.45em;
    }
    .was {
      font-family: var(--sans);
      font-size: 0.42em;
      letter-spacing: 0.02em;
      color: #8f918a;
      white-space: nowrap;
      s {
        text-decoration-thickness: 1px;
      }
    }
    .now {
      white-space: nowrap;
    }
  `,
})
export class PriceTag {
  readonly item = input.required<Pick<CatalogItem, 'priceCents' | 'promoActive' | 'promoPriceCents'>>();
  protected readonly sale = computed(() => onSale(this.item()));
  protected readonly price = computed(() => salePrice(this.item()));
}
