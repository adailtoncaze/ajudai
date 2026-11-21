export const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

/** Formata uma data sem horário (`AAAA-MM-DD`) sem deslocar o dia por fuso. */
export const dateOnly = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
