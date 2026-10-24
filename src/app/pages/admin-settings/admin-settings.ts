import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { SiteStore } from '../../core/site-store';
import { AdminTabs } from '../../shared/admin-tabs';
import { PixPayment } from '../../shared/pix-payment';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule, AdminTabs, PixPayment],
  templateUrl: './admin-settings.html',
  styles: `
    .settings-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 2rem;
      align-items: start;
      @media (max-width: 960px) {
        grid-template-columns: 1fr;
      }
    }
    h2 {
      font-size: 1.6rem;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: flex-end;
    }
  `,
})
export class AdminSettings {
  protected readonly store = inject(SiteStore);

  protected readonly form = { ...this.store.settings() };
  protected price = (this.form.priceCents / 100).toFixed(2).replace('.', ',');

  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');

  protected async save(f: NgForm): Promise<void> {
    if (f.invalid) return;
    const raw = this.price.trim();
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const priceCents = Math.round(Number(normalized) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      this.error.set('Preço inválido. Use o formato 199,90.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.store.saveSettings({ ...this.form, priceCents });
      this.message.set('Configurações salvas.');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
