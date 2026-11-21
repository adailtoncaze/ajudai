export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e símbolos, deixa maiúsculo e corta no tamanho máximo. */
export function sanitizeText(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

export function formatAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function normalizePixKey(raw: string): { type: PixKeyType; key: string } | null {
  const v = raw.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return { type: "random", key: v.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77)
    return { type: "email", key: v.toLowerCase() };
  const compact = v.replace(/[\s().-]/g, "");
  if (/^\+55\d{10,11}$/.test(compact)) return { type: "phone", key: compact };
  const digits = v.replace(/[.\-/\s]/g, "");
  if (/^\d{11}$/.test(digits)) return { type: "cpf", key: digits };
  if (/^\d{14}$/.test(digits)) return { type: "cnpj", key: digits };
  return null;
}

export type PixInput = {
  key: string;          // já normalizada
  name: string;         // nome do recebedor
  city: string;
  amountCents: number;  // inteiro > 0
  txid: string;         // 1 a 25 caracteres [A-Za-z0-9]
};

export function buildPixPayload({ key, name, city, amountCents, txid }: PixInput): string {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("invalid_amount");
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error("invalid_txid");
  const merchantName = sanitizeText(name, 25);
  const merchantCity = sanitizeText(city, 15);
  if (!merchantName || !merchantCity) throw new Error("invalid_receiver");

  const account = field("00", "br.gov.bcb.pix") + field("01", key);
  const withoutCrc =
    field("00", "01") +
    field("01", "11") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    field("54", formatAmount(amountCents)) +
    field("58", "BR") +
    field("59", merchantName) +
    field("60", merchantCity) +
    field("62", field("05", txid)) +
    "6304";
  return withoutCrc + crc16(withoutCrc);
}
