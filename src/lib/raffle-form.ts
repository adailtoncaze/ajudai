import { centsToReaisInput, isoToSaoPauloLocalInput } from "./validation";

/** Dados vindos do servidor para montar o formulário de criação/edição. */
export type RaffleFormInitial = {
  id: string;
  title: string;
  description: string;
  organizer_name: string;
  total_numbers: number;
  price_cents: number;
  pix_key: string;
  pix_receiver_name: string;
  pix_city: string;
  reservation_hours: number;
  ends_at: string | null;
  image_url: string | null;
  prize_title: string | null;
  prize_image_url: string | null;
  prize_description: string;
  draw_date: string | null;
  hasReservations: boolean;
  status: string;
};

/** Todos os campos de texto/data do formulário, sempre como string (valor de <input>). */
export type RaffleFormValues = {
  title: string;
  description: string;
  organizer_name: string;
  total_numbers: string;
  price_reais: string;
  pix_key: string;
  pix_receiver_name: string;
  pix_city: string;
  reservation_hours: string;
  ends_at: string;
  image_url: string;
  prize_title: string;
  prize_image_url: string;
  prize_description: string;
  draw_date: string;
};

/**
 * Fonte única dos valores iniciais. Usada tanto no primeiro render quanto quando
 * o servidor entrega dados novos (evita que campos não controlados guardem o valor antigo).
 */
export function valoresIniciaisFormulario(
  initial?: RaffleFormInitial | null
): RaffleFormValues {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    organizer_name: initial?.organizer_name ?? "",
    total_numbers: initial ? String(initial.total_numbers) : "100",
    price_reais: initial ? centsToReaisInput(initial.price_cents) : "",
    pix_key: initial?.pix_key ?? "",
    pix_receiver_name: initial?.pix_receiver_name ?? "",
    pix_city: initial?.pix_city ?? "",
    reservation_hours: initial ? String(initial.reservation_hours) : "48",
    ends_at: initial?.ends_at ? isoToSaoPauloLocalInput(initial.ends_at) : "",
    image_url: initial?.image_url ?? "",
    prize_title: initial?.prize_title ?? "",
    prize_image_url: initial?.prize_image_url ?? "",
    prize_description: initial?.prize_description ?? "",
    draw_date: initial?.draw_date ?? "",
  };
}

/** Identifica qualquer mudança nos dados iniciais vindos do servidor. */
export function assinaturaFormulario(initial?: RaffleFormInitial | null): string {
  return initial ? JSON.stringify(initial) : "nova";
}
