import { Component, computed, effect, inject, input, signal } from '@angular/core';
import QRCode from 'qrcode';
import { BrlPipe } from '../core/format';
import { buildPixPayload } from '../core/pix';
import { SiteStore } from '../core/site-store';

/** QR Code + "Pix copia e cola" para um valor e identificador (txid). */
@Component({
  selector: 'app-pix-payment',
  imports: [BrlPipe],
  template: `
    <div class="pix">
      <div class="qr">
        @if (qr()) {
          <img [src]="qr()" alt="QR Code Pix" width="240" height="240" />
        }
      </div>
      <div class="pix-info">
        <p class="amount">{{ amountCents() | brl }}</p>
        <p class="muted">
          Para <strong>{{ store.settings().merchantName }}</strong>
          @if (txid()) {
            · Pedido <strong>{{ txid() }}</strong>
          }
        </p>
        <ol class="steps">
          <li>Abra o app do seu banco e escolha <strong>Pix → Pagar com QR Code</strong>.</li>
          <li>Ou copie o código abaixo e use <strong>Pix copia e cola</strong>.</li>
          <li>Confira o valor e o nome do recebedor antes de confirmar.</li>
        </ol>
        <label class="field">
          <span>Pix copia e cola</span>
          <textarea readonly rows="3" [value]="payload()" (focus)="select($event)"></textarea>
        </label>
        <button type="button" class="btn" (click)="copy()">
          {{ copied() ? 'Código copiado ✓' : 'Copiar código Pix' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .pix {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 2rem;
      align-items: start;
    }
    @media (max-width: 700px) {
      .pix {
        grid-template-columns: 1fr;
      }
    }
    .qr {
      background: #fff;
      border-radius: var(--radius);
      border: 1px solid var(--linha);
      padding: 10px;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      max-width: 260px;
      justify-self: center;
      width: 100%;
    }
    .amount {
      font-family: var(--serif);
      font-size: 2.4rem;
      color: var(--oliva);
      margin: 0;
    }
    .steps {
      padding-left: 1.2rem;
      font-size: 0.95rem;
    }
    textarea {
      font-family: ui-monospace, monospace;
      font-size: 0.78rem;
      word-break: break-all;
      min-height: auto;
    }
  `,
})
export class PixPayment {
  protected readonly store = inject(SiteStore);

  readonly amountCents = input.required<number>();
  readonly txid = input<string>('');

  protected readonly payload = computed(() => {
    const s = this.store.settings();
    return buildPixPayload({
      key: s.pixKey,
      merchantName: s.merchantName,
      merchantCity: s.merchantCity,
      amountCents: this.amountCents(),
      txid: this.txid(),
    });
  });
  protected readonly qr = signal('');
  protected readonly copied = signal(false);

  constructor() {
    effect(() => {
      QRCode.toDataURL(this.payload(), { width: 480, margin: 1, color: { dark: '#2b3324', light: '#ffffff' } })
        .then((url) => this.qr.set(url))
        .catch(() => this.qr.set(''));
    });
  }

  protected select(event: Event): void {
    (event.target as HTMLTextAreaElement).select();
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.payload());
    } catch {
      // Navegadores sem permissão de clipboard: o texto fica selecionado para cópia manual.
      return;
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
