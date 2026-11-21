import { dateOnly } from "./format";
import type { FormatoCard, RedeSocial } from "@/lib/share";

export type ConfigCartela = {
  /** Altura total da faixa ilustrativa. */
  altura: number;
  /** Quantidade de números exibidos (copiados da cartela da home). */
  quantidade: number;
  /** Números por linha. */
  colunas: number;
  tamanhoNumero: number;
  fonteNumero: number;
};

export type ConfigCard = {
  largura: number;
  altura: number;
  /** Tamanho da imagem principal no topo (cards verticais). */
  alturaImagem: number;
  tituloMax: number;
  descricaoMax: number;
  /** Tamanho da fonte da descrição nos cards verticais. */
  descricaoFonte: number;
  /** Tamanho da imagem do prêmio nos cards verticais. */
  premioImagemTamanho: number;
  premioTituloMax: number;
  /** Cartela ilustrativa da home, dimensionada para cada formato. */
  cartela: ConfigCartela;
  vertical: boolean;
  rotulo: string;
};

const CONFIGURACOES: Record<string, ConfigCard> = {
  whatsapp: {
    largura: 1080,
    altura: 1920,
    alturaImagem: 780,
    tituloMax: 62,
    descricaoMax: 350,
    descricaoFonte: 40,
    premioImagemTamanho: 180,
    premioTituloMax: 50,
    cartela: { altura: 188, quantidade: 12, colunas: 6, tamanhoNumero: 52, fonteNumero: 22 },
    vertical: true,
    rotulo: "Toque no link para participar",
  },
  facebook: {
    largura: 1200,
    altura: 630,
    alturaImagem: 0,
    tituloMax: 54,
    descricaoMax: 200,
    descricaoFonte: 21,
    premioImagemTamanho: 82,
    premioTituloMax: 42,
    cartela: { altura: 80, quantidade: 8, colunas: 8, tamanhoNumero: 44, fonteNumero: 17 },
    vertical: false,
    rotulo: "Curta e compartilhe",
  },
  "instagram-direct": {
    largura: 1080,
    altura: 1080,
    alturaImagem: 360,
    tituloMax: 52,
    descricaoMax: 150,
    descricaoFonte: 24,
    premioImagemTamanho: 100,
    premioTituloMax: 42,
    cartela: { altura: 148, quantidade: 12, colunas: 6, tamanhoNumero: 38, fonteNumero: 16 },
    vertical: true,
    rotulo: "Chame no Direct para participar",
  },
  "instagram-story": {
    largura: 1080,
    altura: 1920,
    alturaImagem: 950,
    tituloMax: 62,
    descricaoMax: 420,
    descricaoFonte: 26,
    premioImagemTamanho: 116,
    premioTituloMax: 50,
    cartela: { altura: 188, quantidade: 12, colunas: 6, tamanhoNumero: 52, fonteNumero: 22 },
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
  if (rede === "instagram" && formato !== "story" && formato !== "direct") {
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

/** Data do sorteio já formatada para o card, exibida ao lado do valor. */
export function dataParaCard(data: string | null): string | null {
  return data ? dateOnly(data) : null;
}

export function redesValidas(rede: string): rede is RedeSocial {
  return rede === "whatsapp" || rede === "instagram" || rede === "facebook";
}

export function formatosValidos(formato: string): formato is FormatoCard {
  return formato === "story" || formato === "direct";
}
