import type { FormatoCard, RedeSocial } from "@/lib/share";

export type ConfigCard = {
  largura: number;
  altura: number;
  /** Tamanho da imagem principal no topo (cards verticais). */
  alturaImagem: number;
  tituloMax: number;
  descricaoMax: number;
  premioTituloMax: number;
  vertical: boolean;
  rotulo: string;
};

const CONFIGURACOES: Record<string, ConfigCard> = {
  whatsapp: {
    largura: 1200,
    altura: 630,
    alturaImagem: 0,
    tituloMax: 52,
    descricaoMax: 230,
    premioTituloMax: 42,
    vertical: false,
    rotulo: "Compartilhe com seus amigos",
  },
  facebook: {
    largura: 1200,
    altura: 630,
    alturaImagem: 0,
    tituloMax: 54,
    descricaoMax: 230,
    premioTituloMax: 42,
    vertical: false,
    rotulo: "Curta e compartilhe",
  },
  "instagram-feed": {
    largura: 1080,
    altura: 1350,
    alturaImagem: 540,
    tituloMax: 58,
    descricaoMax: 300,
    premioTituloMax: 46,
    vertical: true,
    rotulo: "Chame no Direct para participar",
  },
  "instagram-story": {
    largura: 1080,
    altura: 1920,
    alturaImagem: 950,
    tituloMax: 62,
    descricaoMax: 420,
    premioTituloMax: 50,
    vertical: true,
    rotulo: "Chame no Direct para participar",
  },
};

/** Valida a combinação rede/formato vinda da URL antes de gerar a imagem. */
export function configuracaoCard(
  rede: string,
  formato: string
): ConfigCard | null {
  if (rede !== "whatsapp" && rede !== "facebook" && rede !== "instagram") {
    return null;
  }
  if (rede === "instagram" && formato !== "feed" && formato !== "story") {
    return null;
  }
  const chave = rede === "instagram" ? `instagram-${formato}` : rede;
  return CONFIGURACOES[chave] ?? null;
}

/** Corta no último espaço para não quebrar palavras ao montar o card. */
export function resumirTexto(texto: string, maximo: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= maximo) return limpo;

  const corte = limpo.slice(0, Math.max(1, maximo - 1));
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/** Descrição do card: título do prêmio entra quando a rifa não tem descrição. */
export function descricaoParaCard(descricao: string, premioTitulo: string | null, maximo: number) {
  const texto = descricao.trim() || (premioTitulo?.trim() ? `Prêmio: ${premioTitulo.trim()}` : "");
  return resumirTexto(texto, maximo);
}

export function redesValidas(rede: string): rede is RedeSocial {
  return rede === "whatsapp" || rede === "instagram" || rede === "facebook";
}

export function formatosValidos(formato: string): formato is FormatoCard {
  return formato === "feed" || formato === "story";
}
