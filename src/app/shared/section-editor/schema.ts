import { SectionKey } from '../../core/models';

export type FieldType = 'text' | 'textarea' | 'image' | 'images';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
}

export interface SectionDef {
  label: string;
  fields: FieldDef[];
  /** Lista de itens com os mesmos campos (ex.: os cinco sentidos). */
  items?: { key: string; label: string; titleKey: string; fields: FieldDef[] };
}

const PARAGRAPHS = 'Linha em branco separa parágrafos. Use **negrito** e *itálico*.';
const ONE_PER_LINE = 'Um item por linha.';

export const SECTION_SCHEMA: Record<SectionKey, SectionDef> = {
  hero: {
    label: 'Abertura',
    fields: [
      { key: 'eyebrow', label: 'Chamada pequena', type: 'text' },
      { key: 'title', label: 'Título', type: 'textarea' },
      { key: 'subtitle', label: 'Subtítulo', type: 'textarea' },
      { key: 'cta', label: 'Texto do botão', type: 'text' },
      { key: 'image', label: 'Imagem', type: 'image' },
    ],
  },
  manifesto: {
    label: 'Manifesto',
    fields: [
      { key: 'lead', label: 'Frase de abertura', type: 'text' },
      { key: 'body', label: 'Texto', type: 'textarea', hint: PARAGRAPHS },
      { key: 'highlight', label: 'Palavra em destaque', type: 'text' },
      { key: 'closing', label: 'Fechamento', type: 'textarea', hint: PARAGRAPHS },
      { key: 'image', label: 'Imagem', type: 'image' },
    ],
  },
  senses: {
    label: 'Os cinco sentidos',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'intro', label: 'Introdução', type: 'textarea' },
    ],
    items: {
      key: 'items',
      label: 'Sentido',
      titleKey: 'sense',
      fields: [
        { key: 'sense', label: 'Sentido', type: 'text' },
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'body', label: 'Texto', type: 'textarea', hint: PARAGRAPHS },
        { key: 'highlight', label: 'Frase em destaque', type: 'text' },
        { key: 'credit', label: 'Crédito / curadoria', type: 'text' },
      ],
    },
  },
  ritual: {
    label: 'O ritual',
    fields: [
      { key: 'title', label: 'Título', type: 'textarea' },
      { key: 'body', label: 'Texto', type: 'textarea', hint: PARAGRAPHS },
      { key: 'options', label: 'Formas de começar', type: 'textarea', hint: ONE_PER_LINE },
      { key: 'closing', label: 'Fechamento', type: 'text' },
      { key: 'image', label: 'Imagem', type: 'image' },
    ],
  },
  kit: {
    label: 'O kit',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'items', label: 'Itens do kit', type: 'textarea', hint: ONE_PER_LINE },
      { key: 'body', label: 'Texto', type: 'textarea', hint: PARAGRAPHS },
      { key: 'cta', label: 'Texto do botão', type: 'text' },
      { key: 'image', label: 'Imagem principal', type: 'image' },
      { key: 'gallery', label: 'Galeria', type: 'images' },
    ],
  },
  essence: {
    label: 'Não é sobre ter mais',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'lead', label: 'Introdução', type: 'textarea' },
      { key: 'words', label: 'Palavras', type: 'textarea', hint: ONE_PER_LINE },
      { key: 'body', label: 'Texto', type: 'textarea' },
      { key: 'closing', label: 'Fechamento', type: 'text' },
    ],
  },
  invite: {
    label: 'Convite',
    fields: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'cta', label: 'Texto do botão', type: 'text' },
      { key: 'image', label: 'Imagem de fundo', type: 'image' },
    ],
  },
  atelier: {
    label: 'Ateliê',
    fields: [
      { key: 'eyebrow', label: 'Chamada pequena', type: 'text' },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'body', label: 'Texto', type: 'textarea', hint: PARAGRAPHS },
      { key: 'tags', label: 'Palavras-chave', type: 'textarea', hint: ONE_PER_LINE },
      { key: 'highlight', label: 'Destaque', type: 'textarea', hint: PARAGRAPHS },
      { key: 'soon', label: 'Em breve', type: 'textarea' },
      { key: 'soonClosing', label: 'Fechamento', type: 'text' },
      { key: 'image', label: 'Imagem', type: 'image' },
    ],
  },
};
