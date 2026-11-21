"use client";

import { BadgeCheck, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { brl } from "@/lib/format";

export type TakenNumber = {
  number: number;
  status: "reserved" | "paid";
};

type Props = {
  slug: string;
  total: number;
  taken: TakenNumber[];
  priceCents: number;
  disabled?: boolean;
  onSelectionChange?: (numbers: number[]) => void;
  /** Ao mudar, força uma consulta imediata à grade (ex.: conflito 409). */
  refreshSignal?: number;
};

/** Listras diagonais usadas no estado "reservado" (além da cor e da borda). */
const listras = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-line-soft) 6px 8px)",
};

function numeroFormatado(numero: number, total: number) {
  return String(numero).padStart(String(total).length, "0");
}

function classesDoNumero(status: TakenNumber["status"] | undefined, bloqueado: boolean) {
  if (status === "paid") return "border-success-700 bg-success-700 text-white";
  if (status === "reserved") return "border-dashed border-line bg-surface-muted text-ink-500";
  if (bloqueado) return "border-line bg-surface-muted text-ink-500";
  return "border-line bg-surface text-ink-700 hover:border-brand-600 hover:bg-brand-50 active:border-brand-700 active:bg-brand-100";
}

function Amostra({
  className,
  children,
  style,
}: {
  className: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold ${className}`}
    >
      {children}
    </span>
  );
}

export function NumberGrid({
  slug,
  total,
  taken,
  priceCents,
  disabled = false,
  onSelectionChange,
  refreshSignal = 0,
}: Props) {
  const [numerosTomados, setNumerosTomados] = useState<TakenNumber[]>(taken);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const requisicaoAtual = useRef(0);
  const gradeRef = useRef<HTMLDivElement>(null);

  const mapaTomados = useMemo(
    () => new Map(numerosTomados.map((item) => [item.number, item.status])),
    [numerosTomados]
  );
  const mapaAtual = useRef(mapaTomados);

  useEffect(() => {
    mapaAtual.current = mapaTomados;
  }, [mapaTomados]);

  // O checkbox nativo já foi marcado no DOM mesmo se o toque ocorreu antes da
  // hidratação (grade vem por streaming). Trazemos essa seleção para o React.
  useEffect(() => {
    const grade = gradeRef.current;
    if (!grade) return;
    const marcados = Array.from(grade.querySelectorAll<HTMLInputElement>("input:checked"))
      .map((input) => Number(input.dataset.numero))
      .filter(
        (numero) =>
          Number.isInteger(numero) &&
          numero >= 1 &&
          numero <= total &&
          !mapaAtual.current.has(numero)
      );
    if (marcados.length > 0) {
      setSelecionados((anteriores) =>
        Array.from(new Set([...anteriores, ...marcados])).sort((a, b) => a - b)
      );
    }
  }, [total]);

  useEffect(() => {
    onSelectionChange?.(selecionados);
  }, [selecionados, onSelectionChange]);

  useEffect(() => {
    let ativo = true;
    let controle: AbortController | null = null;

    async function atualizar() {
      // Em redes lentas, uma resposta antiga não pode apagar um toque recente.
      const id = ++requisicaoAtual.current;
      controle?.abort();
      controle = new AbortController();

      try {
        const resposta = await fetch(`/api/raffles/${encodeURIComponent(slug)}/numbers`, {
          cache: "no-store",
          signal: controle.signal,
        });
        if (!resposta.ok || !ativo || id !== requisicaoAtual.current) return;

        const dados: unknown = await resposta.json();
        if (!ativo || id !== requisicaoAtual.current || !dados || typeof dados !== "object") return;

        const itens = (dados as { taken?: unknown }).taken;
        if (!Array.isArray(itens)) return;

        const proximos: TakenNumber[] = [];
        for (const item of itens) {
          if (!item || typeof item !== "object") continue;
          const numero = (item as { number?: unknown }).number;
          const status = (item as { status?: unknown }).status;
          if (typeof numero !== "number" || !Number.isInteger(numero)) continue;
          if (status !== "reserved" && status !== "paid") continue;
          proximos.push({ number: numero, status });
        }

        const ocupadosAgora = new Set(proximos.map((item) => item.number));
        const ocupadosAntes = mapaAtual.current;
        const recemOcupados = [...ocupadosAgora].filter((numero) => !ocupadosAntes.has(numero));

        // Só desmarca números que ficaram ocupados desde a consulta anterior.
        if (recemOcupados.length > 0) {
          setSelecionados((anteriores) =>
            anteriores.filter((numero) => !recemOcupados.includes(numero))
          );
          for (const numero of recemOcupados) {
            const input = gradeRef.current?.querySelector<HTMLInputElement>(
              `input[data-numero="${numero}"]`
            );
            if (input) input.checked = false;
          }
        }

        // Evita re-renderizar centenas de botões quando nada mudou.
        const semAlteracao =
          ocupadosAgora.size === ocupadosAntes.size &&
          proximos.every((item) => ocupadosAntes.get(item.number) === item.status);
        if (!semAlteracao) setNumerosTomados(proximos);
      } catch {
        // Uma falha de rede não deve travar a página: a grade tenta de novo.
      }
    }

    const intervalo = setInterval(() => {
      if (!document.hidden) void atualizar();
    }, 15_000);
    const aoVoltarParaAba = () => {
      if (!document.hidden) void atualizar();
    };

    document.addEventListener("visibilitychange", aoVoltarParaAba);
    void atualizar();

    return () => {
      ativo = false;
      clearInterval(intervalo);
      controle?.abort();
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, [slug, refreshSignal]);

  function alternar(numero: number) {
    if (disabled || mapaTomados.has(numero)) return;
    setSelecionados((anteriores) =>
      anteriores.includes(numero)
        ? anteriores.filter((item) => item !== numero)
        : [...anteriores, numero].sort((a, b) => a - b)
    );
  }

  return (
    <div className="space-y-5">
      <div className="ui-caption flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold">
        <span className="font-extrabold text-ink-900">Legenda:</span>

        <span className="inline-flex items-center gap-2">
          <Amostra className="border-line bg-surface text-ink-700" />
          Livre
        </span>
        <span className="inline-flex items-center gap-2">
          <Amostra className="border-brand-700 bg-brand-700 text-white">
            <Check size={14} strokeWidth={3} />
          </Amostra>
          Selecionado
        </span>
        <span className="inline-flex items-center gap-2">
          <Amostra className="border-dashed border-line bg-surface-muted text-ink-500" style={listras} />
          Reservado
        </span>
        <span className="inline-flex items-center gap-2">
          <Amostra className="border-success-700 bg-success-700 text-white">
            <BadgeCheck size={14} strokeWidth={2.5} />
          </Amostra>
          Pago
        </span>
      </div>

      <div
        ref={gradeRef}
        role="group"
        aria-label="Números da rifa"
        className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-10"
      >
        {Array.from({ length: total }, (_, indice) => indice + 1).map((numero) => {
          const status = mapaTomados.get(numero);
          const selecionado = !status && !disabled && selecionados.includes(numero);
          const indisponivel = disabled || Boolean(status);
          const rotulo =
            status === "paid"
              ? "pago"
              : status === "reserved"
                ? "reservado"
                : disabled
                  ? "indisponível"
                  : selecionado
                    ? "selecionado"
                    : "livre";

          return (
            <label key={numero} className="block cursor-pointer">
              <input
                type="checkbox"
                data-numero={numero}
                checked={selecionado}
                onChange={() => alternar(numero)}
                disabled={indisponivel}
                aria-label={`Número ${numeroFormatado(numero, total)}, ${rotulo}`}
                className="peer sr-only focus-visible:outline-none"
              />
              <span
                style={status === "reserved" ? listras : undefined}
                className={`flex min-h-12 w-full touch-manipulation select-none items-center justify-center gap-0.5 rounded-xl border px-1 font-mono text-base font-extrabold tabular-nums transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-600 peer-disabled:cursor-not-allowed peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white ${classesDoNumero(status, disabled)}`}
              >
                {numeroFormatado(numero, total)}
                <Check
                  aria-hidden="true"
                  size={15}
                  strokeWidth={3}
                  className="hidden peer-checked:block"
                />
                {status === "paid" && <BadgeCheck aria-hidden="true" size={15} strokeWidth={2.5} />}
              </span>
            </label>
          );
        })}
      </div>

      <p className="ui-hint">Cada número custa {brl(priceCents)}. Toque para selecionar ou remover.</p>
    </div>
  );
}
