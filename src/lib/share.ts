import { brl } from "./format";

export type RedeSocial = "whatsapp" | "instagram" | "facebook";
export type FormatoCard = "feed" | "story";

export const TEXTO_CTA = "Clique aqui para ajudar!";

export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const mensagem = text.trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      mensagem ? `${mensagem}\n\n${TEXTO_CTA}\n${url}` : url
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

/** URL com parâmetro único para forçar o WhatsApp a renovar a prévia da página. */
export function urlComPartilha(url: string, agora = Date.now()) {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}wa=${agora}`;
}

/**
 * Texto do fallback `wa.me`: CTA e URL. O WhatsApp só consegue abrir a rifa a partir
 * da URL incluída no texto, então ela precisa aparecer nesse caso.
 */
export function ctaComLink(url: string, agora = Date.now()) {
  return `${TEXTO_CTA}\n${urlComPartilha(url, agora)}`;
}

/**
 * Payload do compartilhamento nativo: o PNG vai como arquivo e a URL como link.
 * Título e texto vazios evitam que o navegador repita o CTA ou mostre o endereço;
 * o WhatsApp anexa a imagem e gera a prévia clicável a partir da URL.
 */
export function compartilhamentoNativo(url: string, arquivo?: File, agora = Date.now()) {
  const dados: ShareData = {
    title: "",
    text: "",
    url: urlComPartilha(url, agora),
  };
  if (arquivo) dados.files = [arquivo];
  return dados;
}

/** Texto da mensagem: legenda, chamada para ação e URL clicável. */
export function textoComLink(url: string, legenda = "", agora = Date.now()) {
  const link = urlComPartilha(url, agora);
  return legenda.trim() ? `${legenda.trim()}\n\n${TEXTO_CTA}\n${link}` : link;
}

/** Link do WhatsApp usado quando o navegador não suporta compartilhamento com arquivo. */
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
