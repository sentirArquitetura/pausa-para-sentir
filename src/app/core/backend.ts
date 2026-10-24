import { Signal } from '@angular/core';
import {
  AppUser,
  CustomerProfile,
  NewOrder,
  Order,
  OrderUpdate,
  SiteContent,
  StoreSettings,
} from './models';

/**
 * Contrato entre a aplicação e o "servidor".
 * Implementado por SupabaseBackend (produção) e LocalBackend (modo demonstração).
 */
export abstract class Backend {
  abstract readonly mode: 'supabase' | 'demo';
  abstract readonly user: Signal<AppUser | null>;

  /** Resolve quando a sessão salva (se houver) foi restaurada. */
  abstract ready(): Promise<void>;
  abstract signIn(username: string, password: string): Promise<AppUser>;
  abstract signUp(username: string, password: string): Promise<AppUser>;
  abstract signOut(): Promise<void>;
  /** Salva os dados de entrega do usuário logado. */
  abstract saveProfile(profile: CustomerProfile): Promise<AppUser>;

  abstract loadContent(): Promise<Partial<SiteContent> | null>;
  abstract saveContent(content: SiteContent): Promise<void>;
  abstract uploadImage(file: Blob, name: string): Promise<string>;

  abstract loadSettings(): Promise<Partial<StoreSettings> | null>;
  abstract saveSettings(settings: StoreSettings): Promise<void>;

  abstract createOrder(order: NewOrder): Promise<Order>;
  abstract myOrders(): Promise<Order[]>;
  abstract getOrder(id: string): Promise<Order | null>;
  abstract allOrders(): Promise<Order[]>;
  abstract updateOrder(id: string, update: OrderUpdate): Promise<Order>;
}
