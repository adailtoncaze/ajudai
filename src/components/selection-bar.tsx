"use client";

import { brl } from "@/lib/format";

type Props = {
  count: number;
  totalCents: number;
  onContinue: () => void;
};

/**
 * A visibilidade é feita por CSS (`:has(input:checked)`) para aparecer no
 * instante do toque, mesmo antes da hidratação. O script inline da página
 * preenche o valor nesse intervalo; o React reassume o controle depois.
 */
export function SelectionBar({ count, totalCents, onContinue }: Props) {
  const detalhe = `${count} ${count === 1 ? "número" : "números"} · ${brl(totalCents)}`;

  return (
    <div
      className="ui-selecao-bar fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-surface shadow-lift"
      data-pronta={count > 0}
      suppressHydrationWarning
    >
      <div className="ui-container flex flex-wrap items-center justify-between gap-3 py-3">
        <p
          className="text-base font-extrabold text-ink-900"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Um único nó de texto: o script inline substitui o conteúdo antes da hidratação. */}
          <span className="ui-selecao-bar-detalhe" suppressHydrationWarning>
            {detalhe}
          </span>
          <span className="ui-selecao-bar-aviso" suppressHydrationWarning>
            Números selecionados
          </span>
        </p>
        <button type="button" onClick={onContinue} className="ui-btn ui-btn-primary">
          Continuar
        </button>
      </div>
    </div>
  );
}
