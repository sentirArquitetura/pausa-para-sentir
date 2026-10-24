import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AmbientSound } from './core/ambient-sound';
import { Cart } from './core/cart';
import { greeting } from './core/models';
import { SiteStore } from './core/site-store';
import { Toast } from './core/toast';
import { ItemDialog } from './shared/item-dialog';
import { SectionEditor } from './shared/section-editor/section-editor';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SectionEditor, ItemDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(SiteStore);
  protected readonly sound = inject(AmbientSound);
  protected readonly cart = inject(Cart);
  protected readonly toast = inject(Toast);
  /** "Bom dia/Boa tarde/Boa noite" — revisto a cada 5 minutos. */
  private readonly now = signal(new Date());
  protected readonly hello = computed(() => greeting(this.now()));
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly year = new Date().getFullYear();

  constructor() {
    // Na vitrine, o logo grande da abertura "passa" para o cabeçalho conforme a rolagem:
    // --logo-p vai de 0 (topo) a 1 (logo da abertura fora de vista). Nas outras páginas, 1.
    // Listener nativo e passivo: não aciona a detecção de mudanças a cada rolagem.
    afterNextRender(() => {
      setInterval(() => this.now.set(new Date()), 5 * 60_000);
      const root = document.documentElement;
      const update = () => {
        const home = this.router.url.split(/[?#]/)[0] === '/';
        const p = home ? Math.min(1, Math.max(0, (scrollY - 120) / 160)) : 1;
        root.style.setProperty('--logo-p', p.toFixed(3));
      };
      update();
      addEventListener('scroll', update, { passive: true });
      this.router.events.subscribe((e) => e instanceof NavigationEnd && update());
    });
  }

  protected toggleEdit(): void {
    this.store.editMode.update((v) => !v);
    if (!this.store.editMode()) this.store.editing.set(null);
    else this.router.navigateByUrl('/');
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.store.signOut();
    this.router.navigateByUrl('/');
  }
}
