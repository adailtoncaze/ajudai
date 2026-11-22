import sharp from "sharp";

const tempoLimite = () => AbortSignal.timeout(5000);

function tipoDaImagem(resposta: Response): string {
  return (resposta.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

/**
 * Descobre o tipo da imagem sem baixá-la. Alguns servidores não respondem a HEAD;
 * nesses casos tentamos um GET parcial antes de desistir.
 */
async function tipoImagem(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url, { method: "HEAD", signal: tempoLimite() });
    if (!resposta.ok) return null;
    const tipo = tipoDaImagem(resposta);
    return tipo.startsWith("image/") ? tipo : null;
  } catch {
    // Tenta GET abaixo.
  }

  try {
    const resposta = await fetch(url, {
      headers: { Range: "bytes=0-0" },
      signal: tempoLimite(),
    });
    await resposta.arrayBuffer().catch(() => undefined);
    if (!resposta.ok) return null;
    const tipo = tipoDaImagem(resposta);
    return tipo.startsWith("image/") ? tipo : null;
  } catch {
    return null;
  }
}

/**
 * Prepara a imagem de uma rifa para o gerador de cards (Satori/resvg).
 *
 * O renderizador não decodifica WebP: a imagem simplesmente desaparece do card.
 * Como o Storage aceita WebP no upload, convertemos esse formato para PNG antes
 * de entregar a imagem ao `ImageResponse`. Os demais formatos seguem como URL.
 */
export async function imagemParaCard(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const tipo = await tipoImagem(url);
    if (!tipo) return null;
    if (tipo !== "image/webp") return url;

    const resposta = await fetch(url, { signal: tempoLimite() });
    if (!resposta.ok) return null;
    const bytes = Buffer.from(await resposta.arrayBuffer());
    const png = await sharp(bytes).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (erro) {
    console.error("[card] falha ao preparar imagem", erro);
    return null;
  }
}
