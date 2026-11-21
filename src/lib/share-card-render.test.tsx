import { expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { configuracaoCard, descricaoParaCard, resumirTexto } from "./share-card";
import { elementoCard } from "./share-card-image";

const variantes = [
  ["whatsapp", "feed"],
  ["facebook", "feed"],
  ["instagram", "feed"],
  ["instagram", "story"],
] as const;

it.each(variantes)("renderiza o card de %s (%s)", async (rede, formato) => {
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
      config,
    }),
    { width: config.largura, height: config.altura }
  );
  const bytes = await resposta.arrayBuffer();
  expect(bytes.byteLength).toBeGreaterThan(0);
});
