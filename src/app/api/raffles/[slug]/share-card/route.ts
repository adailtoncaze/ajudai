import { ImageResponse } from "next/og";
import { getPublicRaffle, publicSlugSchema } from "@/lib/raffles";
import { configuracaoCard, descricaoParaCard, resumirTexto } from "@/lib/share-card";
import { elementoCard } from "@/lib/share-card-image";

type Props = { params: Promise<{ slug: string }> };

const headers = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
};

/** Só entrega imagens HTTP(S) de verdade: o gerador falharia com URLs quebradas. */
async function imagemValida(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const resposta = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    const tipo = resposta.headers.get("content-type") ?? "";
    return resposta.ok && tipo.startsWith("image/") ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { slug } = await params;
    if (!publicSlugSchema.safeParse(slug).success) {
      return new Response("Rifa não encontrada", { status: 404 });
    }

    const consulta = new URL(request.url).searchParams;
    const config = configuracaoCard(
      consulta.get("rede") ?? "facebook",
      consulta.get("formato") ?? "direct"
    );
    if (!config) return new Response("Parâmetros inválidos", { status: 400 });

    const rifa = await getPublicRaffle(slug);
    if (!rifa) return new Response("Rifa não encontrada", { status: 404 });

    const [imagem, premioImagem] = await Promise.all([
      imagemValida(rifa.image_url),
      imagemValida(rifa.prize_image_url),
    ]);

    return new ImageResponse(
      elementoCard({
        titulo: resumirTexto(rifa.title, config.tituloMax),
        descricao: descricaoParaCard(rifa.description, rifa.prize_title, config.descricaoMax),
        imagem,
        premioTitulo: resumirTexto(rifa.prize_title?.trim() || "Prêmio da rifa", config.premioTituloMax),
        premioImagem,
        precoCents: rifa.price_cents,
        drawDate: rifa.draw_date,
        config,
      }),
      {
        width: config.largura,
        height: config.altura,
        headers,
      }
    );
  } catch (error) {
    console.error("[api/share-card] falha ao gerar card", error);
    return new Response("Não foi possível gerar o card", {
      status: 500,
      headers,
    });
  }
}
