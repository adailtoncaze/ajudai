/** Padrão de listagem do painel: 10 itens por página. */
export const ITENS_POR_PAGINA = 10;

/** Números exibidos quando há muitas páginas (reticências nos intervalos omitidos). */
export function numerosVisiveis(pagina: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const numeros: (number | "…")[] = [1];
  const inicio = Math.max(2, pagina - 1);
  const fim = Math.min(total - 1, pagina + 1);

  if (inicio > 2) numeros.push("…");
  for (let p = inicio; p <= fim; p++) numeros.push(p);
  if (fim < total - 1) numeros.push("…");
  numeros.push(total);
  return numeros;
}
