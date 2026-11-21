"use client";

import { useCallback, useEffect, useState } from "react";
import { BuyerForm } from "@/components/buyer-form";
import { NumberGrid, type TakenNumber } from "@/components/number-grid";
import { SelectionBar } from "@/components/selection-bar";

type Props = {
  slug: string;
  total: number;
  taken: TakenNumber[];
  priceCents: number;
  disabled: boolean;
};

type JanelaComContinuar = Window & { __rifaContinuar?: boolean };

/** Liga seleção, barra fixa e formulário de compra na página pública. */
export function ReservationFlow({ slug, total, taken, priceCents, disabled }: Props) {
  const [selection, setSelection] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const continuar = useCallback(() => {
    // Lê os checkboxes marcados no DOM: cobre o toque feito antes da hidratação.
    const marcados = Array.from(document.querySelectorAll<HTMLInputElement>("input:checked"))
      .map((input) => Number(input.dataset.numero))
      .filter((numero) => Number.isInteger(numero));
    if (marcados.length > 0) {
      setSelection(Array.from(new Set(marcados)).sort((a, b) => a - b));
    }
    setFormOpen(true);
  }, []);

  // O script inline registra o "Continuar" tocado antes da hidratação.
  // Usa uma variável global (não um atributo do <html>) para não causar
  // divergência de hidratação.
  useEffect(() => {
    const janela = window as JanelaComContinuar;
    if (janela.__rifaContinuar !== true) return;
    janela.__rifaContinuar = false;
    queueMicrotask(() => continuar());
  }, [continuar]);

  return (
    <div className="ui-selecao">
      <NumberGrid
        slug={slug}
        total={total}
        taken={taken}
        priceCents={priceCents}
        disabled={disabled}
        onSelectionChange={setSelection}
        refreshSignal={refreshSignal}
      />

      <SelectionBar
        count={disabled ? 0 : selection.length}
        totalCents={selection.length * priceCents}
        onContinue={continuar}
      />

      <BuyerForm
        slug={slug}
        numbers={selection}
        priceCents={priceCents}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onNumberTaken={() => setRefreshSignal((valor) => valor + 1)}
      />
    </div>
  );
}
