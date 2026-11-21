import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { ReservationsTable } from "@/components/reservations-table";
import { SorteioButton } from "@/components/sorteio-button";
import { brl, dateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getOwnerWinner } from "@/lib/winner";

export const metadata: Metadata = {
  title: "Reservas da rifa",
};

type Props = { params: Promise<{ id: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function RifaPainelPage({ params }: Props) {
  return (
    <main className="ui-container flex-1 py-10 sm:py-14">
      <div className="space-y-7">
        <Suspense fallback={<p className="text-ink-600">Carregando rifa...</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}

type ReservaLinha = {
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
  reservation_numbers: { number: number; active: boolean }[] | null;
};

async function Conteudo({ params }: Props) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, slug, title, status, total_numbers, winner_number, drawn_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!raffle) notFound();

  await supabase.rpc("expire_stale_reservations", { p_raffle_id: raffle.id });

  const { data: reservasData, error } = await supabase
    .from("reservations")
    .select("*, reservation_numbers(number, active)")
    .eq("raffle_id", raffle.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[painel/rifa] falha ao carregar reservas", error);
    return (
      <p className="ui-error rounded-2xl bg-danger-50 p-4" role="alert">
        Não foi possível carregar as reservas. Tente novamente mais tarde.
      </p>
    );
  }

  const reservas = ((reservasData ?? []) as unknown as ReservaLinha[]).map((r) => ({
    ...r,
    reservation_numbers: (r.reservation_numbers ?? []).sort((a, b) => a.number - b.number),
  }));

  let numerosPagos = 0;
  let numerosReservados = 0;
  let arrecadacaoConfirmada = 0;
  let aConferir = 0;

  for (const r of reservas) {
    const ativos = (r.reservation_numbers ?? []).filter((n) => n.active).length;
    if (r.status === "confirmed") {
      numerosPagos += ativos;
      arrecadacaoConfirmada += r.total_cents;
    } else if (r.status === "pending" || r.status === "declared_paid") {
      numerosReservados += ativos;
      if (r.status === "declared_paid") aConferir += r.total_cents;
    }
  }

  const livres = Math.max(0, raffle.total_numbers - numerosPagos - numerosReservados);

  const vencedor =
    raffle.status === "drawn" && raffle.winner_number !== null
      ? await getOwnerWinner(supabase, raffle.id, raffle.winner_number)
      : null;

  return (
    <>
      <header className="space-y-4">
        <div>
          <Link href="/painel" className="ui-link inline-flex items-center gap-2">
            <ArrowLeft aria-hidden="true" size={16} />
            Voltar ao painel
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="ui-eyebrow">Rifa</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              {raffle.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SorteioButton
              raffleId={raffle.id}
              raffleSlug={raffle.slug}
              totalNumbers={raffle.total_numbers}
              status={raffle.status}
            />
            <span className={`ui-badge ${badgeClasse(raffle.status)}`}>
              {statusRifa(raffle.status)}
            </span>
          </div>
        </div>
      </header>

      {vencedor && (
        <section aria-labelledby="vencedor-rifa" className="space-y-3">
          <h2 id="vencedor-rifa" className="text-xl font-extrabold text-ink-900">
            Resultado do sorteio
          </h2>
          <div className="ui-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="ui-rifa-mark" aria-hidden="true">
                <Trophy size={20} />
              </span>
              <p className="text-2xl font-extrabold tracking-tight text-ink-900">
                Número {vencedor.number}
              </p>
            </div>

            {vencedor.name ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <DadoVencedor rotulo="Vencedor" valor={vencedor.name} />
                <DadoVencedor rotulo="Telefone" valor={vencedor.phone || "—"} />
                <DadoVencedor rotulo="Código da reserva" valor={vencedor.code || "—"} />
              </dl>
            ) : (
              <p className="ui-caption mt-3">
                Número {vencedor.number} — sem comprador confirmado.
              </p>
            )}

            {raffle.drawn_at && (
              <p className="ui-caption mt-4">Sorteado em {dateTime(raffle.drawn_at)}</p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="resumo-rifa" className="space-y-3">
        <h2 id="resumo-rifa" className="text-xl font-extrabold text-ink-900">
          Resumo
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ResumoItem rotulo="Números pagos" valor={String(numerosPagos)} />
          <ResumoItem rotulo="Reservados" valor={String(numerosReservados)} />
          <ResumoItem rotulo="Livres" valor={String(livres)} />
          <ResumoItem rotulo="Arrecadação confirmada" valor={brl(arrecadacaoConfirmada)} />
          <ResumoItem rotulo="A conferir" valor={brl(aConferir)} destaque />
        </dl>
      </section>

      <section aria-labelledby="reservas-rifa" className="space-y-4">
        <h2 id="reservas-rifa" className="text-xl font-extrabold text-ink-900">
          Reservas
        </h2>
        <ReservationsTable
          raffleId={raffle.id}
          raffleSlug={raffle.slug}
          reservations={reservas}
        />
      </section>
    </>
  );
}

function ResumoItem({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`ui-card p-4 ${destaque ? "border-brand-200 bg-brand-50" : ""}`}>
      <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">{rotulo}</dt>
      <dd className="mt-1 text-xl font-extrabold text-ink-900">{valor}</dd>
    </div>
  );
}

function DadoVencedor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">{rotulo}</dt>
      <dd className="mt-1 break-words text-base font-bold text-ink-900">{valor}</dd>
    </div>
  );
}

function statusRifa(status: string) {
  if (status === "open") return "Aberta";
  if (status === "closed") return "Encerrada";
  if (status === "drawn") return "Sorteada";
  return status;
}

function badgeClasse(status: string) {
  if (status === "open") return "ui-badge-success";
  if (status === "closed") return "ui-badge-warning";
  if (status === "drawn") return "ui-badge-brand";
  return "ui-badge-brand";
}
