import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Backend, SignUpResult } from './backend';
import { DEFAULT_SETTINGS } from './default-content';
import {
  AppUser,
  NewOrder,
  Order,
  OrderUpdate,
  SignUpData,
  SiteContent,
  StoreSettings,
} from './models';

interface StoredUser extends AppUser {
  passwordHash: string;
}

const KEYS = {
  users: 'pps.users',
  session: 'pps.session',
  content: 'pps.content',
  settings: 'pps.settings',
  orders: 'pps.orders',
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
  return user;
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
        email: environment.adminEmail,
        name: 'Administração',
        phone: '',
        isAdmin: true,
        passwordHash: await sha256(DEMO_ADMIN_PASSWORD),
      });
      write(KEYS.users, users);
    }
    if (!localStorage.getItem(KEYS.settings)) {
      // Valores de exemplo apenas para o modo demonstração.
      write(KEYS.settings, { ...DEFAULT_SETTINGS, priceCents: 19990, pixKey: 'pix@exemplo.com.br' });
    }
    const sessionId = read<string | null>(KEYS.session, null);
    const current = users.find((u) => u.id === sessionId);
    this.user.set(current ? publicUser(current) : null);
  }

  ready(): Promise<void> {
    return this.init;
  }

  async signIn(email: string, password: string): Promise<AppUser> {
    await this.init;
    const hash = await sha256(password);
    const found = read<StoredUser[]>(KEYS.users, []).find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash,
    );
    if (!found) throw new Error('E-mail ou senha incorretos.');
    write(KEYS.session, found.id);
    const user = publicUser(found);
    this.user.set(user);
    return user;
  }

  async signUp(data: SignUpData): Promise<SignUpResult> {
    await this.init;
    const users = read<StoredUser[]>(KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Já existe uma conta com este e-mail.');
    }
    const stored: StoredUser = {
      id: crypto.randomUUID(),
      email: data.email.trim(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      isAdmin: false,
      passwordHash: await sha256(data.password),
    };
    write(KEYS.users, [...users, stored]);
    write(KEYS.session, stored.id);
    this.user.set(publicUser(stored));
    return { loggedIn: true };
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(KEYS.session);
    this.user.set(null);
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
    const settings = { ...DEFAULT_SETTINGS, ...(await this.loadSettings()) };
    const quantity = Math.min(10, Math.max(1, Math.floor(input.quantity)));
    const now = new Date().toISOString();
    const order: Order = {
      id: crypto.randomUUID(),
      code: orderCode(),
      userId: user.id,
      customerName: input.customerName,
      customerEmail: user.email,
      customerPhone: input.customerPhone,
      address: input.address,
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
