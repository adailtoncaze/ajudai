"use client";

import Image from "next/image";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  token: string;
  qrDataUrl: string;
  payload: string;
  amountLabel: string;
};

export function PixPayment({ token, qrDataUrl, payload, amountLabel }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [conflitos, setConflitos] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = payload;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  }

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
        // Dá tempo de ler o aviso antes de atualizar para o estado declarado.
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
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4">
        <Image
          src={qrDataUrl}
          alt={`QR Code Pix no valor de ${amountLabel}`}
          width={320}
          height={320}
          unoptimized
          className="rounded-2xl border border-line-soft bg-white p-2"
        />
        <div className="w-full">
          <label htmlFor="pix-copia-cola" className="ui-label">
            Pix copia e cola
          </label>
          <textarea
            id="pix-copia-cola"
            readOnly
            value={payload}
            rows={4}
            className="ui-input mt-1 font-mono text-sm leading-relaxed"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copiar} className="ui-btn ui-btn-secondary">
              {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
              {copied ? "Copiado!" : "Copiar código Pix"}
            </button>
            <span className="text-base font-semibold text-success-700" aria-live="polite">
              {copied ? "Código Pix copiado!" : ""}
            </span>
          </div>
        </div>
      </div>

      {erro && (
        <p className="ui-error" role="alert" aria-live="polite">
          {erro}
        </p>
      )}

      {conflitos !== null && conflitos > 0 && (
        <p className="ui-notice-error" role="alert">
          Alguns números desta reserva já foram reservados por outra pessoa. O organizador entrará em
          contato.
        </p>
      )}

      <button
        type="button"
        onClick={declararPago}
        disabled={enviando}
        className="ui-btn ui-btn-primary w-full"
      >
        {enviando ? "Confirmando..." : "Já paguei"}
      </button>
    </div>
  );
}
