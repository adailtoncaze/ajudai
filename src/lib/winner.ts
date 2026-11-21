import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseDoServidor = Awaited<ReturnType<typeof createClient>>;

export type WinnerDetails = {
  number: number;
  /** Nome completo, telefone e código só são exibidos ao dono da rifa. */
  name: string | null;
  phone: string | null;
  code: string | null;
};

/** Dados completos do vencedor para o painel (RN15 vale apenas para o público). */
export async function getOwnerWinner(
  supabase: SupabaseDoServidor,
  raffleId: string,
  winnerNumber: number
): Promise<WinnerDetails> {
  const vencedor: WinnerDetails = {
    number: winnerNumber,
    name: null,
    phone: null,
    code: null,
  };

  const { data: vinculo } = await supabase
    .from("reservation_numbers")
    .select("reservation_id")
    .eq("raffle_id", raffleId)
    .eq("number", winnerNumber)
    .eq("active", true)
    .maybeSingle();

  if (!vinculo) return vencedor;

  const { reservation_id: reservationId } = vinculo as { reservation_id: string };
  const { data: reserva } = await supabase
    .from("reservations")
    .select("code, first_name, last_name, phone")
    .eq("id", reservationId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!reserva) return vencedor;

  const dados = reserva as {
    code: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };

  return {
    number: winnerNumber,
    name: `${dados.first_name} ${dados.last_name}`.trim(),
    phone: dados.phone,
    code: dados.code,
  };
}
