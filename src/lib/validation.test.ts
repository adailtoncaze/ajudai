import { describe, expect, it } from "vitest";
import {
  centsToReaisInput,
  createReservationSchema,
  reaisToCents,
  reservationErrors,
  raffleCreateSchema,
  raffleEditSchema,
  raffleErrors,
  saoPauloLocalToIso,
  validateImageFile,
} from "./validation";

const rifa = {
  title: "Rifa Solidária",
  description: "Descrição da rifa",
  organizer_name: "João Silva",
  total_numbers: "1000",
  price_reais: "1.234,56",
  pix_key: "123.456.789-09",
  pix_receiver_name: "João Silva",
  pix_city: "João Pessoa",
  reservation_hours: "48",
  ends_at: "",
  image_url: "",
  prize_title: "",
  prize_image_url: "",
  prize_description: "",
  draw_date: "",
};

describe("reaisToCents", () => {
  it("converte reais com milhar e vírgula para centavos inteiros", () => {
    expect(reaisToCents("1.234,56")).toBe(123456);
    expect(reaisToCents("R$ 19,90")).toBe(1990);
    expect(reaisToCents("10")).toBe(1000);
    expect(reaisToCents("0,05")).toBe(5);
  });

  it("rejeita valores inválidos", () => {
    expect(reaisToCents("dez")).toBeNull();
    expect(reaisToCents("12,345")).toBeNull();
    expect(centsToReaisInput(1990)).toBe("19,90");
  });
});

