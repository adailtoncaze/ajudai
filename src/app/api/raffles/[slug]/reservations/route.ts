import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  mapReservationError,
  reservationHttpStatus,
  type ReservationErrorCode,
} from "@/lib/reservation-messages";
import { getPublicRaffle, publicSlugSchema } from "@/lib/raffles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createReservationSchema } from "@/lib/validation";

const paramsSchema = z.object({ slug: publicSlugSchema });

const reservationResponseSchema = z.object({
  token: z.string().uuid(),
  code: z.string().regex(/^R\d{4,}$/),
  totalCents: z.number().int().nonnegative(),
  expiresAt: z.string(),
});

const headers = { "Cache-Control": "no-store" };

function erro(codigo: ReservationErrorCode) {
  return Response.json(
    { error: codigo },
    { status: reservationHttpStatus[codigo], headers }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const parametros = paramsSchema.safeParse(await params);
    if (!parametros.success) return erro("raffle_not_found");

    let corpo: unknown;
    try {
      corpo = await request.json();
    } catch {
      return erro("invalid");
    }
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return erro("invalid");

    const dados = corpo as Record<string, unknown>;

    // Campo isca: um humano nunca preenche esse campo oculto (SPEC §10).
    if (dados.website !== undefined && dados.website !== "" && dados.website !== null) {
      return erro("invalid");
    }

    const validados = createReservationSchema.safeParse(dados);
    if (!validados.success) return erro("invalid");

    const raffle = await getPublicRaffle(parametros.data.slug);
    if (!raffle) return erro("raffle_not_found");
    if (raffle.status !== "open") return erro("raffle_closed");

    const encaminhado = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = encaminhado || "unknown";
    const salt = process.env.IP_HASH_SALT ?? "";
    const ipHash = createHash("sha256").update(`${ip}${salt}`).digest("hex");

    const { data, error } = await supabaseAdmin().rpc("create_reservation", {
      p_raffle_id: raffle.id,
      p_numbers: validados.data.numbers,
      p_first_name: validados.data.firstName,
      p_last_name: validados.data.lastName,
      p_phone: validados.data.phone,
      p_ip_hash: ipHash,
    });

    if (error) {
      const codigo = mapReservationError(error.code, error.message);
      // Log técnico sem nome, telefone ou chave do comprador.
      console.error("[api/reservations] falha ao criar reserva", {
        sqlstate: error.code,
        codigo,
      });
      return erro(codigo);
    }

    const linha = Array.isArray(data) ? data[0] : null;
    const resposta = reservationResponseSchema.safeParse(linha && {
      token: (linha as { out_public_token?: unknown }).out_public_token,
      code: (linha as { out_code?: unknown }).out_code,
      totalCents: (linha as { out_total_cents?: unknown }).out_total_cents,
      expiresAt: (linha as { out_expires_at?: unknown }).out_expires_at,
    });
    if (!resposta.success) {
      console.error("[api/reservations] resposta inválida do banco");
      return erro("server_error");
    }

    return Response.json(resposta.data, { status: 201, headers });
  } catch (error) {
    console.error(
      "[api/reservations] erro inesperado",
      error instanceof Error ? error.message : String(error)
    );
    return erro("server_error");
  }
}
