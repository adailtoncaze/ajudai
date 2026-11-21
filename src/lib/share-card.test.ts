import { describe, expect, it } from "vitest";
import { configuracaoCard, descricaoParaCard, resumirTexto } from "./share-card";
import {
  TEXTO_CTA,
  compartilhamentoLink,
  compartilhamentoNativo,
  ctaComLink,
  legendaCard,
  linkStoryInstagram,
  shareCardUrl,
  shareLinks,
  textoComLink,
  urlComCardDirect,
  whatsappShareLink,
} from "./share";

describe("configuração do card de compartilhamento", () => {
  it("usa card vertical para o WhatsApp, aproveitando a tela do celular", () => {
    expect(configuracaoCard("whatsapp", "direct")).toMatchObject({
      largura: 1080,
      altura: 1920,
      vertical: true,
    });
  });

  it("mantém 1200x630 para o Facebook", () => {
    expect(configuracaoCard("facebook", "direct")).toMatchObject({
      largura: 1200,
      altura: 630,
      vertical: false,
    });
  });

  it("usa story vertical e direct quadrado para o Instagram", () => {
    expect(configuracaoCard("instagram", "direct")).toMatchObject({
      largura: 1080,
      altura: 1080,
      vertical: true,
    });
    expect(configuracaoCard("instagram", "story")).toMatchObject({
      largura: 1080,
      altura: 1920,
      vertical: true,
    });
  });

  it("rejeita redes e formatos desconhecidos", () => {
    expect(configuracaoCard("x", "direct")).toBeNull();
    expect(configuracaoCard("instagram", "feed")).toBeNull();
    expect(configuracaoCard("instagram", "story-antigo")).toBeNull();
    expect(configuracaoCard("whatsapp", "story")).not.toBeNull();
  });

  it("usa fonte maior e prêmio maior no card do WhatsApp", () => {
    const whatsapp = configuracaoCard("whatsapp", "direct")!;
    const story = configuracaoCard("instagram", "story")!;
    expect(whatsapp.descricaoFonte).toBe(40);
    expect(whatsapp.premioImagemTamanho).toBe(180);
    expect(whatsapp.descricaoFonte).toBeGreaterThan(story.descricaoFonte);
    expect(whatsapp.premioImagemTamanho).toBeGreaterThan(story.premioImagemTamanho);
    expect(whatsapp.descricaoMax).toBeGreaterThanOrEqual(340);
    expect(configuracaoCard("instagram", "direct")!.descricaoMax).toBeGreaterThanOrEqual(140);
    expect(story.descricaoMax).toBeGreaterThanOrEqual(400);
  });
});

describe("textos do card", () => {
  it("remove quebras e espaços repetidos", () => {
    expect(resumirTexto("Rifa  da\n escola", 40)).toBe("Rifa da escola");
  });

  it("corta no último espaço e acrescenta reticências", () => {
    expect(resumirTexto("Uma rifa beneficente muito legal", 18)).toBe("Uma rifa…");
  });

  it("usa o prêmio como descrição quando a rifa não tem descrição", () => {
    expect(descricaoParaCard("   ", "Cesta básica", 80)).toBe("Prêmio: Cesta básica");
    expect(descricaoParaCard("Rifa da escola", "Cesta básica", 80)).toBe("Rifa da escola");
  });

  it("mantém descrições longas quando cabem no formato", () => {
    const descricao = "Participe da nossa rifa solidária e ajude a Lilica! ".repeat(4).trim();
    expect(descricaoParaCard(descricao, null, 230)).toBe(descricao);
  });
});

describe("URLs de compartilhamento", () => {
  it("monta a URL do card com rede e formato", () => {
    expect(shareCardUrl("rifa-teste", "instagram", "story")).toBe(
      "/api/raffles/rifa-teste/share-card?rede=instagram&formato=story"
    );
  });

  const textoDoLink = (url: string) =>
    decodeURIComponent(new URL(url).searchParams.get("text") ?? "");

  it("inclui chamada para ação com link clicável na mensagem", () => {
    const links = shareLinks("https://exemplo.test/r/rifa", "Rifa da escola");
    expect(textoDoLink(links.whatsapp)).toContain(
      `Rifa da escola\n\n${TEXTO_CTA}\nhttps://exemplo.test/r/rifa`
    );
  });

  it("envia só a URL quando não há legenda", () => {
    const links = shareLinks("https://exemplo.test/r/rifa", "  ");
    expect(textoDoLink(links.whatsapp)).toBe("https://exemplo.test/r/rifa");
  });

  it("gera a legenda do card com o valor e sem quantidade de números", () => {
    const legenda = legendaCard({
      titulo: "Ajude a Lilica",
      descricao: "Rifa solidária",
      premioTitulo: "Cesta básica",
      precoCents: 1000,
    });
    expect(legenda).toContain("🎟️ Ajude a Lilica");
    expect(legenda).toContain("🎁 Prêmio: Cesta básica");
    expect(legenda).toContain("10,00");
    expect(legenda).not.toContain("números");
  });

  it("monta texto e link com legenda e parâmetro para renovar a prévia", () => {
    const texto = textoComLink("https://exemplo.test/r/rifa", "Rifa da escola", 123);
    expect(texto).toContain(
      `${TEXTO_CTA}\nhttps://exemplo.test/r/rifa?wa=123`
    );
  });

  it("envia o CTA na legenda e a URL como link no compartilhamento nativo", () => {
    const nativo = compartilhamentoNativo("https://exemplo.test/r/rifa", undefined, 123);
    expect(nativo).toEqual({
      title: "",
      text: "Clique aqui para ajudar!",
      url: "https://exemplo.test/r/rifa?wa=123",
    });
  });

  it("anexa o PNG do card junto com a legenda e a URL", () => {
    const arquivo = { name: "card.png" } as File;
    const nativo = compartilhamentoNativo("https://exemplo.test/r/rifa", arquivo, 123);
    expect(nativo.files).toEqual([arquivo]);
    expect(nativo.url).toBe("https://exemplo.test/r/rifa?wa=123");
    expect(nativo.text).toBe("Clique aqui para ajudar!");
  });

  it("usa o link universal oficial para abrir o criador de Stories, sem passar pelo Direct", () => {
    expect(linkStoryInstagram()).toBe("https://www.instagram.com/create/story/");
  });

  it("monta o link com o marcador do card do Direct e abre a folha nativa", () => {
    const url = urlComCardDirect("https://exemplo.test/r/rifa");
    expect(url).toBe("https://exemplo.test/r/rifa?ig=direct");
    expect(urlComCardDirect("https://exemplo.test/r/rifa?wa=123")).toBe(
      "https://exemplo.test/r/rifa?wa=123&ig=direct"
    );
    expect(compartilhamentoLink(url)).toEqual({ title: "", text: "", url });
  });

  it("usa o CTA exato e separa a URL no fallback do WhatsApp", () => {
    expect(TEXTO_CTA).toBe("Clique aqui para ajudar!");
    const texto = ctaComLink("https://exemplo.test/r/rifa", 123);
    expect(texto).toBe(`${TEXTO_CTA}\nhttps://exemplo.test/r/rifa?wa=123`);
    expect(textoDoLink(whatsappShareLink("https://exemplo.test/r/rifa", 123))).toBe(texto);
    expect(texto).not.toContain("Rifa da escola");
  });
});
