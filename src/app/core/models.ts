export interface AppUser {
  id: string;
  username: string;
  isAdmin: boolean;
  /** Dados de entrega, preenchidos na primeira compra. */
  profile: CustomerProfile;
}

export interface CustomerProfile {
  name: string;
  /** Opcional. */
  email: string;
  /** Opcional. */
  phone: string;
  whatsapp: boolean;
  address: Address;
}

export const EMPTY_ADDRESS: Address = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
};

export function emptyProfile(): CustomerProfile {
  return { name: '', email: '', phone: '', whatsapp: false, address: { ...EMPTY_ADDRESS } };
}

/** Tem tudo o que é preciso para entregar? (complemento, e-mail e celular são opcionais) */
export function profileComplete(p: CustomerProfile | null | undefined): boolean {
  if (!p?.name.trim()) return false;
  const a = p.address;
  return [a.cep, a.street, a.number, a.district, a.city, a.state].every((v) => !!v?.trim());
}

export interface Sense {
  icon: string;
  sense: string;
  title: string;
  body: string;
  highlight: string;
  credit: string;
}

/** Todo o conteúdo editável da vitrine. Cada chave de primeiro nível é uma section. */
export interface SiteContent {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    image: string;
  };
  manifesto: {
    lead: string;
    body: string;
    highlight: string;
    closing: string;
    image: string;
  };
  senses: {
    title: string;
    intro: string;
    items: Sense[];
  };
  ritual: {
    title: string;
    body: string;
    options: string;
    closing: string;
    image: string;
  };
  kit: {
    title: string;
    items: string;
    body: string;
    cta: string;
    image: string;
    gallery: string[];
  };
  essence: {
    title: string;
    lead: string;
    words: string;
    body: string;
    closing: string;
  };
  invite: {
    title: string;
    subtitle: string;
    cta: string;
    image: string;
  };
  atelier: {
    eyebrow: string;
    title: string;
    body: string;
    tags: string;
    highlight: string;
    soon: string;
    soonClosing: string;
    image: string;
  };
}

export type SectionKey = keyof SiteContent;

export interface StoreSettings {
  productName: string;
  priceCents: number;
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  paymentNote: string;
}

export type OrderStatus =
  | 'aguardando_pagamento'
  | 'pago'
  | 'em_preparacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pago', label: 'Pagamento confirmado' },
  { value: 'em_preparacao', label: 'Em preparação' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function statusLabel(status: OrderStatus): string {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  code: string;
  userId: string;
  customerUsername: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: boolean;
  address: Address;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  status: OrderStatus;
  trackingCode: string;
  adminNote: string;
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Os dados do cliente vêm do perfil salvo; o pedido só informa a quantidade. */
export interface NewOrder {
  quantity: number;
}

export interface OrderUpdate {
  status: OrderStatus;
  trackingCode: string;
  adminNote: string;
}

export const PASSWORD_MIN_LENGTH = 4;

/** Username: letras minúsculas, números, ponto, hífen e sublinhado (3 a 30). */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameError(username: string): string {
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return 'O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado (sem espaços nem acentos).';
  }
  return '';
}
