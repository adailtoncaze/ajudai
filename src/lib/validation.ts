import { z } from "zod";
import { normalizePixKey } from "./pix";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type RaffleActionState = {
  status: "idle" | "success" | "error";
  errors: Record<string, string>;
  slug?: string;
  id?: string;
};

/** Valida tipo e tamanho do arquivo antes do upload (SPEC §3). */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Escolha uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "A imagem deve ter no máximo 2 MB.";
  }
  return null;
}

/** Converte o valor digitado em reais para centavos inteiros. */
export function reaisToCents(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return null;

  const [reais, centavos = ""] = cleaned.split(".");
  const cents = Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Converte `AAAA-MM-DDTHH:mm` digitado em São Paulo para ISO UTC. */
export function saoPauloLocalToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const asUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    asUtc.getUTCFullYear() !== year ||
    asUtc.getUTCMonth() !== month - 1 ||
    asUtc.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(asUtc.getTime() - getOffsetMinutes(asUtc, "America/Sao_Paulo") * 60_000).toISOString();
}

/** Valida `AAAA-MM-DD`, aceito por `<input type="date">` e pela coluna `date`. */
function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const data = new Date(Date.UTC(year, month - 1, day));
  return (
    data.getUTCFullYear() === year &&
    data.getUTCMonth() === month - 1 &&
    data.getUTCDate() === day
  );
}

/** Converte um ISO para o valor aceito por `<input type="datetime-local">`. */
export function isoToSaoPauloLocalInput(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function publicRaffleUrl(slug: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${siteUrl}/r/${slug}`;
}

const titleField = z
  .string()
  .trim()
  .min(3, "O título deve ter pelo menos 3 caracteres.")
  .max(120, "O título deve ter no máximo 120 caracteres.");

const descriptionField = z.string().trim().max(4000, "A descrição deve ter no máximo 4000 caracteres.").default("");

const organizerNameField = z
  .string()
  .trim()
  .min(2, "Informe o nome do organizador (pelo menos 2 caracteres).")
  .max(80, "O nome do organizador deve ter no máximo 80 caracteres.");

const integerField = (minMessage: string, maxMessage: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Informe apenas números inteiros.")
    .transform(Number)
    .pipe(z.number().int().min(1, minMessage).max(max, maxMessage));

const totalNumbersField = integerField("A rifa deve ter pelo menos 1 número.", "O máximo é 1000 números.", 1000);

const reservationHoursField = integerField(
  "O prazo mínimo é de 1 hora.",
  "O prazo máximo é de 720 horas.",
  720
);

const priceField = z
  .string()
  .trim()
  .min(1, "Informe o preço por número.")
  .transform((raw, ctx) => {
    const cents = reaisToCents(raw);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Preço inválido. Use vírgula para os centavos." });
      return z.NEVER;
    }
    if (cents < 1) {
      ctx.addIssue({ code: "custom", message: "O preço deve ser maior que zero." });
      return z.NEVER;
    }
    if (cents > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "O preço máximo por número é R$ 100.000,00." });
      return z.NEVER;
    }
    return cents;
  });

const pixKeyField = z
  .string()
  .trim()
  .min(1, "Informe a chave Pix.")
  .max(77, "A chave Pix é muito longa.")
  .transform((raw, ctx) => {
    const normalized = normalizePixKey(raw);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Chave Pix inválida. Informe CPF, CNPJ, e-mail, telefone com DDD ou chave aleatória.",
      });
      return z.NEVER;
    }
    return normalized.key;
  });

const endsAtField = z.string().trim().transform((raw, ctx) => {
  if (!raw) return null;
  const iso = saoPauloLocalToIso(raw);
  if (!iso) {
    ctx.addIssue({ code: "custom", message: "Informe uma data e hora finais válidas." });
    return z.NEVER;
  }
  return iso;
});

const imageUrlField = z.string().trim().max(2000, "URL da imagem muito longa.").optional().transform((value) => value || null);

const prizeTitleField = z
  .string()
  .trim()
  .max(120, "O título do prêmio deve ter no máximo 120 caracteres.")
  .optional()
  .transform((value) => value || null);

const prizeImageUrlField = z
  .string()
  .trim()
  .max(2000, "URL da imagem do prêmio muito longa.")
  .optional()
  .transform((value) => value || null);

const prizeDescriptionField = z
  .string()
  .trim()
  .max(4000, "A descrição do prêmio deve ter no máximo 4000 caracteres.")
  .default("");

const drawDateField = z.string().trim().transform((raw, ctx) => {
  if (!raw) return null;
  if (!isValidDateOnly(raw)) {
    ctx.addIssue({ code: "custom", message: "Informe uma data de sorteio válida." });
    return z.NEVER;
  }
  return raw;
});

const raffleFields = z.object({
  title: titleField,
  description: descriptionField,
  organizer_name: organizerNameField,
  pix_key: pixKeyField,
  pix_receiver_name: z
    .string()
    .trim()
    .min(1, "Informe o nome do recebedor do Pix.")
    .max(25, "O nome do recebedor deve ter no máximo 25 caracteres."),
  pix_city: z
    .string()
    .trim()
    .min(1, "Informe a cidade do recebedor.")
    .max(15, "A cidade deve ter no máximo 15 caracteres."),
  reservation_hours: reservationHoursField,
  ends_at: endsAtField,
  image_url: imageUrlField,
  prize_title: prizeTitleField,
  prize_image_url: prizeImageUrlField,
  prize_description: prizeDescriptionField,
  draw_date: drawDateField,
});

export const raffleCreateSchema = raffleFields
  .extend({
    total_numbers: totalNumbersField,
    price_reais: priceField,
  })
  .transform(({ price_reais, ...rest }) => ({ ...rest, price_cents: price_reais }));

export const raffleEditSchema = raffleFields
  .extend({
    id: z.string().uuid("Identificador da rifa inválido."),
    total_numbers: totalNumbersField.optional(),
    price_reais: priceField.optional(),
  })
  .transform(({ id, price_reais, ...rest }) => ({
    id,
    ...rest,
    ...(price_reais === undefined ? {} : { price_cents: price_reais }),
  }));

export function raffleErrors(error: z.ZodError): Record<string, string> {
  const fields = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fields)) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  return errors;
}

/** SPEC §6: usado tanto no formulário quanto na rota de reserva. */
export const createReservationSchema = z.object({
  numbers: z
    .array(z.number().int().min(1))
    .min(1, "Selecione pelo menos um número.")
    .max(50, "Você pode reservar no máximo 50 números por vez."),
  firstName: z
    .string()
    .trim()
    .min(2, "Informe seu nome (pelo menos 2 letras).")
    .max(60, "O nome é muito longo."),
  lastName: z
    .string()
    .trim()
    .min(2, "Informe seu sobrenome (pelo menos 2 letras).")
    .max(80, "O sobrenome é muito longo."),
  phone: z
    .string()
    .trim()
    .min(1, "Informe seu WhatsApp com DDD.")
    .transform((value) => value.replace(/\D/g, ""))
    .refine(
      (value) => /^\d{10,11}$/.test(value),
      "Informe um WhatsApp válido com DDD (10 ou 11 dígitos)."
    ),
});

export function reservationErrors(error: z.ZodError): Record<string, string> {
  const fields = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fields)) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  return errors;
}
