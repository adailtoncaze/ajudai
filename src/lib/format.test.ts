import { describe, expect, it } from "vitest";
import { brl, dateOnly, dateTime } from "./format";

describe("formatação", () => {
  it("mostra centavos como reais", () => {
    expect(brl(12345)).toContain("R$");
    expect(brl(12345)).toContain("123,45");
  });

  it("usa data e hora de São Paulo", () => {
    expect(dateTime("2026-01-15T12:00:00Z")).toContain("15/01/2026");
  });

  it("mostra uma data sem horário sem mudar o dia", () => {
    expect(dateOnly("2026-12-20")).toBe("20/12/2026");
  });
});
