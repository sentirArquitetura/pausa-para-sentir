/**
 * Monta o "Pix copia e cola" (BR Code estático, padrão EMV do Banco Central).
 * O mesmo texto é usado para gerar o QR Code.
 */
export interface PixPayloadInput {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid: string;
}

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

/** Nome e cidade só aceitam ASCII sem acentos, com tamanho limitado. */
function sanitize(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9 .,-]/g, '')
    .trim()
    .slice(0, max);
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Chaves de telefone precisam do +55; CPF/CNPJ vão só com dígitos. */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes('@') || /[a-f0-9]{8}-[a-f0-9]{4}-/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('+')) return '+' + trimmed.replace(/\D/g, '');
  return trimmed.replace(/[.\-/\s()]/g, '');
}

export function buildPixPayload(input: PixPayloadInput): string {
  const txid = input.txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const merchantAccount = field('00', 'br.gov.bcb.pix') + field('01', normalizePixKey(input.key));

  const payload =
    field('00', '01') +
    field('26', merchantAccount) +
    field('52', '0000') +
    field('53', '986') +
    field('54', (input.amountCents / 100).toFixed(2)) +
    field('58', 'BR') +
    field('59', sanitize(input.merchantName, 25) || 'Pausa para Sentir') +
    field('60', sanitize(input.merchantCity, 15) || 'Sao Paulo') +
    field('62', field('05', txid)) +
    '6304';

  return payload + crc16(payload);
}
