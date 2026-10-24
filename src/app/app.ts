import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SiteStore } from './core/site-store';
import { SectionEditor } from './shared/section-editor/section-editor';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SectionEditor],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(SiteStore);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly year = new Date().getFullYear();

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
