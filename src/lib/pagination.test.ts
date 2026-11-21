import { describe, expect, it } from "vitest";
import { ITENS_POR_PAGINA, numerosVisiveis } from "./pagination";

describe("paginação", () => {
  it("usa 10 itens por página", () => {
    expect(ITENS_POR_PAGINA).toBe(10);
  });

  it("mostra todas as páginas quando há poucas", () => {
    expect(numerosVisiveis(1, 3)).toEqual([1, 2, 3]);
  });

  it("mostra a página atual cercada pelos vizinhos e pelas extremidades", () => {
    expect(numerosVisiveis(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12]);
  });
});
