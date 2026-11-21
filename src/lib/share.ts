import { brl } from "./format";

export type RedeSocial = "whatsapp" | "instagram" | "facebook";
export type FormatoCard = "feed" | "story";

export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const mensagem = text.trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      mensagem ? `${mensagem}\n\n👉 Clique aqui para ajudar e participar: ${url}` : url
    )}`,
    // O Instagram não tem URL de compartilhamento com link pré-preenchido.
    instagram: "https://www.instagram.com/",
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  };
}

type DadosLegenda = {
  titulo: string;
  descricao: string;
  premioTitulo: string | null;
  precoCents: number;
};

/** Legenda enviada junto com a imagem do card; a URL é acrescentada por `whatsappShareLink`. */
export function legendaCard(dados: DadosLegenda) {
  return [
    `🎟️ ${dados.titulo.trim()}`,
    dados.descricao.trim(),
    dados.premioTitulo?.trim() ? `🎁 Prêmio: ${dados.premioTitulo.trim()}` : "",
    `💰 ${brl(dados.precoCents)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Texto da mensagem: legenda, chamada para ação e URL clicável. */
export function textoComLink(url: string, legenda = "", agora = Date.now()) {
  const separador = url.includes("?") ? "&" : "?";
  const urlComCacheBuster = `${url}${separador}wa=${agora}`;
  return legenda.trim()
    ? `${legenda.trim()}\n\n👉 Clique aqui para ajudar e participar: ${urlComCacheBuster}`
    : urlComCacheBuster;
}

/**
 * Link do WhatsApp com a legenda e a URL da rifa. O WhatsApp transforma a URL em link clicável.
 * O parâmetro único evita reaproveitar um preview antigo da mesma página.
 */
export function whatsappShareLink(
  url: string,
  legenda = "",
  agora = Date.now()
) {
  return `https://wa.me/?text=${encodeURIComponent(
    textoComLink(url, legenda, agora)
  )}`;
}

/** Card gerado no servidor: serve de preview no modal e de imagem Open Graph. */
export function shareCardUrl(
  slug: string,
  rede: RedeSocial = "facebook",
  formato: FormatoCard = "feed"
) {
  return `/api/raffles/${slug}/share-card?rede=${rede}&formato=${formato}`;
}
