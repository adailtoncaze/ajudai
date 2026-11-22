import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16, formatAmount, normalizePixKey, sanitizeText } from "./pix";

describe("crc16", () => {
  it("calcula o CRC-16/CCITT-FALSE do vetor conhecido", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("sanitizeText", () => {
  it("remove acentos e símbolos, deixa maiúsculo e corta no tamanho máximo", () => {
    expect(sanitizeText("Rifa Solidária", 25)).toBe("RIFA SOLIDARIA");
    expect(sanitizeText("São Paulo", 15)).toBe("SAO PAULO");
    expect(sanitizeText("João Pessoa!", 5)).toBe("JOAO ");
  });
});

describe("formatAmount", () => {
  it("formata centavos com ponto decimal e duas casas", () => {
    expect(formatAmount(5)).toBe("0.05");
    expect(formatAmount(1999)).toBe("19.99");
    expect(formatAmount(2000)).toBe("20.00");
  });
});

describe("normalizePixKey", () => {
  it("reconhece CPF com pontos", () => {
    expect(normalizePixKey("123.456.789-09")).toEqual({ type: "cpf", key: "12345678909" });
  });

  it("reconhece CNPJ com barra", () => {
    expect(normalizePixKey("12.345.678/0001-90")).toEqual({ type: "cnpj", key: "12345678000190" });
  });

  it("reconhece e-mail em maiúsculas, normalizando para minúsculas", () => {
    expect(normalizePixKey("  CONTATO@EXEMPLO.COM  ")).toEqual({
      type: "email",
      key: "contato@exemplo.com",
    });
  });

  it("reconhece telefone com formatação", () => {
    expect(normalizePixKey("+55 (83) 99999-0000")).toEqual({
      type: "phone",
      key: "+5583999990000",
    });
  });

  it("reconhece telefone com DDD sem o DDI, com ou sem máscara", () => {
    expect(normalizePixKey("(83) 99999-0000")).toEqual({
      type: "phone",
      key: "+5583999990000",
    });
    expect(normalizePixKey("83 99999-0000")).toEqual({
      type: "phone",
      key: "+5583999990000",
    });
    expect(normalizePixKey("83999990000")).toEqual({
      type: "phone",
      key: "+5583999990000",
    });
  });

  it("não transforma CPF válido em telefone", () => {
    expect(normalizePixKey("12345678909")).toEqual({ type: "cpf", key: "12345678909" });
    expect(normalizePixKey("123.456.789-00")).toBeNull();
  });

  it("reconhece chave aleatória (UUID), normalizando para minúsculas", () => {
    expect(normalizePixKey("123E4567-E89B-12D3-A456-426614174000")).toEqual({
      type: "random",
      key: "123e4567-e89b-12d3-a456-426614174000",
    });
  });

  it("devolve null para valor inválido", () => {
    expect(normalizePixKey("não é uma chave")).toBeNull();
  });
});

describe("buildPixPayload", () => {
  it("gera o payload completo com chave aleatória (vetor da SPEC §5)", () => {
    expect(
      buildPixPayload({
        key: "123e4567-e89b-12d3-a456-426614174000",
        name: "Rifa Solidária",
        city: "São Paulo",
        amountCents: 2000,
        txid: "R0042",
      })
    ).toBe(
      "00020101021126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540520.005802BR5914RIFA SOLIDARIA6009SAO PAULO62090505R00426304C1B7"
    );
  });

  it("gera o payload completo com telefone (vetor da SPEC §5)", () => {
    expect(
      buildPixPayload({
        key: "+5583999990000",
        name: "Maria da Silva",
        city: "João Pessoa",
        amountCents: 3050,
        txid: "R0007",
      })
    ).toBe(
      "00020101021126360014br.gov.bcb.pix0114+5583999990000520400005303986540530.505802BR5914MARIA DA SILVA6011JOAO PESSOA62090505R00076304CF8B"
    );
  });

  it("lança erro para valor zero", () => {
    expect(() =>
      buildPixPayload({
        key: "+5583999990000",
        name: "Maria da Silva",
        city: "João Pessoa",
        amountCents: 0,
        txid: "R0007",
      })
    ).toThrow("invalid_amount");
  });

  it("lança erro para txid inválido", () => {
    expect(() =>
      buildPixPayload({
        key: "+5583999990000",
        name: "Maria da Silva",
        city: "João Pessoa",
        amountCents: 3050,
        txid: "R-0007!",
      })
    ).toThrow("invalid_txid");
  });
});
