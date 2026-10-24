import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cart } from '../../core/cart';
import { BrlPipe, LinesPipe, RichTextPipe } from '../../core/format';
import { SiteStore } from '../../core/site-store';
import { Toast } from '../../core/toast';
import { EditHandle } from '../../shared/edit-handle';
import { Reveal } from '../../shared/reveal';
import { SeaSky } from './senses/sea-sky';
import { SensesRitual } from './senses/senses-ritual';

@Component({
  selector: 'app-home',
  imports: [RouterLink, RichTextPipe, LinesPipe, BrlPipe, EditHandle, Reveal, SeaSky, SensesRitual],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly store = inject(SiteStore);
  protected readonly cart = inject(Cart);
  private readonly toast = inject(Toast);
  protected readonly c = this.store.content;

  protected readonly kitImages = computed(() => {
    const kit = this.c().kit;
    return [kit.image, ...kit.gallery].filter(Boolean);
  });
  private readonly selected = signal<string | null>(null);
  protected readonly kitImage = computed(() => {
    const selected = this.selected();
    return selected && this.kitImages().includes(selected) ? selected : this.kitImages()[0];
  });

  protected select(src: string): void {
    this.selected.set(src);
  }

  protected addToBag(id: string, name: string): void {
    this.cart.add(id);
    this.toast.show(`${name} está na sua sacola.`, { label: 'Ver sacola', url: '/sacola' });
  }
}
