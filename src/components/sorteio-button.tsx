"use client";

import { useRef, useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { sortearRifa, type SorteioActionState } from "@/app/painel/actions";

type Modo = "aleatorio" | "manual";
type Etapa = "opcoes" | "confirmacao" | "resultado";

type Props = {
  raffleId: string;
  raffleSlug: string;
  totalNumbers: number;
  status: "open" | "closed" | "drawn";
};

export function SorteioButton({ raffleId, raffleSlug, totalNumbers, status }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [modo, setModo] = useState<Modo>("aleatorio");
  const [numero, setNumero] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("opcoes");
  const [resultado, setResultado] = useState<SorteioActionState | null>(null);
  const [pending, startTransition] = useTransition();
  const tituloId = `titulo-sorteio-${raffleId}`;
  const jaSorteada = status === "drawn";
  const erroNoNumero = resultado?.status === "error" && etapa === "opcoes" && modo === "manual";

  function abrir() {
    setModo("aleatorio");
    setNumero("");
    setEtapa("opcoes");
    setResultado(null);
    dialogRef.current?.showModal();
  }

  function avancar() {
    setResultado(null);
    if (modo === "manual") {
      const informado = Number(numero);
      if (!Number.isInteger(informado) || informado < 1 || informado > totalNumbers) {
        setResultado({
          status: "error",
          message: `Informe um número entre 1 e ${totalNumbers}.`,
        });
        return;
      }
    }
    setEtapa("confirmacao");
  }

  function confirmar() {
    startTransition(async () => {
      const res = await sortearRifa(raffleId, raffleSlug, modo === "manual" ? Number(numero) : null);
      setResultado(res);
      if (res.status === "success") setEtapa("resultado");
    });
  }

  return (
    <>
      <button
        type="button"
        className="ui-btn ui-btn-primary"
        onClick={abrir}
        disabled={jaSorteada}
        title={jaSorteada ? "Esta rifa já foi sorteada." : undefined}
      >
        <Trophy aria-hidden="true" size={17} />
        Sorteio
      </button>

      <dialog ref={dialogRef} aria-labelledby={tituloId} className="ui-dialog">
        <h2 id={tituloId} className="text-xl font-extrabold tracking-tight text-ink-900">
          Sorteio
        </h2>

        {etapa === "opcoes" && (
          <fieldset className="mt-4 space-y-3">
            <legend className="ui-label">Como escolher o vencedor?</legend>

            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input
                type="radio"
                name="modo-sorteio"
                value="aleatorio"
                checked={modo === "aleatorio"}
                onChange={() => setModo("aleatorio")}
                className="mt-1 h-5 w-5 accent-brand-700"
              />
              <span>Sortear entre números pagos</span>
            </label>

            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input
                type="radio"
                name="modo-sorteio"
                value="manual"
                checked={modo === "manual"}
                onChange={() => setModo("manual")}
                className="mt-1 h-5 w-5 accent-brand-700"
              />
              <span>Informar o número vencedor</span>
            </label>

            {modo === "manual" && (
              <div className="pl-8">
                <label htmlFor="numero-vencedor" className="ui-label">
                  Número vencedor
                </label>
                <input
                  id="numero-vencedor"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={totalNumbers}
                  value={numero}
                  onChange={(event) => setNumero(event.target.value)}
                  aria-invalid={erroNoNumero}
                  aria-describedby={`numero-vencedor-hint${erroNoNumero ? " sorteio-erro" : ""}`}
                  className="ui-input"
                />
                <p id="numero-vencedor-hint" className="ui-hint">
                  Informe um número entre 1 e {totalNumbers}.
                </p>
              </div>
            )}
          </fieldset>
        )}

        {etapa === "confirmacao" && (
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            {modo === "aleatorio" ? (
              <>Confirma o sorteio entre os números com pagamento confirmado?</>
            ) : (
              <>
                Confirma o número vencedor <strong className="text-ink-900">{numero}</strong>?
              </>
            )}
            <span className="mt-2 block">
              Depois do sorteio, a rifa fica encerrada para novas reservas e não pode ser sorteada
              novamente.
            </span>
          </p>
        )}

        {etapa === "resultado" && resultado?.winner && (
          <div role="status" className="ui-notice-success mt-4">
            <p className="text-lg font-extrabold">Número {resultado.winner.number}</p>
            {resultado.winner.name ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div>
                  <dt className="inline font-bold">Vencedor:</dt>{" "}
                  <dd className="inline">{resultado.winner.name}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">Telefone:</dt>{" "}
                  <dd className="inline">{resultado.winner.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">Código da reserva:</dt>{" "}
                  <dd className="inline">{resultado.winner.code || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-1 text-sm">
                Número {resultado.winner.number} — sem comprador confirmado.
              </p>
            )}
          </div>
        )}

        <div aria-live="polite" className="mt-4">
          {resultado?.status === "error" && (
            <p id="sorteio-erro" role="alert" className="ui-notice-error">
              {resultado.message}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {etapa === "opcoes" && (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Cancelar
              </button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={avancar}>
                Continuar
              </button>
            </>
          )}

          {etapa === "confirmacao" && (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => setEtapa("opcoes")}
                disabled={pending}
              >
                Voltar
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={confirmar}
                disabled={pending}
              >
                {pending ? "Sorteando..." : "Confirmar sorteio"}
              </button>
            </>
          )}

          {etapa === "resultado" && (
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => dialogRef.current?.close()}
            >
              Fechar
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
