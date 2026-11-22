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

function digitoVerificador(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CPF válido: usado para não confundir telefone com DDD (11 dígitos) e CPF. */
function cpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  return (
    digitoVerificador(digitos.slice(0, 9), 10) === Number(digitos[9]) &&
    digitoVerificador(digitos.slice(0, 10), 11) === Number(digitos[10])
  );
}

/** Chave de telefone no padrão do BACEN: `+55` + DDD + número (8 ou 9 dígitos). */
function chaveTelefone(digitos: string): { type: "phone"; key: string } | null {
  let numero = digitos;
  if (/^55\d{10,11}$/.test(numero)) numero = numero.slice(2);
  if (!/^\d{10,11}$/.test(numero)) return null;
  const ddd = Number(numero.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  return { type: "phone", key: `+55${numero}` };
}

export function normalizePixKey(raw: string): { type: PixKeyType; key: string } | null {
  const v = raw.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return { type: "random", key: v.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77)
    return { type: "email", key: v.toLowerCase() };

  const digitos = v.replace(/\D/g, "");
  // Pontos/barra indicam CPF/CNPJ; parênteses, "+" e hífen no fim indicam telefone.
  const mascaraDocumento = /[./]/.test(v);
  const mascaraTelefone = /[()+]/.test(v) || /-\d{4}$/.test(v);

  if (mascaraDocumento) {
    if (cpfValido(digitos)) return { type: "cpf", key: digitos };
    if (/^\d{14}$/.test(digitos)) return { type: "cnpj", key: digitos };
    return null;
  }
  if (mascaraTelefone || /^\+55\d{10,11}$/.test(v.replace(/[\s().-]/g, ""))) {
    return chaveTelefone(digitos);
  }
  if (cpfValido(digitos)) return { type: "cpf", key: digitos };
  if (/^\d{14}$/.test(digitos)) return { type: "cnpj", key: digitos };
  return chaveTelefone(digitos);
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
