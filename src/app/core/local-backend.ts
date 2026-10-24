import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Backend } from './backend';
import { DEFAULT_SETTINGS } from './default-content';
import {
  AppUser,
  CustomerProfile,
  NewOrder,
  Order,
  OrderUpdate,
  SiteContent,
  StoreSettings,
  emptyProfile,
  profileComplete,
} from './models';

interface StoredUser extends AppUser {
  passwordHash: string;
}

// v2: login por username + perfil de entrega (formato antigo é ignorado).
const KEYS = {
  users: 'pps.users.v2',
  session: 'pps.session.v2',
  content: 'pps.content',
  settings: 'pps.settings',
  orders: 'pps.orders.v2',
};

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

function publicUser({ passwordHash: _, ...user }: StoredUser): AppUser {
  return structuredClone(user);
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
        profile: { ...emptyProfile(), name: 'Administração' },
        passwordHash: await sha256(DEMO_ADMIN_PASSWORD),
      });
      write(KEYS.users, users);
    }
    if (!localStorage.getItem(KEYS.settings)) {
      // Chave de EXEMPLO de propósito: num pedido de demonstração ninguém deve pagar de verdade.
      write(KEYS.settings, { ...DEFAULT_SETTINGS, priceCents: 19990, pixKey: 'pix@exemplo.com.br' });
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
      profile: emptyProfile(),
      passwordHash: await sha256(password),
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

  async createOrder(input: NewOrder): Promise<Order> {
    const user = this.requireUser();
    const p = user.profile;
    if (!profileComplete(p)) throw new Error('Preencha os dados de entrega antes de finalizar.');
    const settings = { ...DEFAULT_SETTINGS, ...(await this.loadSettings()) };
    const quantity = Math.min(10, Math.max(1, Math.floor(input.quantity)));
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
      quantity,
      unitPriceCents: settings.priceCents,
      totalCents: settings.priceCents * quantity,
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
