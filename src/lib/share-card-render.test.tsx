import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { configuracaoCard, descricaoParaCard, resumirTexto } from "./share-card";
import { CORES_BILHETE, elementoCard, numerosAleatorios } from "./share-card-image";

const variantes = [
  ["whatsapp", "direct"],
  ["facebook", "direct"],
  ["instagram", "direct"],
  ["instagram", "story"],
] as const;

it.each(variantes)("renderiza o card de %s (%s) com data do sorteio", async (rede, formato) => {
  const config = configuracaoCard(rede, formato)!;
  const resposta = new ImageResponse(
    elementoCard({
      titulo: resumirTexto("Rifa Solidária - Ajude LILICA", config.tituloMax),
      descricao: descricaoParaCard(
        "Juntos pela Lilica: participe da nossa rifa solidária! Cada número ajuda nos cuidados e na cirurgia da nossa amiga. ".repeat(
          4
        ),
        "Headphone Bluetooth Sem Fio",
        config.descricaoMax
      ),
      imagem: null,
      premioTitulo: "Headphone Bluetooth Sem Fio",
      premioImagem: null,
      precoCents: 1000,
      drawDate: "2026-12-20",
      config,
    }),
    { width: config.largura, height: config.altura }
  );
  const bytes = await resposta.arrayBuffer();
  expect(bytes.byteLength).toBeGreaterThan(0);
}, 30000);

it.each(variantes)("renderiza o card de %s (%s) sem data do sorteio", async (rede, formato) => {
  const config = configuracaoCard(rede, formato)!;
  const resposta = new ImageResponse(
    elementoCard({
      titulo: "Rifa da escola",
      descricao: "Participe e ajude!",
      imagem: null,
      premioTitulo: null,
      premioImagem: null,
      precoCents: 1000,
      drawDate: null,
      config,
    }),
    { width: config.largura, height: config.altura }
  );
  const bytes = await resposta.arrayBuffer();
  expect(bytes.byteLength).toBeGreaterThan(0);
}, 30000);

it.each([
  ["whatsapp", "direct"],
  ["facebook", "direct"],
] as const)("inclui a imagem do prêmio no card de %s", async (rede, formato) => {
  const config = configuracaoCard(rede, formato)!;
  const imagem = (cor: string) =>
    `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${cor}"/></svg>`
    ).toString("base64")}`;
  const dados = {
    titulo: "Rifa da escola",
    descricao: "Participe e ajude!",
    imagem: null,
    premioTitulo: "Bicicleta",
    precoCents: 1000,
    drawDate: null,
    config,
  };

  // Duas imagens diferentes precisam gerar cards diferentes. Se a foto do prêmio
  // colapsasse no layout flex, ambos cairiam no mesmo placeholder e seriam iguais.
  const primeira = new ImageResponse(
    elementoCard({ ...dados, premioImagem: imagem("#00aa55") }),
    { width: config.largura, height: config.altura }
  );
  const segunda = new ImageResponse(
    elementoCard({ ...dados, premioImagem: imagem("#aa0055") }),
    { width: config.largura, height: config.altura }
  );

  const bytesPrimeira = Buffer.from(await primeira.arrayBuffer());
  const bytesSegunda = Buffer.from(await segunda.arrayBuffer());
  expect(bytesPrimeira.equals(bytesSegunda)).toBe(false);
}, 30000);

describe("bilhetes da borda inferior", () => {
  it("gera números aleatórios, únicos e formatados com dois dígitos", () => {
    const numeros = numerosAleatorios(30);
    const sequencial = Array.from({ length: 30 }, (_, indice) =>
      String(indice + 1).padStart(2, "0")
    );

    expect(numeros).toHaveLength(30);
    expect(new Set(numeros).size).toBe(30);
    expect(numeros.every((numero) => /^\d{2}$/.test(numero))).toBe(true);
    expect(numeros).not.toEqual(sequencial);
  });

  it("mantém a sequência estável entre renderizações", () => {
    expect(numerosAleatorios(12)).toEqual(numerosAleatorios(12));
  });

  it("alterna cores do tema no preenchimento dos bilhetes", () => {
    expect(CORES_BILHETE).toEqual([
      "#FFFFFF",
      "#FFF1EC",
      "#EAFCF3",
      "#FFE0D5",
      "#D0F7E5",
    ]);
  });
});
