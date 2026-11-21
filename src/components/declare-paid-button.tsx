"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  token: string;
  className?: string;
};

export function DeclarePaidButton({ token, className }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [conflitos, setConflitos] = useState<number | null>(null);

  async function declararPago() {
    if (enviando) return;
    setErro("");
    setConflitos(null);
    setEnviando(true);
    try {
      const resposta = await fetch(
        `/api/reservations/${encodeURIComponent(token)}/declare-paid`,
        { method: "POST" }
      );

      if (!resposta.ok) {
        const corpo: unknown = await resposta.json().catch(() => null);
        const codigo =
          corpo && typeof corpo === "object" && "error" in corpo
            ? (corpo as { error?: unknown }).error
            : null;
        if (codigo === "reservation_released") {
          setErro("Esta reserva foi cancelada pelo organizador.");
          return;
        }
        setErro("Não foi possível confirmar agora. Tente novamente em instantes.");
        return;
      }

      const corpo: unknown = await resposta.json().catch(() => null);
      const qtd =
        corpo && typeof corpo === "object" && "conflicts" in corpo
          ? (corpo as { conflicts?: unknown }).conflicts
          : 0;
      const conflitosQtd = typeof qtd === "number" && Number.isFinite(qtd) ? qtd : 0;
      if (conflitosQtd > 0) {
        setConflitos(conflitosQtd);
        setTimeout(() => router.refresh(), 3500);
        return;
      }

      router.refresh();
    } catch {
      setErro("Não foi possível confirmar agora. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={className}>
      {erro && (
        <p className="ui-error mb-2" role="alert" aria-live="polite">
          {erro}
        </p>
      )}
      {conflitos !== null && conflitos > 0 && (
        <p className="ui-notice-error mb-3 text-sm" role="alert">
          Alguns números desta reserva já foram reservados por outra pessoa. O organizador entrará em
          contato.
        </p>
      )}
      <button
        type="button"
        onClick={declararPago}
        disabled={enviando}
        className="ui-btn ui-btn-primary w-full sm:w-auto"
      >
        {enviando ? "Confirmando..." : "Já paguei"}
      </button>
    </div>
  );
}
