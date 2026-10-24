import { Signal } from '@angular/core';
import {
  AppUser,
  NewOrder,
  Order,
  OrderUpdate,
  SignUpData,
  SiteContent,
  StoreSettings,
} from './models';

export interface SignUpResult {
  /** false quando o Supabase exige confirmação por e-mail antes do primeiro login. */
  loggedIn: boolean;
}

/**
 * Contrato entre a aplicação e o "servidor".
 * Implementado por SupabaseBackend (produção) e LocalBackend (modo demonstração).
 */
export abstract class Backend {
  abstract readonly mode: 'supabase' | 'demo';
  abstract readonly user: Signal<AppUser | null>;

  /** Resolve quando a sessão salva (se houver) foi restaurada. */
  abstract ready(): Promise<void>;
  abstract signIn(email: string, password: string): Promise<AppUser>;
  abstract signUp(data: SignUpData): Promise<SignUpResult>;
  abstract signOut(): Promise<void>;

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
