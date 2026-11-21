import "server-only";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Mesmo formato aceito pela coluna `slug` no banco (migration 0001). */
export const publicSlugSchema = z.string().regex(/^[a-z0-9-]{3,60}$/);

/** Colunas liberadas para a página pública. Nunca incluir `pix_*` (SPEC §4). */
const PUBLIC_RAFFLE_COLUMNS =
  "id, slug, title, description, image_url, prize_title, prize_image_url, prize_description, draw_date, organizer_name, total_numbers, price_cents, status, ends_at, winner_number, drawn_at";

type RaffleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  prize_title: string | null;
  prize_image_url: string | null;
  prize_description: string;
  draw_date: string | null;
  organizer_name: string;
  total_numbers: number;
  price_cents: number;
  status: "open" | "closed" | "drawn";
  ends_at: string | null;
  winner_number: number | null;
  drawn_at: string | null;
};

export type PublicRaffle = RaffleRow;

export type TakenNumber = {
  number: number;
  status: "reserved" | "paid";
};

export type PublicWinner = {
  number: number;
  /** Nome já anonimizado para exibição pública ("Nome S.") ou null. */
  name: string | null;
};

export async function getPublicRaffle(slug: string): Promise<PublicRaffle | null> {
  if (!publicSlugSchema.safeParse(slug).success) return null;

  const { data, error } = await supabaseAdmin()
    .from("raffles")
    .select(PUBLIC_RAFFLE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[raffles] falha ao carregar rifa pública", error);
    throw error;
  }
  if (!data) return null;

  const raffle = data as RaffleRow;
  const vencida =
    raffle.status === "open" &&
    raffle.ends_at !== null &&
    new Date(raffle.ends_at).getTime() < Date.now();

  // SPEC §4: rifa aberta com prazo vencido é exibida como encerrada.
  return { ...raffle, status: vencida ? "closed" : raffle.status };
}

export async function getPublicTakenNumbers(raffleId: string): Promise<TakenNumber[]> {
  const { data, error } = await supabaseAdmin().rpc("get_taken_numbers", {
    p_raffle_id: raffleId,
  });

  if (error) {
    console.error("[raffles] falha ao carregar números ocupados", error);
    throw error;
  }

  const linhas = Array.isArray(data) ? data : [];
  return linhas.flatMap((linha) => {
    const registro = linha as { taken_number?: unknown; taken_status?: unknown };
    const numero = registro.taken_number;
    const status = registro.taken_status;

    if (typeof numero !== "number" || !Number.isInteger(numero)) return [];
    if (status !== "reserved" && status !== "paid") return [];
    return [{ number: numero, status }];
  });
}

/**
 * RN15: publicamente o vencedor aparece como "Nome S.". Se o número sorteado
 * não tiver reserva confirmada, `name` volta `null` e a página exibe o aviso.
 */
export async function getPublicWinner(
  raffleId: string,
  winnerNumber: number
): Promise<PublicWinner | null> {
  const admin = supabaseAdmin();

  const { data: vinculo, error: erroVinculo } = await admin
    .from("reservation_numbers")
    .select("reservation_id")
    .eq("raffle_id", raffleId)
    .eq("number", winnerNumber)
    .eq("active", true)
    .maybeSingle();

  if (erroVinculo) {
    console.error("[raffles] falha ao localizar o número vencedor", erroVinculo);
    return null;
  }
  if (!vinculo) return { number: winnerNumber, name: null };

  const { data: reserva, error: erroReserva } = await admin
    .from("reservations")
    .select("first_name, last_name")
    .eq("id", vinculo.reservation_id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (erroReserva) {
    console.error("[raffles] falha ao carregar o comprador vencedor", erroReserva);
    return null;
  }
  if (!reserva) return { number: winnerNumber, name: null };

  const nome = reserva as { first_name: string; last_name: string };
  const primeiroNome = nome.first_name.trim().split(/\s+/)[0] ?? "";
  const inicial = nome.last_name.trim().charAt(0).toUpperCase();

  return {
    number: winnerNumber,
    name: inicial ? `${primeiroNome} ${inicial}.` : primeiroNome,
  };
}

export type ReservationPayment = {
  code: string;
  publicToken: string;
  status: "pending" | "declared_paid" | "confirmed" | "released" | "expired";
  totalCents: number;
  expiresAt: string;
  numbers: number[];
  raffle: {
    slug: string;
    title: string;
    organizerName: string;
    pixKey: string;
    pixReceiverName: string;
    pixCity: string;
  };
};

/**
 * Leitura da reserva para a página de pagamento. Só aqui as colunas `pix_*`
 * da rifa podem ser lidas (SPEC §4). Retorna `null` para token inválido,
 * inexistente ou que não pertença à rifa do slug informado.
 */
export async function getReservationForPayment(
  slug: string,
  token: string
): Promise<ReservationPayment | null> {
  if (!publicSlugSchema.safeParse(slug).success) return null;
  if (!z.string().uuid().safeParse(token).success) return null;

  const { data, error } = await supabaseAdmin()
    .from("reservations")
    .select(
      "code, public_token, status, total_cents, expires_at, reservation_numbers(number), raffles!inner(slug, title, organizer_name, pix_key, pix_receiver_name, pix_city)"
    )
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("[raffles] falha ao carregar reserva para pagamento", error);
    throw error;
  }
  if (!data) return null;

  const registro = data as {
    code: string;
    public_token: string;
    status: ReservationPayment["status"];
    total_cents: number;
    expires_at: string;
    reservation_numbers: { number: number }[] | null;
    raffles: {
      slug: string;
      title: string;
      organizer_name: string;
      pix_key: string;
      pix_receiver_name: string;
      pix_city: string;
    } | { slug: string; title: string; organizer_name: string; pix_key: string; pix_receiver_name: string; pix_city: string }[];
  };

  const rifa = Array.isArray(registro.raffles) ? registro.raffles[0] : registro.raffles;
  if (!rifa || rifa.slug !== slug) return null;

  const numeros = (registro.reservation_numbers ?? [])
    .map((item) => item.number)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);

  return {
    code: registro.code,
    publicToken: registro.public_token,
    status: registro.status,
    totalCents: registro.total_cents,
    expiresAt: registro.expires_at,
    numbers: numeros,
    raffle: {
      slug: rifa.slug,
      title: rifa.title,
      organizerName: rifa.organizer_name,
      pixKey: rifa.pix_key,
      pixReceiverName: rifa.pix_receiver_name,
      pixCity: rifa.pix_city,
    },
  };
}
