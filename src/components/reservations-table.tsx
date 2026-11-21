"use client";

import { useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import {
  confirmarReserva,
  confirmarReservasEmLote,
  liberarReserva,
  type ConfirmarLoteState,
  type ReservaActionState,
} from "@/app/painel/actions";
import { Pagination } from "@/components/pagination";
import { brl, dateTime } from "@/lib/format";
import { ITENS_POR_PAGINA } from "@/lib/pagination";

type ReservationNumber = { number: number; active: boolean };

export type ReservationRow = {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  total_cents: number;
  status: "pending" | "declared_paid" | "confirmed" | "released" | "expired";
  expires_at: string;
  declared_paid_at: string | null;
  confirmed_at: string | null;
  released_at: string | null;
  created_at: string;
  reservation_numbers: ReservationNumber[] | null;
};

type TabKey = "declared_paid" | "pending" | "confirmed" | "closed";

const tabs: { key: TabKey; label: string }[] = [
  { key: "declared_paid", label: "Já paguei" },
  { key: "pending", label: "Aguardando pagamento" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "closed", label: "Expiradas e liberadas" },
];

function tabDe(status: ReservationRow["status"]): TabKey {
  if (status === "declared_paid") return "declared_paid";
  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  return "closed";
}

function temConflito(r: ReservationRow) {
  return r.status === "declared_paid" && (r.reservation_numbers ?? []).some((n) => !n.active);
}

function ordenarTab(key: TabKey, itens: ReservationRow[]) {
  if (key === "declared_paid") {
    return [...itens].sort((a, b) => {
      const da = a.declared_paid_at ?? a.created_at;
      const db = b.declared_paid_at ?? b.created_at;
      return da.localeCompare(db);
    });
  }
  return itens;
}

function nomeCompleto(r: ReservationRow) {
  return `${r.first_name} ${r.last_name}`.trim();
}

function dataLinha(r: ReservationRow) {
  const iso =
    r.status === "declared_paid"
      ? r.declared_paid_at ?? r.created_at
      : r.status === "confirmed"
        ? r.confirmed_at ?? r.created_at
        : r.status === "released"
          ? r.released_at ?? r.created_at
          : r.created_at;
  return iso;
}

export function ReservationsTable({
  raffleId,
  raffleSlug,
  reservations,
}: {
  raffleId: string;
  raffleSlug: string;
  reservations: ReservationRow[];
}) {
  const [tab, setTab] = useState<TabKey>("declared_paid");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const porTab = useMemo(() => {
    const grupos: Record<TabKey, ReservationRow[]> = {
      declared_paid: [],
      pending: [],
      confirmed: [],
      closed: [],
    };
    for (const r of reservations) grupos[tabDe(r.status)].push(r);
    (Object.keys(grupos) as TabKey[]).forEach((k) => {
      grupos[k] = ordenarTab(k, grupos[k]);
    });
    return grupos;
  }, [reservations]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = porTab[tab];
    if (!termo) return base;
    return base.filter((r) => {
      const nome = nomeCompleto(r).toLowerCase();
      return nome.includes(termo) || r.code.toLowerCase().includes(termo);
    });
  }, [porTab, tab, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

  function mudarPagina(destino: number) {
    setPagina(destino);
    limparSelecao();
  }

  function toggleSelecionada(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  function navegarAbas(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = tabs.findIndex((item) => item.key === tab);
    let proximo = atual;

    if (evento.key === "ArrowRight") proximo = (atual + 1) % tabs.length;
    else if (evento.key === "ArrowLeft") proximo = (atual - 1 + tabs.length) % tabs.length;
    else if (evento.key === "Home") proximo = 0;
    else if (evento.key === "End") proximo = tabs.length - 1;
    else return;

    evento.preventDefault();
    const destino = tabs[proximo];
    setTab(destino.key);
    setPagina(1);
    limparSelecao();
    requestAnimationFrame(() => document.getElementById(`tab-${destino.key}`)?.focus());
  }

  const idsConfirmaveis = new Set(
    visiveis.filter((r) => r.status !== "confirmed" && r.status !== "released").map((r) => r.id)
  );
  const selecionadasVisiveis = [...selecionadas].filter((id) => idsConfirmaveis.has(id));

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Abas de reservas"
        onKeyDown={navegarAbas}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((t) => {
          const ativa = tab === t.key;
          const qtd = porTab[t.key].length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={ativa}
              aria-controls={`painel-${t.key}`}
              tabIndex={ativa ? 0 : -1}
              onClick={() => {
                setTab(t.key);
                setPagina(1);
                limparSelecao();
              }}
              className={`ui-btn ${ativa ? "ui-btn-primary" : "ui-btn-secondary"}`}
            >
              {t.label} <span aria-label={`${qtd} reservas`}>({qtd})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label htmlFor="busca-reserva" className="ui-label">
            Buscar por nome ou código
          </label>
          <input
            id="busca-reserva"
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
              limparSelecao();
            }}
            className="ui-input"
            placeholder="Ex.: Maria ou R0001"
          />
        </div>

        {selecionadasVisiveis.length > 0 && (
          <ConfirmarLote
            ids={selecionadasVisiveis}
            raffleId={raffleId}
            raffleSlug={raffleSlug}
            onDone={(resultado) => {
              setAviso({
                tipo: resultado.status === "success" ? "success" : "error",
                texto: resultado.message ?? "",
              });
              limparSelecao();
            }}
          />
        )}
      </div>

      <div aria-live="polite">
        {aviso && (
          <p
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={aviso.tipo === "error" ? "ui-notice-error" : "ui-notice-success"}
          >
            {aviso.texto}
          </p>
        )}
      </div>

      <div
        id={`painel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="space-y-3"
      >
        {filtradas.length === 0 ? (
          <p className="ui-hint border-t border-line-soft pt-4">
            {busca.trim()
              ? "Nenhuma reserva encontrada para esta busca."
              : "Nenhuma reserva nesta aba."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visiveis.map((r) => {
              const conflito = temConflito(r);
              const podeConfirmar = r.status !== "confirmed" && r.status !== "released";
              const podeLiberar = r.status !== "released";
              const numeros = (r.reservation_numbers ?? []).map((n) => n.number).join(", ");
              return (
                <li key={r.id} className="ui-card p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      {podeConfirmar && (
                        <label className="flex min-h-11 min-w-11 items-center justify-center">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar reserva ${r.code} de ${nomeCompleto(r)}`}
                            checked={selecionadas.has(r.id)}
                            onChange={() => toggleSelecionada(r.id)}
                            className="h-5 w-5 rounded border-line accent-brand-700"
                          />
                        </label>
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-extrabold text-ink-900">
                            {r.code} · {nomeCompleto(r)}
                          </p>
                          <StatusBadge status={r.status} />
                          {conflito && <span className="ui-badge ui-badge-warning">Conflito</span>}
                        </div>
                        <p className="text-sm text-ink-600">
                          <span className="font-semibold text-ink-900">Números:</span> {numeros || "—"}
                        </p>
                        <p className="text-sm text-ink-600">
                          <span className="font-semibold text-ink-900">Valor:</span> {brl(r.total_cents)}{" "}
                          · <span className="font-semibold text-ink-900">Data:</span>{" "}
                          {dateTime(dataLinha(r))}
                        </p>
                        {r.phone && (
                          <p className="text-sm text-ink-600">
                            <span className="font-semibold text-ink-900">Telefone:</span> {r.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {podeConfirmar && (
                        <AcaoConfirmar
                          reservationId={r.id}
                          raffleId={raffleId}
                          raffleSlug={raffleSlug}
                          onResult={(res) =>
                            setAviso({
                              tipo: res.status === "success" ? "success" : "error",
                              texto: res.message ?? "",
                            })
                          }
                        />
                      )}
                      {podeLiberar && (
                        <AcaoLiberar
                          reservationId={r.id}
                          code={r.code}
                          raffleId={raffleId}
                          raffleSlug={raffleSlug}
                          onResult={(res) =>
                            setAviso({
                              tipo: res.status === "success" ? "success" : "error",
                              texto: res.message ?? "",
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filtradas.length > 0 && (
          <Pagination
            pagina={paginaAtual}
            totalItens={filtradas.length}
            rotulo="reservas"
            onPaginaChange={mudarPagina}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationRow["status"] }) {
  if (status === "confirmed") return <span className="ui-badge ui-badge-success">Confirmada</span>;
  if (status === "declared_paid") return <span className="ui-badge ui-badge-brand">Já paguei</span>;
  if (status === "pending") return <span className="ui-badge ui-badge-warning">Aguardando</span>;
  if (status === "expired") return <span className="ui-badge ui-badge-warning">Expirada</span>;
  return <span className="ui-badge bg-surface-muted text-ink-700">Liberada</span>;
}

function AcaoConfirmar({
  reservationId,
  raffleId,
  raffleSlug,
  onResult,
}: {
  reservationId: string;
  raffleId: string;
  raffleSlug: string;
  onResult: (r: ReservaActionState) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ui-btn ui-btn-primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await confirmarReserva(reservationId, raffleId, raffleSlug);
          onResult(res);
        })
      }
    >
      {pending ? "Confirmando..." : "Confirmar"}
    </button>
  );
}

function AcaoLiberar({
  reservationId,
  code,
  raffleId,
  raffleSlug,
  onResult,
}: {
  reservationId: string;
  code: string;
  raffleId: string;
  raffleSlug: string;
  onResult: (r: ReservaActionState) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const tituloId = `liberar-${reservationId}`;

  return (
    <>
      <button
        type="button"
        className="ui-btn ui-btn-secondary"
        onClick={() => dialogRef.current?.showModal()}
      >
        Liberar
      </button>
      <dialog ref={dialogRef} aria-labelledby={tituloId} className="ui-dialog">
        <h2 id={tituloId} className="text-xl font-extrabold tracking-tight text-ink-900">
          Liberar reserva?
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Tem certeza? A reserva <strong>{code}</strong> será liberada e os números voltarão a ficar
          disponíveis.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await liberarReserva(reservationId, raffleId, raffleSlug);
                dialogRef.current?.close();
                onResult(res);
              })
            }
          >
            {pending ? "Liberando..." : "Liberar"}
          </button>
        </div>
      </dialog>
    </>
  );
}

function ConfirmarLote({
  ids,
  raffleId,
  raffleSlug,
  onDone,
}: {
  ids: string[];
  raffleId: string;
  raffleSlug: string;
  onDone: (r: ConfirmarLoteState) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="ui-btn ui-btn-primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await confirmarReservasEmLote(ids, raffleId, raffleSlug);
          onDone(res);
        })
      }
    >
      {pending ? "Confirmando..." : `Confirmar selecionadas (${ids.length})`}
    </button>
  );
}