describe("saoPauloLocalToIso", () => {
  it("interpreta o horário digitado em America/Sao_Paulo", () => {
    expect(saoPauloLocalToIso("2026-01-15T12:00")).toBe("2026-01-15T15:00:00.000Z");
  });

  it("rejeita datas impossíveis", () => {
    expect(saoPauloLocalToIso("2026-02-30T12:00")).toBeNull();
    expect(saoPauloLocalToIso("15/01/2026")).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("aceita JPG, PNG e WebP até 2 MB", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("recusa tipo inválido e arquivo acima de 2 MB", () => {
    expect(validateImageFile({ type: "image/gif", size: 10 })).toContain("JPG");
    expect(validateImageFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toContain("2 MB");
  });
});

describe("schema da rifa", () => {
  it("aceita CPF com pontuação e grava a chave normalizada e o preço em centavos", () => {
    const parsed = raffleCreateSchema.safeParse(rifa);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.pix_key).toBe("12345678909");
    expect(parsed.data.price_cents).toBe(123456);
    expect(parsed.data.total_numbers).toBe(1000);
    expect(parsed.data.ends_at).toBeNull();
    expect(parsed.data.draw_date).toBeNull();
    expect(parsed.data.prize_description).toBe("");
    expect(parsed.data.prize_title).toBeNull();
    expect(parsed.data.prize_image_url).toBeNull();
  });

  it("aceita telefone com pontuação e normaliza a chave Pix", () => {
    const parsed = raffleCreateSchema.safeParse({ ...rifa, pix_key: "+55 (83) 99999-0000" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.pix_key).toBe("+5583999990000");
  });

  it("recusa chave Pix inválida", () => {
    const parsed = raffleCreateSchema.safeParse({ ...rifa, pix_key: "chave inválida" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(raffleErrors(parsed.error).pix_key).toContain("Chave Pix inválida");
  });

  it("recusa quantidade acima de 1000 e preço zero", () => {
    const many = raffleCreateSchema.safeParse({ ...rifa, total_numbers: "1001" });
    const zero = raffleCreateSchema.safeParse({ ...rifa, price_reais: "0" });
    expect(many.success).toBe(false);
    expect(zero.success).toBe(false);
    if (!many.success) expect(raffleErrors(many.error).total_numbers).toContain("1000");
    if (!zero.success) expect(raffleErrors(zero.error).price_reais).toContain("maior que zero");
  });

  it("na edição, quantidade e preço podem ficar ausentes (campos bloqueados)", () => {
    const parsed = raffleEditSchema.safeParse({
      title: "Rifa Atualizada",
      description: rifa.description,
      organizer_name: rifa.organizer_name,
      pix_key: rifa.pix_key,
      pix_receiver_name: rifa.pix_receiver_name,
      pix_city: rifa.pix_city,
      reservation_hours: rifa.reservation_hours,
      ends_at: rifa.ends_at,
      image_url: rifa.image_url,
      prize_title: rifa.prize_title,
      prize_image_url: rifa.prize_image_url,
      prize_description: rifa.prize_description,
      draw_date: rifa.draw_date,
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.total_numbers).toBeUndefined();
      expect(parsed.data.price_cents).toBeUndefined();
    }
  });
});

describe("campos de prêmio e data do sorteio", () => {
  it("aceita os campos opcionais preenchidos sem exigir horário", () => {
    const parsed = raffleCreateSchema.safeParse({
      ...rifa,
      prize_image_url: "https://example.com/premio.jpg",
      prize_description: "Uma cesta básica completa.",
      draw_date: "2026-12-20",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.prize_image_url).toBe("https://example.com/premio.jpg");
      expect(parsed.data.prize_description).toBe("Uma cesta básica completa.");
      expect(parsed.data.draw_date).toBe("2026-12-20");
    }
  });

  it("aceita o título do prêmio e recusa mais de 120 caracteres", () => {
    const valido = raffleCreateSchema.safeParse({
      ...rifa,
      prize_title: "  Cesta básica completa  ",
    });
    const longo = raffleCreateSchema.safeParse({
      ...rifa,
      prize_title: "a".repeat(121),
    });
    expect(valido.success).toBe(true);
    if (valido.success) expect(valido.data.prize_title).toBe("Cesta básica completa");
    expect(longo.success).toBe(false);
    if (!longo.success) expect(raffleErrors(longo.error).prize_title).toContain("120");
  });

  it("aceita 29 de fevereiro em ano bissexto e recusa datas impossíveis", () => {
    const bissexto = raffleCreateSchema.safeParse({ ...rifa, draw_date: "2028-02-29" });
    const impossivel = raffleCreateSchema.safeParse({ ...rifa, draw_date: "2026-02-29" });
    const formato = raffleCreateSchema.safeParse({ ...rifa, draw_date: "20/12/2026" });
    expect(bissexto.success).toBe(true);
    expect(impossivel.success).toBe(false);
    expect(formato.success).toBe(false);
    if (!impossivel.success) {
      expect(raffleErrors(impossivel.error).draw_date).toContain("data de sorteio válida");
    }
  });

  it("recusa descrição do prêmio acima de 4000 caracteres", () => {
    const parsed = raffleCreateSchema.safeParse({
      ...rifa,
      prize_description: "a".repeat(4001),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(raffleErrors(parsed.error).prize_description).toContain("4000");
    }
  });
});

describe("schema da reserva", () => {
  const compra = {
    numbers: [7, 12],
    firstName: "Maria",
    lastName: "Silva",
    phone: "(83) 99999-0000",
  };

  it("aceita WhatsApp com pontuação e o normaliza", () => {
    const parsed = createReservationSchema.safeParse(compra);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.phone).toBe("83999990000");
  });

  it("exige WhatsApp (obrigatório) e recusa nome de uma letra e mais de 50 números", () => {
    const nome = createReservationSchema.safeParse({ ...compra, firstName: "M" });
    const vazio = createReservationSchema.safeParse({ ...compra, phone: "" });
    const ausente = createReservationSchema.safeParse({
      numbers: compra.numbers,
      firstName: compra.firstName,
      lastName: compra.lastName,
    });
    const telefone = createReservationSchema.safeParse({ ...compra, phone: "123" });
    const muitos = createReservationSchema.safeParse({
      ...compra,
      numbers: Array.from({ length: 51 }, (_, indice) => indice + 1),
    });

    expect(nome.success).toBe(false);
    expect(vazio.success).toBe(false);
    expect(ausente.success).toBe(false);
    expect(telefone.success).toBe(false);
    expect(muitos.success).toBe(false);
    if (!nome.success) expect(reservationErrors(nome.error).firstName).toContain("2 letras");
    if (!vazio.success) expect(reservationErrors(vazio.error).phone).toContain("WhatsApp");
    if (!telefone.success) expect(reservationErrors(telefone.error).phone).toContain("WhatsApp");
    if (!muitos.success) expect(reservationErrors(muitos.error).numbers).toContain("50");
  });

  it("nunca aceita valores ou total enviados pelo navegador", () => {
    const parsed = createReservationSchema.safeParse({
      ...compra,
      totalCents: 1,
      priceCents: 1,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("totalCents");
      expect(parsed.data).not.toHaveProperty("priceCents");
    }
  });
});
