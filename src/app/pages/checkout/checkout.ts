import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Backend } from '../../core/backend';
import { BrlPipe, LinesPipe, RichTextPipe } from '../../core/format';
import { Address } from '../../core/models';
import { SiteStore } from '../../core/site-store';

interface ViaCep {
  erro?: boolean;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, BrlPipe, LinesPipe, RichTextPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly backend = inject(Backend);
  private readonly router = inject(Router);
  protected readonly store = inject(SiteStore);

  protected readonly quantity = signal(1);
  protected readonly total = computed(() => this.quantity() * this.store.settings().priceCents);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly cepStatus = signal('');

  protected readonly form = {
    name: this.store.user()?.name ?? '',
    phone: this.store.user()?.phone ?? '',
  };
  protected readonly address: Address = {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  };

  protected changeQty(delta: number): void {
    this.quantity.update((q) => Math.min(10, Math.max(1, q + delta)));
  }

  /** Preenche o endereço a partir do CEP (ViaCEP, serviço público e gratuito). */
  protected async lookupCep(): Promise<void> {
    const cep = this.address.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.cepStatus.set('Buscando endereço…');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await res.json()) as ViaCep;
      if (data.erro) throw new Error();
      Object.assign(this.address, {
        street: data.logradouro || this.address.street,
        district: data.bairro || this.address.district,
        city: data.localidade,
        state: data.uf,
      });
      this.cepStatus.set('');
    } catch {
      this.cepStatus.set('CEP não encontrado. Preencha o endereço manualmente.');
    }
  }

  protected async submit(f: NgForm): Promise<void> {
    if (f.invalid || !this.store.salesOpen()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const order = await this.backend.createOrder({
        customerName: this.form.name.trim(),
        customerPhone: this.form.phone.trim(),
        address: { ...this.address, state: this.address.state.toUpperCase() },
        quantity: this.quantity(),
      });
      this.router.navigate(['/meus-pedidos', order.id]);
    } catch (e) {
      this.error.set((e as Error).message);
      this.busy.set(false);
    }
  }
}
