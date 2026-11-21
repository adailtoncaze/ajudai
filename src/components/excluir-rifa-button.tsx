"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { excluirRifa } from "@/app/painel/actions";

type Props = {
  id: string;
  titulo: string;
  variante?: "ghost" | "danger";
};

export function ExcluirRifaButton({ id, titulo, variante = "ghost" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tituloId = `titulo-excluir-${id}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={variante === "danger" ? "ui-btn ui-btn-danger" : "ui-btn ui-btn-ghost-danger"}
      >
        <Trash2 aria-hidden="true" size={17} />
        Excluir
      </button>

      <dialog ref={dialogRef} aria-labelledby={tituloId} className="ui-dialog">
        <h2 id={tituloId} className="text-xl font-extrabold tracking-tight text-ink-900">
          Excluir rifa?
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Você está prestes a excluir <strong>{titulo}</strong>. A rifa e a imagem serão removidas
          permanentemente.
        </p>
        <p className="ui-hint mt-2">Só é possível excluir rifas que ainda não têm reservas.</p>

        <form action={excluirRifa} className="mt-6 flex flex-wrap justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="ui-btn ui-btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" className="ui-btn ui-btn-danger">
            Excluir rifa
          </button>
        </form>
      </dialog>
    </>
  );
}
