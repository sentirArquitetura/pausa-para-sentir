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

export interface Meditation {
  /** URL do arquivo de áudio (vazio = sem meditação). */
  audio: string;
  title: string;
  /** Tocar só os primeiros N segundos (0 = o arquivo inteiro). O final sempre some devagar. */
  maxSeconds: number;
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
    /** Trecho da meditação guiada que toca no "Viver o ritual" (configurado no admin). */
    meditation: Meditation;
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
  shop: {
    eyebrow: string;
    title: string;
    intro: string;
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
  /** Ordem das seções na vitrine e quais estão ocultas (configurado no admin). */
  layout: {
    order: SectionKey[];
    hidden: SectionKey[];
  };
}

/** Seções da vitrine (tudo em SiteContent, menos o layout). */
export type SectionKey = Exclude<keyof SiteContent, 'layout'>;

/** Ordem padrão: o ritual (céu, mar e lua) primeiro. */
export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'senses',
  'hero',
  'manifesto',
  'ritual',
  'kit',
  'shop',
  'essence',
  'invite',
  'atelier',
];

/** Ordem salva + seções novas que ainda não estavam nela (no fim). */
export function sectionOrder(layout: SiteContent['layout'] | undefined): SectionKey[] {
  const saved = (layout?.order ?? []).filter((k) => DEFAULT_SECTION_ORDER.includes(k));
  return [...new Set([...saved, ...DEFAULT_SECTION_ORDER])];
}

/* ---------- Catálogo: produtos avulsos e kits montados com eles ---------- */

export type CatalogKind = 'product' | 'kit';

/** Um produto dentro de um kit. O nome fica gravado no kit para aparecer mesmo
 * quando o produto não é vendido separadamente. */
export interface KitComponent {
  productId: string;
  name: string;
  quantity: number;
}

export interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  description: string;
  /** Preço normal. */
  priceCents: number;
  /** Promoção ligada: vende pelo preço promocional e mostra o normal riscado ("era …"). */
  promoActive: boolean;
  promoPriceCents: number;
  /** URLs; a primeira é a capa. */
  images: string[];
  /** Só para kits. */
  components: KitComponent[];
  /** À venda (aparece na vitrine). */
  active: boolean;
  /** Kit principal: o da seção "O que vem no seu kit". */
  featured: boolean;
  sort: number;
}

export function newCatalogItem(kind: CatalogKind): CatalogItem {
  return {
    id: '',
    kind,
    name: '',
    description: '',
    priceCents: 0,
    promoActive: false,
    promoPriceCents: 0,
    images: [],
    components: [],
    active: false,
    featured: false,
    sort: 0,
  };
}

/** A promoção vale se estiver ligada e for menor que o preço normal. */
export function onSale(item: Pick<CatalogItem, 'priceCents' | 'promoActive' | 'promoPriceCents'>): boolean {
  return item.promoActive && item.promoPriceCents > 0 && item.promoPriceCents < item.priceCents;
}

/** Preço cobrado: o promocional, se houver promoção válida; senão, o normal. */
export function salePrice(item: Pick<CatalogItem, 'priceCents' | 'promoActive' | 'promoPriceCents'>): number {
  return onSale(item) ? item.promoPriceCents : item.priceCents;
}

export interface CartLine {
  itemId: string;
  quantity: number;
}

/** Retrato do item no momento da compra (preço e nome não mudam depois). */
export interface OrderItem {
  itemId: string;
  kind: CatalogKind;
  name: string;
  unitPriceCents: number;
  /** Preço normal quando a compra foi feita em promoção (senão, igual ao unitário). */
  regularPriceCents?: number;
  quantity: number;
  image: string;
}

export interface StoreSettings {
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
  /** Itens comprados. Pedidos antigos (antes da loja) vêm vazios: use `quantity`. */
  items: OrderItem[];
  /** Total de unidades. */
  quantity: number;
  totalCents: number;
  status: OrderStatus;
  trackingCode: string;
  adminNote: string;
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Os dados do cliente vêm do perfil salvo e os preços, do catálogo: o pedido só informa os itens. */
export interface NewOrder {
  items: CartLine[];
}

/** Para pedidos antigos, sem a lista de itens. */
export function orderLines(order: Order): { name: string; quantity: number; totalCents: number; image: string }[] {
  if (order.items.length) {
    return order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      totalCents: i.unitPriceCents * i.quantity,
      image: i.image,
    }));
  }
  return [{ name: 'Kit Pausa para Sentir', quantity: order.quantity, totalCents: order.totalCents, image: '' }];
}

/** "Bom dia", "Boa tarde" ou "Boa noite", pela hora local. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
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
