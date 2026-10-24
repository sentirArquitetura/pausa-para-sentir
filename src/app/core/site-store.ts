import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Backend } from './backend';
import { DEFAULT_SETTINGS, mergeContent } from './default-content';
import { SectionKey, SiteContent, StoreSettings } from './models';

/** Estado compartilhado da vitrine: conteúdo, configurações da loja e modo de edição. */
@Injectable({ providedIn: 'root' })
export class SiteStore {
  private readonly backend = inject(Backend);

  readonly user = this.backend.user;
  readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);
  readonly isDemo = this.backend.mode === 'demo';

  readonly content = signal<SiteContent>(mergeContent(null));
  readonly settings = signal<StoreSettings>(DEFAULT_SETTINGS);
  readonly loaded = signal(false);

  readonly editMode = signal(false);
  /** Section aberta no painel de edição. */
  readonly editing = signal<SectionKey | null>(null);
  readonly canEdit = computed(() => this.isAdmin() && this.editMode());

  readonly salesOpen = computed(() => this.settings().priceCents > 0 && !!this.settings().pixKey);

  async load(): Promise<void> {
    const [content, settings] = await Promise.all([
      this.backend.loadContent().catch(() => null),
      this.backend.loadSettings().catch(() => null),
    ]);
    this.content.set(mergeContent(content));
    this.settings.set({ ...DEFAULT_SETTINGS, ...settings });
    this.loaded.set(true);
  }

  async saveSection<K extends SectionKey>(key: K, value: SiteContent[K]): Promise<void> {
    const next = { ...this.content(), [key]: value };
    await this.backend.saveContent(next);
    this.content.set(next);
  }

  async saveSettings(settings: StoreSettings): Promise<void> {
    await this.backend.saveSettings(settings);
    this.settings.set(settings);
  }

  /** Aceita o login curto do admin ("pausa") além do e-mail. */
  signIn(login: string, password: string) {
    const trimmed = login.trim();
    const email =
      trimmed.toLowerCase() === environment.adminUsername ? environment.adminEmail : trimmed;
    return this.backend.signIn(email, password);
  }

  async signOut(): Promise<void> {
    this.editMode.set(false);
    this.editing.set(null);
    await this.backend.signOut();
  }
}
