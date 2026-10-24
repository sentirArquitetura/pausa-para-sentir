import { Injectable, signal } from '@angular/core';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Backend } from './backend';
import {
  Address,
  AppUser,
  CustomerProfile,
  EMPTY_ADDRESS,
  NewOrder,
  Order,
  OrderStatus,
  OrderUpdate,
  SiteContent,
  StoreSettings,
} from './models';

interface OrderRow {
  id: string;
  code: string;
  user_id: string;
  customer_username: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_whatsapp: boolean | null;
  address: Address;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  status: OrderStatus;
  tracking_code: string | null;
  admin_note: string | null;
  history: Order['history'] | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  username: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: boolean | null;
  address: Partial<Address> | null;
  is_admin: boolean | null;
}

interface SettingsRow {
  product_name: string;
  price_cents: number;
  pix_key: string;
  merchant_name: string;
  merchant_city: string;
  payment_note: string;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    customerUsername: row.customer_username ?? '',
    customerName: row.customer_name,
    customerEmail: row.customer_email ?? '',
    customerPhone: row.customer_phone ?? '',
    customerWhatsapp: row.customer_whatsapp ?? false,
    address: row.address,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalCents: row.total_cents,
    status: row.status,
    trackingCode: row.tracking_code ?? '',
    adminNote: row.admin_note ?? '',
    history: row.history ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** O Supabase só faz login com e-mail: o username vira um e-mail interno. */
function loginEmail(username: string): string {
  return `${username}@${environment.loginDomain}`;
}

/**
 * O Supabase exige no mínimo 6 caracteres; o app aceita 4.
 * Senhas curtas recebem sempre o mesmo complemento antes de ir ao servidor.
 */
function authPassword(password: string): string {
  return password.length >= 6 ? password : password + '#pausa';
}

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const messages: Record<string, string> = {
    'Invalid login credentials': 'Usuário ou senha incorretos.',
    'User already registered': 'Esse nome de usuário já está em uso. Escolha outro.',
    'Email not confirmed':
      'Conta criada, mas o Supabase está exigindo confirmação de e-mail. Desligue "Confirm email" em Authentication → Providers → Email.',
  };
  throw new Error(messages[error.message] ?? error.message);
}

/** Produção: autenticação, banco (Postgres + RLS) e imagens no Supabase. */
@Injectable()
export class SupabaseBackend extends Backend {
  readonly mode = 'supabase' as const;
  readonly user = signal<AppUser | null>(null);
  private readonly client: Promise<SupabaseClient>;
  private readonly init: Promise<void>;

