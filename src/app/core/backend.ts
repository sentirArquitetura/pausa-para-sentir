import { Signal } from '@angular/core';
import {
  AppUser,
  CatalogItem,
  CustomerProfile,
  NewOrder,
  Order,
  OrderUpdate,
  SiteContent,
  StoreSettings,
  UserSummary,
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

  /** Itens à venda (o admin recebe também os inativos). */
  abstract loadCatalog(): Promise<CatalogItem[]>;
  /** Cria (id vazio) ou atualiza um produto/kit. */
  abstract saveCatalogItem(item: CatalogItem): Promise<CatalogItem>;
  abstract deleteCatalogItem(id: string): Promise<void>;

  /** Clientes cadastrados (admin). */
  abstract listUsers(): Promise<UserSummary[]>;
  /** Libera ou bloqueia a meditação completa de um cliente (admin). */
  abstract setFullMeditation(userId: string, enabled: boolean): Promise<void>;
  /** Envia um áudio para o armazenamento PRIVADO (admin) e devolve o caminho. */
  abstract uploadPrivateAudio(file: Blob, name: string): Promise<string>;
  /** Link temporário para ouvir a meditação completa (só para quem tem acesso). */
  abstract fullMeditationUrl(path: string): Promise<string>;

  abstract createOrder(order: NewOrder): Promise<Order>;
  abstract myOrders(): Promise<Order[]>;
  abstract getOrder(id: string): Promise<Order | null>;
  abstract allOrders(): Promise<Order[]>;
  abstract updateOrder(id: string, update: OrderUpdate): Promise<Order>;
}
