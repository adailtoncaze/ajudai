import "server-only";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const paramsSchema = z.object({ token: z.string().uuid() });

const headers = { "Cache-Control": "no-store" };

function erro(error: string, status: number) {
  return Response.json({ error }, { status, headers });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const parametros = paramsSchema.safeParse(await params);
    // Token inexistente ou não UUID: não vazar informação (PRD/T08).
    if (!parametros.success) return erro("reservation_not_found", 404);

    const { data, error } = await supabaseAdmin().rpc("declare_paid", {
      p_token: parametros.data.token,
    });

    if (error) {
      const texto = error.message ?? "";
      if (texto.includes("reservation_not_found")) return erro("reservation_not_found", 404);
      if (texto.includes("reservation_released")) return erro("reservation_released", 409);
      console.error("[api/declare-paid] falha ao declarar pagamento", {
        sqlstate: error.code,
      });
      return erro("server_error", 500);
    }

    const linha = Array.isArray(data) ? data[0] : null;
    const registro = (linha ?? {}) as { out_status?: unknown; out_conflicts?: unknown };
    const status = typeof registro.out_status === "string" ? registro.out_status : null;
    const conflicts =
      typeof registro.out_conflicts === "number" && Number.isFinite(registro.out_conflicts)
        ? registro.out_conflicts
        : 0;

    if (status !== "declared_paid" && status !== "confirmed") {
      console.error("[api/declare-paid] resposta inválida do banco");
      return erro("server_error", 500);
    }

    return Response.json({ status, conflicts }, { status: 200, headers });
  } catch (error) {
    console.error(
      "[api/declare-paid] erro inesperado",
      error instanceof Error ? error.message : String(error)
    );
    return erro("server_error", 500);
  }
}
