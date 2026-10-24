import { Injectable, computed, inject, signal } from '@angular/core';
import { Backend } from './backend';
import { DEFAULT_SETTINGS, mergeContent } from './default-content';
import {
  CatalogItem,
  CustomerProfile,
  SectionKey,
  SiteContent,
  StoreSettings,
  normalizeUsername,
  sectionOrder,
} from './models';

/** Estado compartilhado da vitrine: conteúdo, catálogo, configurações da loja e modo de edição. */
@Injectable({ providedIn: 'root' })
export class SiteStore {
  private readonly backend = inject(Backend);

  readonly user = this.backend.user;
  readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);
  readonly isDemo = this.backend.mode === 'demo';

  readonly content = signal<SiteContent>(mergeContent(null));
  readonly settings = signal<StoreSettings>(DEFAULT_SETTINGS);
  /** Para o admin inclui itens inativos; para os demais, só o que está à venda. */
  readonly catalog = signal<CatalogItem[]>([]);
  readonly loaded = signal(false);

  readonly editMode = signal(false);
  /** Section aberta no painel de edição. */
  readonly editing = signal<SectionKey | null>(null);
  readonly canEdit = computed(() => this.isAdmin() && this.editMode());

  /** À venda de fato: ativo e com preço. */
  readonly forSale = computed(() => this.catalog().filter((i) => i.active && i.priceCents > 0));
  readonly featuredKit = computed(
    () => this.forSale().find((i) => i.kind === 'kit' && i.featured) ?? this.forSale().find((i) => i.kind === 'kit') ?? null,
  );
  /** Itens da loja além do kit principal. */
  readonly shopItems = computed(() => {
    const featured = this.featuredKit();
    return this.forSale().filter((i) => i.id !== featured?.id);
  });
  readonly salesOpen = computed(() => !!this.settings().pixKey && this.forSale().length > 0);

  async load(): Promise<void> {
    const [content, settings] = await Promise.all([
      this.backend.loadContent().catch(() => null),
      this.backend.loadSettings().catch(() => null),
      this.reloadCatalog(),
    ]);
    this.content.set(mergeContent(content));
    this.settings.set({ ...DEFAULT_SETTINGS, ...settings });
    this.loaded.set(true);
  }

  /** Recarrega o catálogo (ex.: depois do login do admin, para ver os inativos). */
  async reloadCatalog(): Promise<void> {
    this.catalog.set(await this.backend.loadCatalog().catch(() => []));
  }

  item(id: string): CatalogItem | undefined {
    return this.catalog().find((i) => i.id === id);
  }

  async saveSection<K extends SectionKey>(key: K, value: SiteContent[K]): Promise<void> {
    const next = { ...this.content(), [key]: value };
    await this.backend.saveContent(next);
    this.content.set(next);
  }

  /** Seções visíveis, na ordem configurada. */
  readonly sections = computed(() => {
    const layout = this.content().layout;
    return sectionOrder(layout).filter((k) => !layout.hidden.includes(k));
  });

  async saveLayout(layout: SiteContent['layout']): Promise<void> {
    const next = { ...this.content(), layout };
    await this.backend.saveContent(next);
    this.content.set(next);
  }

  async saveSettings(settings: StoreSettings): Promise<void> {
    await this.backend.saveSettings(settings);
    this.settings.set(settings);
  }

  async saveCatalogItem(item: CatalogItem): Promise<CatalogItem> {
    const saved = await this.backend.saveCatalogItem(item);
    await this.reloadCatalog();
    return saved;
  }

  async deleteCatalogItem(id: string): Promise<void> {
    await this.backend.deleteCatalogItem(id);
    await this.reloadCatalog();
  }

  async signIn(username: string, password: string) {
    const user = await this.backend.signIn(normalizeUsername(username), password);
    if (user.isAdmin) await this.reloadCatalog();
    return user;
  }

  signUp(username: string, password: string) {
    return this.backend.signUp(normalizeUsername(username), password);
  }

  saveProfile(profile: CustomerProfile) {
    return this.backend.saveProfile(profile);
  }

  async signOut(): Promise<void> {
    this.editMode.set(false);
    this.editing.set(null);
    await this.backend.signOut();
    await this.reloadCatalog();
  }
}
