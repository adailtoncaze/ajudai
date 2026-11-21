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

/** Legenda completa, usada em textos que não acompanham a imagem do card. */
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

const CTA = "👉 Clique aqui para ajudar e participar";

function linkComCacheBuster(url: string, agora: number) {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}wa=${agora}`;
}

/** CTA curto com o link clicável, usado quando a imagem já mostra os detalhes da rifa. */
export function ctaComLink(url: string, agora = Date.now()) {
  return `${CTA}: ${linkComCacheBuster(url, agora)}`;
}

/** Texto da mensagem: legenda, chamada para ação e URL clicável. */
export function textoComLink(url: string, legenda = "", agora = Date.now()) {
  const link = linkComCacheBuster(url, agora);
  return legenda.trim() ? `${legenda.trim()}\n\n${CTA}: ${link}` : link;
}

/**
 * Link do WhatsApp com apenas o CTA e a URL da rifa. A imagem enviada como mídia já traz
 * título, descrição, prêmio e valor; o texto abaixo dela só precisa abrir a página.
 * O parâmetro único evita reaproveitar um preview antigo da mesma página.
 */
export function whatsappShareLink(url: string, agora = Date.now()) {
  return `https://wa.me/?text=${encodeURIComponent(ctaComLink(url, agora))}`;
}

/** Card gerado no servidor: serve de preview no modal e de imagem Open Graph. */
export function shareCardUrl(
  slug: string,
  rede: RedeSocial = "facebook",
  formato: FormatoCard = "feed"
) {
  return `/api/raffles/${slug}/share-card?rede=${rede}&formato=${formato}`;
}
