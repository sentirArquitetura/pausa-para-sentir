import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Backend } from './backend';
import { DEFAULT_SETTINGS, seedCatalog } from './default-content';
import {
  AppUser,
  CatalogItem,
  CustomerProfile,
  NewOrder,
  Order,
  OrderItem,
  OrderUpdate,
  SiteContent,
  StoreSettings,
  UserSummary,
  emptyProfile,
  profileComplete,
  salePrice,
} from './models';

interface StoredUser extends AppUser {
  passwordHash: string;
  createdAt?: string;
}

// v2: login por username + perfil de entrega (formato antigo é ignorado).
const KEYS = {
  users: 'pps.users.v2',
  session: 'pps.session.v2',
  content: 'pps.content',
  settings: 'pps.settings',
  orders: 'pps.orders.v3',
  catalog: 'pps.catalog.v1',
};

/** Preços de exemplo, só para o modo demonstração. */
const DEMO_PRICES = [19990, 7990, 0, 2490, 3490, 5990];

const DEMO_ADMIN_PASSWORD = 'admin12345';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('O armazenamento do navegador está cheio. Use imagens menores ou configure o Supabase.');
  }
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function orderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PPS';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function publicUser({ passwordHash: _, createdAt: __, ...user }: StoredUser): AppUser {
  return { ...structuredClone(user), fullMeditation: !!user.fullMeditation || user.isAdmin };
}

/**
 * Modo demonstração: simula o servidor dentro do navegador (localStorage).
 * Cada visitante vê apenas os próprios dados — serve para testar o fluxo, não para vender.
 */
@Injectable()
export class LocalBackend extends Backend {
  readonly mode = 'demo' as const;
  readonly user = signal<AppUser | null>(null);
  private readonly init: Promise<void>;

  constructor() {
    super();
    this.init = this.seed();
  }

  private async seed(): Promise<void> {
    const users = read<StoredUser[]>(KEYS.users, []);
    if (!users.some((u) => u.isAdmin)) {
      users.push({
        id: 'admin',
        username: environment.adminUsername,
        isAdmin: true,
        fullMeditation: true,
        profile: { ...emptyProfile(), name: 'Administração' },
        passwordHash: await sha256(DEMO_ADMIN_PASSWORD),
      });
      write(KEYS.users, users);
    }
    if (!localStorage.getItem(KEYS.settings)) {
      // Chave de EXEMPLO de propósito: num pedido de demonstração ninguém deve pagar de verdade.
      write(KEYS.settings, { ...DEFAULT_SETTINGS, pixKey: 'pix@exemplo.com.br' });
    }
    if (!localStorage.getItem(KEYS.catalog)) {
      const items = seedCatalog(() => crypto.randomUUID()).map((item, i) => ({
        ...item,
        priceCents: DEMO_PRICES[i] ?? 0,
        active: (DEMO_PRICES[i] ?? 0) > 0,
      }));
      write(KEYS.catalog, items);
    }
    const sessionId = read<string | null>(KEYS.session, null);
    const current = users.find((u) => u.id === sessionId);
    this.user.set(current ? publicUser(current) : null);
  }

  ready(): Promise<void> {
    return this.init;
  }

  async signIn(username: string, password: string): Promise<AppUser> {
    await this.init;
    const hash = await sha256(password);
    const found = read<StoredUser[]>(KEYS.users, []).find(
      (u) => u.username === username && u.passwordHash === hash,
    );
    if (!found) throw new Error('Usuário ou senha incorretos.');
    write(KEYS.session, found.id);
    const user = publicUser(found);
    this.user.set(user);
    return user;
  }

  async signUp(username: string, password: string): Promise<AppUser> {
    await this.init;
    const users = read<StoredUser[]>(KEYS.users, []);
    if (users.some((u) => u.username === username)) {
      throw new Error('Esse nome de usuário já está em uso. Escolha outro.');
    }
    const stored: StoredUser = {
      id: crypto.randomUUID(),
      username,
      isAdmin: false,
      fullMeditation: false,
      profile: emptyProfile(),
      passwordHash: await sha256(password),
      createdAt: new Date().toISOString(),
    };
    write(KEYS.users, [...users, stored]);
    write(KEYS.session, stored.id);
    const user = publicUser(stored);
    this.user.set(user);
    return user;
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(KEYS.session);
    this.user.set(null);
  }

  async saveProfile(profile: CustomerProfile): Promise<AppUser> {
    const current = this.requireUser();
    const users = read<StoredUser[]>(KEYS.users, []);
    const stored = users.find((u) => u.id === current.id);
    if (!stored) throw new Error('Usuário não encontrado.');
    stored.profile = structuredClone(profile);
    write(KEYS.users, users);
    const user = publicUser(stored);
    this.user.set(user);
    return user;
  }

  async loadContent(): Promise<Partial<SiteContent> | null> {
    return read<Partial<SiteContent> | null>(KEYS.content, null);
  }

  async saveContent(content: SiteContent): Promise<void> {
    this.requireAdmin();
    write(KEYS.content, content);
  }

