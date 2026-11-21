import { z } from "zod";
import { getPublicRaffle, getPublicTakenNumbers, publicSlugSchema } from "@/lib/raffles";

const paramsSchema = z.object({ slug: publicSlugSchema });

const headers = { "Cache-Control": "no-store" };

function erro(codigo: string, status: number) {
  return Response.json({ error: codigo }, { status, headers });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) return erro("raffle_not_found", 404);

    const raffle = await getPublicRaffle(parsed.data.slug);
    if (!raffle) return erro("raffle_not_found", 404);

    const taken = await getPublicTakenNumbers(raffle.id);
    return Response.json({ taken }, { headers });
  } catch (error) {
    console.error("[api/numbers] falha ao listar números", error);
    return erro("internal_error", 500);
  }
}