  constructor() {
    super();
    // Import dinâmico: a biblioteca só é baixada quando o Supabase está configurado.
    this.client = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        // O lock padrão (navigator.locks) costuma travar em apps Angular; uma aba basta.
        auth: { lock: async (_name, _timeout, fn) => fn() },
      }),
    );
    this.init = this.restoreSession();
  }

  private async restoreSession(): Promise<void> {
    const sb = await this.client;
    const { data } = await sb.auth.getSession();
    if (data.session) await this.loadProfile(data.session.user);
    sb.auth.onAuthStateChange((event, session) => {
      if (!session) this.user.set(null);
      // Fora do callback: chamadas ao Supabase dentro dele podem bloquear.
      else if (event === 'SIGNED_IN' && this.user()?.id !== session.user.id) {
        setTimeout(() => this.loadProfile(session.user));
      }
    });
  }

  private async loadProfile(authUser: User): Promise<AppUser> {
    const sb = await this.client;
    const { data } = await sb
      .from('profiles')
      .select('username, name, email, phone, whatsapp, address, is_admin')
      .eq('id', authUser.id)
      .maybeSingle<ProfileRow>();
    const user: AppUser = {
      id: authUser.id,
      username: data?.username ?? (authUser.email ?? '').split('@')[0],
      isAdmin: data?.is_admin ?? false,
      profile: {
        name: data?.name ?? '',
        email: data?.email ?? '',
        phone: data?.phone ?? '',
        whatsapp: data?.whatsapp ?? false,
        address: { ...EMPTY_ADDRESS, ...data?.address },
      },
    };
    this.user.set(user);
    return user;
  }

  ready(): Promise<void> {
    return this.init;
  }

  async signIn(username: string, password: string): Promise<AppUser> {
    const sb = await this.client;
    const { data, error } = await sb.auth.signInWithPassword({
      email: loginEmail(username),
      password: authPassword(password),
    });
    fail(error);
    return this.loadProfile(data.user!);
  }

  async signUp(username: string, password: string): Promise<AppUser> {
    const sb = await this.client;
    const { data, error } = await sb.auth.signUp({
      email: loginEmail(username),
      password: authPassword(password),
      options: { data: { username } },
    });
    fail(error);
    // Sem sessão = o projeto ainda exige confirmação por e-mail.
    if (!data.session) fail({ message: 'Email not confirmed' });
    return this.loadProfile(data.session!.user);
  }

  async signOut(): Promise<void> {
    const sb = await this.client;
    await sb.auth.signOut();
    this.user.set(null);
  }

  async saveProfile(profile: CustomerProfile): Promise<AppUser> {
    const sb = await this.client;
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error('Faça login para continuar.');
    const { error } = await sb
      .from('profiles')
      .update({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        address: profile.address,
      })
      .eq('id', data.user.id);
    fail(error);
    return this.loadProfile(data.user);
  }

  async loadContent(): Promise<Partial<SiteContent> | null> {
    const sb = await this.client;
    const { data, error } = await sb.from('site_content').select('data').eq('id', 1).maybeSingle();
    fail(error);
    return (data?.data as Partial<SiteContent>) ?? null;
  }

  async saveContent(content: SiteContent): Promise<void> {
    const sb = await this.client;
    const { error } = await sb
      .from('site_content')
      .upsert({ id: 1, data: content, updated_at: new Date().toISOString() });
    fail(error);
  }

  async uploadImage(file: Blob, name: string): Promise<string> {
    const sb = await this.client;
    const path = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
    const bucket = sb.storage.from(environment.imagesBucket);
    const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
    fail(error);
    return bucket.getPublicUrl(path).data.publicUrl;
  }

  async loadSettings(): Promise<Partial<StoreSettings> | null> {
    const sb = await this.client;
    const { data, error } = await sb.from('store_settings').select('*').eq('id', 1).maybeSingle<SettingsRow>();
    fail(error);
    if (!data) return null;
    return {
      productName: data.product_name,
      priceCents: data.price_cents,
      pixKey: data.pix_key,
      merchantName: data.merchant_name,
      merchantCity: data.merchant_city,
      paymentNote: data.payment_note,
    };
  }

  async saveSettings(s: StoreSettings): Promise<void> {
    const sb = await this.client;
    const row: SettingsRow & { id: number } = {
      id: 1,
      product_name: s.productName,
      price_cents: s.priceCents,
      pix_key: s.pixKey,
      merchant_name: s.merchantName,
      merchant_city: s.merchantCity,
      payment_note: s.paymentNote,
    };
    const { error } = await sb.from('store_settings').upsert(row);
    fail(error);
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const sb = await this.client;
    const user = this.user();
    if (!user) throw new Error('Faça login para continuar.');
    // Dados do cliente, preço, código, status e histórico são preenchidos pelo trigger no banco.
    const { data, error } = await sb
      .from('orders')
      .insert({ user_id: user.id, quantity: input.quantity })
      .select()
      .single<OrderRow>();
    fail(error);
    return toOrder(data!);
  }

  async myOrders(): Promise<Order[]> {
    const user = this.user();
    if (!user) return [];
    return this.queryOrders(user.id);
  }

  async getOrder(id: string): Promise<Order | null> {
    const sb = await this.client;
    const { data, error } = await sb.from('orders').select('*').eq('id', id).maybeSingle<OrderRow>();
    fail(error);
    return data ? toOrder(data) : null;
  }

  async allOrders(): Promise<Order[]> {
    return this.queryOrders();
  }

  async updateOrder(id: string, update: OrderUpdate): Promise<Order> {
    const sb = await this.client;
    const { data, error } = await sb
      .from('orders')
      .update({
        status: update.status,
        tracking_code: update.trackingCode,
        admin_note: update.adminNote,
      })
      .eq('id', id)
      .select()
      .single<OrderRow>();
    fail(error);
    return toOrder(data!);
  }

  private async queryOrders(userId?: string): Promise<Order[]> {
    const sb = await this.client;
    let query = sb.from('orders').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    fail(error);
    return ((data ?? []) as OrderRow[]).map(toOrder);
  }
}
