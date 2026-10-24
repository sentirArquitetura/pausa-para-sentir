import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Backend } from '../../core/backend';
import { Cart } from '../../core/cart';
import { BrlPipe } from '../../core/format';
import { CustomerProfile, emptyProfile, profileComplete } from '../../core/models';
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
  imports: [FormsModule, RouterLink, BrlPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly backend = inject(Backend);
  private readonly router = inject(Router);
  protected readonly store = inject(SiteStore);
  protected readonly cart = inject(Cart);

  protected readonly profile = computed(() => this.store.user()?.profile ?? emptyProfile());
  protected readonly complete = computed(() => profileComplete(this.profile()));
  /** Mostra o formulário quando faltam dados de entrega ou o cliente pediu para alterar. */
  protected readonly editing = signal(!profileComplete(this.store.user()?.profile));

  protected readonly busy = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly error = signal('');
  protected readonly cepStatus = signal('');

  protected form: CustomerProfile = structuredClone(this.profile());

  protected edit(): void {
    this.form = structuredClone(this.profile());
    this.error.set('');
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  /** Preenche o endereço a partir do CEP (ViaCEP, serviço público e gratuito). */
  protected async lookupCep(): Promise<void> {
    const cep = this.form.address.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.cepStatus.set('Buscando endereço…');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await res.json()) as ViaCep;
      if (data.erro) throw new Error();
      const a = this.form.address;
      Object.assign(a, {
        cep: cep.replace(/(\d{5})(\d{3})/, '$1-$2'),
        street: data.logradouro || a.street,
        district: data.bairro || a.district,
        city: data.localidade,
        state: data.uf,
      });
      this.cepStatus.set('');
    } catch {
      this.cepStatus.set('CEP não encontrado. Preencha o endereço manualmente.');
    }
  }

  protected async saveProfile(f: NgForm): Promise<void> {
    if (f.invalid) return;
    const p = this.form;
    const clean: CustomerProfile = {
      name: p.name.trim(),
      email: p.email.trim(),
      phone: p.phone.trim(),
      whatsapp: !!p.phone.trim() && p.whatsapp,
      address: {
        ...p.address,
        state: p.address.state.trim().toUpperCase(),
      },
    };
    this.savingProfile.set(true);
    this.error.set('');
    try {
      await this.store.saveProfile(clean);
      this.editing.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async placeOrder(): Promise<void> {
    const items = this.cart.rows().map((r) => ({ itemId: r.item.id, quantity: r.quantity }));
    if (this.editing() || !this.store.salesOpen() || !items.length) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const order = await this.backend.createOrder({ items });
      this.cart.clear();
      this.router.navigate(['/meus-pedidos', order.id]);
    } catch (e) {
      this.error.set((e as Error).message);
      this.busy.set(false);
    }
  }
}
