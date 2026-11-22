import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { imagemParaCard } from "./card-image";

afterEach(() => {
  vi.unstubAllGlobals();
});

function resposta(tipo: string, corpo: Uint8Array, ok = true) {
  const buffer = corpo.buffer.slice(corpo.byteOffset, corpo.byteOffset + corpo.byteLength) as ArrayBuffer;
  return new Response(buffer, { status: ok ? 200 : 404, headers: { "content-type": tipo } });
}

describe("imagemParaCard", () => {
  it("converte WebP para PNG, formato que o gerador de cards suporta", async () => {
    const webp = await sharp({
      create: { width: 120, height: 120, channels: 3, background: "#00aa55" },
    })
      .webp()
      .toBuffer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(resposta("image/webp", new Uint8Array(webp)))
    );

    const resultado = await imagemParaCard("https://exemplo.test/premio.webp");

    expect(resultado).toMatch(/^data:image\/png;base64,/);
    const png = Buffer.from(resultado!.split(",")[1], "base64");
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("mantém a URL original quando o formato já é suportado", async () => {
    const url = "https://exemplo.test/rifa.png";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(resposta("image/png", new Uint8Array([1, 2, 3])))
    );

    expect(await imagemParaCard(url)).toBe(url);
  });

  it("descarta URLs que não são imagens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(resposta("text/html", new Uint8Array([1])))
    );

    expect(await imagemParaCard("https://exemplo.test/pagina")).toBeNull();
    expect(await imagemParaCard("")).toBeNull();
  });
});
