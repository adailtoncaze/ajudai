import { describe, expect, it } from "vitest";
import { configuracaoCard, descricaoParaCard, resumirTexto } from "./share-card";
import {
  TEXTO_CTA,
  compartilhamentoNativo,
  ctaComLink,
  legendaCard,
  shareCardUrl,
  shareLinks,
  textoComLink,
  whatsappShareLink,
} from "./share";

describe("configuração do card de compartilhamento", () => {
  it("usa card vertical para o WhatsApp, aproveitando a tela do celular", () => {
    expect(configuracaoCard("whatsapp", "feed")).toMatchObject({
      largura: 1080,
      altura: 1920,
      vertical: true,
    });
  });

  it("mantém 1200x630 para o Facebook", () => {
    expect(configuracaoCard("facebook", "feed")).toMatchObject({
      largura: 1200,
      altura: 630,
      vertical: false,
    });
  });

  it("usa formatos verticais para o Instagram", () => {
    expect(configuracaoCard("instagram", "feed")).toMatchObject({
      largura: 1080,
      altura: 1350,
      vertical: true,
    });
    expect(configuracaoCard("instagram", "story")).toMatchObject({
      largura: 1080,
      altura: 1920,
      vertical: true,
    });
  });

  it("rejeita redes e formatos desconhecidos", () => {
    expect(configuracaoCard("x", "feed")).toBeNull();
    expect(configuracaoCard("instagram", "story-antigo")).toBeNull();
    expect(configuracaoCard("whatsapp", "story")).not.toBeNull();
  });

  it("usa fonte maior e prêmio maior no card do WhatsApp", () => {
    const whatsapp = configuracaoCard("whatsapp", "feed")!;
    const story = configuracaoCard("instagram", "story")!;
    expect(whatsapp.descricaoFonte).toBe(40);
    expect(whatsapp.premioImagemTamanho).toBe(180);
    expect(whatsapp.descricaoFonte).toBeGreaterThan(story.descricaoFonte);
    expect(whatsapp.premioImagemTamanho).toBeGreaterThan(story.premioImagemTamanho);
    expect(whatsapp.descricaoMax).toBeGreaterThanOrEqual(340);
    expect(configuracaoCard("instagram", "feed")!.descricaoMax).toBeGreaterThanOrEqual(290);
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

  it("envia a URL sem repetir o CTA como legenda no compartilhamento nativo", () => {
    const nativo = compartilhamentoNativo("https://exemplo.test/r/rifa", undefined, 123);
    expect(nativo).toEqual({
      title: "",
      text: "",
      url: "https://exemplo.test/r/rifa?wa=123",
    });
  });

  it("anexa o PNG do card junto com a URL quando o arquivo está disponível", () => {
    const arquivo = { name: "card.png" } as File;
    const nativo = compartilhamentoNativo("https://exemplo.test/r/rifa", arquivo, 123);
    expect(nativo.files).toEqual([arquivo]);
    expect(nativo.url).toBe("https://exemplo.test/r/rifa?wa=123");
    expect(nativo.text).toBe("");
  });

  it("usa o CTA exato e separa a URL no fallback do WhatsApp", () => {
    expect(TEXTO_CTA).toBe("Clique aqui para ajudar!");
    const texto = ctaComLink("https://exemplo.test/r/rifa", 123);
    expect(texto).toBe(`${TEXTO_CTA}\nhttps://exemplo.test/r/rifa?wa=123`);
    expect(textoDoLink(whatsappShareLink("https://exemplo.test/r/rifa", 123))).toBe(texto);
    expect(texto).not.toContain("Rifa da escola");
  });
});
