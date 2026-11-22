import { describe, expect, it } from "vitest";
import {
  assinaturaFormulario,
  valoresIniciaisFormulario,
  type RaffleFormInitial,
} from "./raffle-form";

const inicial: RaffleFormInitial = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Rifa da escola",
  description: "Descrição da rifa",
  organizer_name: "Ana Souza",
  total_numbers: 100,
  price_cents: 1990,
  pix_key: "contato@exemplo.com",
  pix_receiver_name: "ANA SOUZA",
  pix_city: "Sao Paulo",
  reservation_hours: 48,
  ends_at: "2026-12-20T14:00:00.000Z",
  image_url: "https://exemplo.test/rifa.png",
  prize_title: "Bicicleta",
  prize_image_url: "https://exemplo.test/premio.png",
  prize_description: "Descrição editada do prêmio",
  draw_date: "2026-12-21",
  hasReservations: false,
  status: "open",
};

describe("valores iniciais do formulário de rifa", () => {
  it("carrega todos os campos da edição, incluindo a descrição do prêmio", () => {
    expect(valoresIniciaisFormulario(inicial)).toEqual({
      title: "Rifa da escola",
      description: "Descrição da rifa",
      organizer_name: "Ana Souza",
      total_numbers: "100",
      price_reais: "19,90",
      pix_key: "contato@exemplo.com",
      pix_receiver_name: "ANA SOUZA",
      pix_city: "Sao Paulo",
      reservation_hours: "48",
      ends_at: expect.any(String),
      image_url: "https://exemplo.test/rifa.png",
      prize_title: "Bicicleta",
      prize_image_url: "https://exemplo.test/premio.png",
      prize_description: "Descrição editada do prêmio",
      draw_date: "2026-12-21",
    });
  });

  it("usa a última descrição do prêmio recebida do servidor ao sincronizar", () => {
    const antigo = valoresIniciaisFormulario(inicial);
    const atualizado = valoresIniciaisFormulario({
      ...inicial,
      prize_description: "Nova descrição salva",
      prize_title: "Cesta básica",
    });

    expect(antigo.prize_description).toBe("Descrição editada do prêmio");
    expect(atualizado.prize_description).toBe("Nova descrição salva");
    expect(atualizado.prize_title).toBe("Cesta básica");
  });

  it("mantém a assinatura estável quando só muda a identidade do objeto", () => {
    expect(assinaturaFormulario(inicial)).toBe(assinaturaFormulario({ ...inicial }));
    expect(assinaturaFormulario(inicial)).not.toBe(
      assinaturaFormulario({ ...inicial, prize_description: "Outra descrição" })
    );
  });

  it("usa padrões de criação quando não há rifa", () => {
    expect(valoresIniciaisFormulario(null).total_numbers).toBe("100");
    expect(valoresIniciaisFormulario(null).reservation_hours).toBe("48");
    expect(valoresIniciaisFormulario(null).prize_description).toBe("");
    expect(assinaturaFormulario()).toBe("nova");
  });
});
