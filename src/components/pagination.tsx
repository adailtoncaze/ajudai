"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { ITENS_POR_PAGINA, numerosVisiveis } from "@/lib/pagination";

type PropsBase = {
  pagina: number;
  totalItens: number;
  rotulo: string;
  porPagina?: number;
};

type Props =
  | (PropsBase & { hrefBase: string; onPaginaChange?: never })
  | (PropsBase & { onPaginaChange: (pagina: number) => void; hrefBase?: never });

type BotaoProps = {
  destino: number;
  rotuloAria: string;
  children: ReactNode;
  desabilitado?: boolean;
  selecionado?: boolean;
  hrefBase?: string;
  onPaginaChange?: (pagina: number) => void;
};

function Botao({
  destino,
  rotuloAria,
  children,
  desabilitado = false,
  selecionado = false,
  hrefBase,
  onPaginaChange,
}: BotaoProps) {
  const classes = `ui-btn ui-btn-ghost min-h-11 min-w-11 border-0 px-2 ${
    selecionado ? "ui-pagination-atual" : ""
  }`;
  const ariaCurrent = selecionado ? ("page" as const) : undefined;

  if (desabilitado) {
    return (
      <button type="button" className={classes} disabled aria-label={rotuloAria}>
        {children}
      </button>
    );
  }

  if (hrefBase) {
    return (
      <Link
        href={`${hrefBase}?pagina=${destino}`}
        className={classes}
        aria-label={rotuloAria}
        aria-current={ariaCurrent}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      aria-label={rotuloAria}
      aria-current={ariaCurrent}
      onClick={() => onPaginaChange?.(destino)}
    >
      {children}
    </button>
  );
}

/**
 * Paginação reutilizável das listagens do painel.
 * Use `hrefBase` para navegação por URL (conteúdo vindo do servidor) ou
 * `onPaginaChange` para listagens com estado próprio no cliente.
 */
export function Pagination({
  pagina,
  totalItens,
  rotulo,
  porPagina = ITENS_POR_PAGINA,
  hrefBase,
  onPaginaChange,
}: Props) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / porPagina));
  const atual = Math.min(Math.max(pagina, 1), totalPaginas);
  const primeiro = totalItens === 0 ? 0 : (atual - 1) * porPagina + 1;
  const ultimo = Math.min(atual * porPagina, totalItens);

  return (
    <nav aria-label={`Paginação de ${rotulo}`} className="ui-pagination">
      <p className="ui-caption" aria-live="polite">
        {totalItens === 0
          ? `Nenhum registro de ${rotulo}.`
          : `Mostrando ${primeiro}–${ultimo} de ${totalItens} ${rotulo}`}
      </p>
      <div className="ui-pagination-paginas">
        <Botao
          destino={atual - 1}
          desabilitado={atual === 1}
          rotuloAria="Página anterior"
          hrefBase={hrefBase}
          onPaginaChange={onPaginaChange}
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </Botao>

        {numerosVisiveis(atual, totalPaginas).map((numero, indice) =>
          numero === "…" ? (
            <span key={`reticencias-${indice}`} aria-hidden="true" className="px-1 text-ink-500">
              …
            </span>
          ) : (
            <Botao
              key={numero}
              destino={numero}
              selecionado={numero === atual}
              rotuloAria={`Página ${numero}`}
              hrefBase={hrefBase}
              onPaginaChange={onPaginaChange}
            >
              {numero}
            </Botao>
          )
        )}

        <Botao
          destino={atual + 1}
          desabilitado={atual === totalPaginas}
          rotuloAria="Próxima página"
          hrefBase={hrefBase}
          onPaginaChange={onPaginaChange}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </Botao>
      </div>
    </nav>
  );
}
