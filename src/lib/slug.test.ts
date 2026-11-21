import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("minúsculas, sem acentos e com sufixo aleatório", () => {
    expect(slugify("Rifa Solidária da Praça", "a1b2")).toBe("rifa-solidaria-da-praca-a1b2");
  });

  it("troca símbolos por hífens sem deixar hífens repetidos nas pontas", () => {
    expect(slugify("  Rifa!! Solidária  ", "c3d4")).toBe("rifa-solidaria-c3d4");
  });

  it("corta a base em 50 caracteres", () => {
    const slug = slugify("a".repeat(80), "e5f6");
    expect(slug).toBe(`${"a".repeat(50)}-e5f6`);
    expect(slug).toMatch(/^[a-z0-9-]{3,60}$/);
  });

  it("usa `rifa` quando o título não tem letras ou números", () => {
    expect(slugify("!!!", "0000")).toBe("rifa-0000");
  });

  it("gera sufixos de 4 caracteres alfanuméricos por padrão", () => {
    expect(slugify("Rifa da Vila")).toMatch(/^rifa-da-vila-[a-z0-9]{4}$/);
  });
});
