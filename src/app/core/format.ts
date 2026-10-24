import { Pipe, PipeTransform } from '@angular/core';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

/**
 * Converte o texto editado pelo admin em HTML seguro:
 * linha em branco = novo parágrafo, **negrito**, *itálico*, quebra simples = <br>.
 */
@Pipe({ name: 'rich' })
export class RichTextPipe implements PipeTransform {
  transform(text: string | null | undefined, mode: 'block' | 'inline' = 'block'): string {
    if (!text) return '';
    if (mode === 'inline') return inline(text);
    return text
      .split(/\n\s*\n/)
      .map((p) => `<p>${inline(p.trim())}</p>`)
      .join('');
  }
}

/** Quebra um campo de várias linhas em itens de lista. */
@Pipe({ name: 'lines' })
export class LinesPipe implements PipeTransform {
  transform(text: string | null | undefined): string[] {
    return (text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return formatBRL(cents ?? 0);
  }
}