  async listUsers(): Promise<UserSummary[]> {
    this.requireAdmin();
    return read<StoredUser[]>(KEYS.users, [])
      .map((u) => ({
        id: u.id,
        username: u.username,
        name: u.profile.name,
        email: u.profile.email,
        phone: u.profile.phone,
        whatsapp: u.profile.whatsapp,
        isAdmin: u.isAdmin,
        fullMeditation: !!u.fullMeditation || u.isAdmin,
        createdAt: u.createdAt ?? '',
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setFullMeditation(userId: string, enabled: boolean): Promise<void> {
    this.requireAdmin();
    const users = read<StoredUser[]>(KEYS.users, []);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('Cliente não encontrado.');
    user.fullMeditation = enabled;
    write(KEYS.users, users);
  }

  /** Demonstração: o áudio fica no próprio navegador (não há armazenamento privado de verdade). */
  async uploadPrivateAudio(file: Blob): Promise<string> {
    return this.uploadImage(file);
  }

  async fullMeditationUrl(path: string): Promise<string> {
    await this.init;
    const fresh = read<StoredUser[]>(KEYS.users, []).find((u) => u.id === this.user()?.id);
    if (!fresh || !(fresh.fullMeditation || fresh.isAdmin)) throw new Error('A meditação completa ainda não foi liberada para você.');
    return path;
  }

  async uploadImage(file: Blob): Promise<string> {
    this.requireAdmin();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  async loadSettings(): Promise<Partial<StoreSettings> | null> {
    await this.init;
    return read<Partial<StoreSettings> | null>(KEYS.settings, null);
  }

  async saveSettings(settings: StoreSettings): Promise<void> {
    this.requireAdmin();
    write(KEYS.settings, settings);
  }

  async loadCatalog(): Promise<CatalogItem[]> {
    await this.init;
    const items = read<CatalogItem[]>(KEYS.catalog, []);
    const visible = this.user()?.isAdmin ? items : items.filter((i) => i.active);
    return visible.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }

  async saveCatalogItem(item: CatalogItem): Promise<CatalogItem> {
    this.requireAdmin();
    const items = read<CatalogItem[]>(KEYS.catalog, []);
    const saved = { ...structuredClone(item), id: item.id || crypto.randomUUID() };
    // Só um kit principal por vez.
    if (saved.featured) items.forEach((i) => (i.featured = false));
    const index = items.findIndex((i) => i.id === saved.id);
    if (index >= 0) items[index] = saved;
    else items.push(saved);
    write(KEYS.catalog, items);
    return saved;
  }

  async deleteCatalogItem(id: string): Promise<void> {
    this.requireAdmin();
    write(KEYS.catalog, read<CatalogItem[]>(KEYS.catalog, []).filter((i) => i.id !== id));
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const user = this.requireUser();
    const p = user.profile;
    if (!profileComplete(p)) throw new Error('Preencha os dados de entrega antes de finalizar.');
    // Mesmas regras do servidor: preço e nome vêm do catálogo, não do navegador.
    if (!input.items.length) throw new Error('Sua sacola está vazia.');
    const catalog = read<CatalogItem[]>(KEYS.catalog, []);
    const items: OrderItem[] = input.items.map((line) => {
      const it = catalog.find((c) => c.id === line.itemId && c.active);
      if (!it) throw new Error('Um dos itens da sacola não está mais disponível.');
      if (it.priceCents <= 0) throw new Error('Um dos itens ainda não está à venda.');
      const quantity = Math.floor(line.quantity);
      if (quantity < 1 || quantity > 20) throw new Error('Quantidade inválida.');
      return {
        itemId: it.id,
        kind: it.kind,
        name: it.name,
        unitPriceCents: salePrice(it),
        regularPriceCents: it.priceCents,
        quantity,
        image: it.images[0] ?? '',
      };
    });
    const now = new Date().toISOString();
    const order: Order = {
      id: crypto.randomUUID(),
      code: orderCode(),
      userId: user.id,
      customerUsername: user.username,
      customerName: p.name,
      customerEmail: p.email,
      customerPhone: p.phone,
      customerWhatsapp: p.whatsapp,
      address: { ...p.address },
      items,
      quantity: items.reduce((n, i) => n + i.quantity, 0),
      totalCents: items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0),
      status: 'aguardando_pagamento',
      trackingCode: '',
      adminNote: '',
      history: [{ status: 'aguardando_pagamento', at: now }],
      createdAt: now,
      updatedAt: now,
    };
    write(KEYS.orders, [order, ...this.orders()]);
    return order;
  }

  async myOrders(): Promise<Order[]> {
    const user = this.requireUser();
    return this.orders().filter((o) => o.userId === user.id);
  }

  async getOrder(id: string): Promise<Order | null> {
    const user = this.requireUser();
    const order = this.orders().find((o) => o.id === id);
    return order && (user.isAdmin || order.userId === user.id) ? order : null;
  }

  async allOrders(): Promise<Order[]> {
    this.requireAdmin();
    return this.orders();
  }

  async updateOrder(id: string, update: OrderUpdate): Promise<Order> {
    this.requireAdmin();
    const orders = this.orders();
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error('Pedido não encontrado.');
    const now = new Date().toISOString();
    if (order.status !== update.status) order.history.push({ status: update.status, at: now });
    Object.assign(order, update, { updatedAt: now });
    write(KEYS.orders, orders);
    return order;
  }

  private orders(): Order[] {
    return read<Order[]>(KEYS.orders, []);
  }

  private requireUser(): AppUser {
    const user = this.user();
    if (!user) throw new Error('Faça login para continuar.');
    return user;
  }

  private requireAdmin(): void {
    if (!this.requireUser().isAdmin) throw new Error('Acesso restrito à administração.');
  }
}
