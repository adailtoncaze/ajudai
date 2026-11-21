import { describe, expect, it } from "vitest";
import { raffleImageStoragePath } from "./storage";

const DONO = "11111111-1111-4111-8111-111111111111";

describe("raffleImageStoragePath", () => {
  it("extrai o caminho de uma URL pública do bucket", () => {
    const url = `https://projeto.supabase.co/storage/v1/object/public/raffle-images/${DONO}/abc123.png`;
    expect(raffleImageStoragePath(url, DONO)).toBe(`${DONO}/abc123.png`);
  });

  it("decodifica nomes de arquivo escapados", () => {
    const url = `https://projeto.supabase.co/storage/v1/object/public/raffle-images/${DONO}/minha%20rifa.jpg`;
    expect(raffleImageStoragePath(url, DONO)).toBe(`${DONO}/minha rifa.jpg`);
  });

  it("rejeita arquivo de outro dono", () => {
    const url =
      "https://projeto.supabase.co/storage/v1/object/public/raffle-images/outsider/abc123.jpg";
    expect(raffleImageStoragePath(url, DONO)).toBeNull();
  });

  it("rejeita URL de outro bucket ou origem", () => {
    expect(raffleImageStoragePath("https://exemplo.com/outro/abc.jpg", DONO)).toBeNull();
    expect(
      raffleImageStoragePath(
        `https://projeto.supabase.co/storage/v1/object/public/outros/${DONO}/abc.jpg`,
        DONO
      )
    ).toBeNull();
  });

  it("rejeita URL inválida ou vazia", () => {
    expect(raffleImageStoragePath(null, DONO)).toBeNull();
    expect(raffleImageStoragePath("", DONO)).toBeNull();
    expect(raffleImageStoragePath("nao-e-url", DONO)).toBeNull();
  });
});
