import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ExcluirRifaButton } from "@/components/excluir-rifa-button";
import { Logo } from "@/components/logo";
import { Pagination } from "@/components/pagination";
import { brl } from "@/lib/format";
import { ITENS_POR_PAGINA } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { publicRaffleUrl } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Painel do organizador",
};

const statusLabels: Record<string, string> = {
  open: "Aberta",
  closed: "Encerrada",
  drawn: "Sorteada",
};

const statusClasses: Record<string, string> = {
  open: "ui-badge-success",
  closed: "ui-badge-warning",
  drawn: "ui-badge-brand",
};

type PainelSearchParams = {
  saved?: string;
  slug?: string;
  erro?: string;
  pagina?: string;
};

type ReservaResumo = {
  status: string;
  total_cents: number;
  reservation_numbers: { active: boolean }[] | null;
};

type RifaResumo = {
  id: string;
  slug: string;
  title: string;
  status: string;
  total_numbers: number;
  reservations: ReservaResumo[] | null;
};

export default function PainelPage({
  searchParams,
}: {
  searchParams: Promise<PainelSearchParams>;
}) {
  return (
    <main className="ui-container flex-1 py-10 sm:py-14">
      <div className="space-y-7">
        <Suspense fallback={null}>
          <PainelFlash searchParams={searchParams} />
        </Suspense>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="ui-eyebrow">Área do organizador</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              Minhas rifas
            </h1>
            <p className="ui-caption">Acompanhe suas rifas e confirme pagamentos.</p>
          </div>
          <Link href="/painel/rifas/nova" className="ui-btn ui-btn-primary">
            <Plus aria-hidden="true" size={18} />
            Nova rifa
          </Link>
        </header>

        <Suspense fallback={<p className="text-ink-600">Carregando rifas...</p>}>
          <ListaRifas searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function PainelFlash({
  searchParams,
}: {
  searchParams: Promise<PainelSearchParams>;
}) {
  const { saved, slug, erro } = await searchParams;

  if (erro === "reservas") {
    return (
      <div role="alert" className="ui-notice-error">
        <p className="font-extrabold">Não foi possível excluir a rifa.</p>
        <p className="mt-1">Ela já tem reservas e precisa ser mantida no histórico.</p>
      </div>
    );
  }

  if (erro === "exclusao") {
    return (
      <div role="alert" className="ui-notice-error">
        Não foi possível excluir a rifa. Tente novamente em instantes.
      </div>
    );
  }

  if (saved === "delete") {
    return (
      <div role="status" className="ui-notice-success">
        Rifa excluída com sucesso.
      </div>
    );
  }

  if (saved !== "create" && saved !== "edit") return null;

  const titulo = saved === "create" ? "Rifa criada com sucesso!" : "Alterações salvas.";
  const slugValido =
    typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;

  return (
    <div
      role="status"
      className="ui-notice-success flex flex-wrap items-center justify-between gap-3"
    >
      <p className="font-extrabold">{titulo}</p>
      {slugValido && (
        <Link href={`/r/${slugValido}`} className="ui-link">
          Ver rifa pública
        </Link>
      )}
    </div>
  );
}

async function ListaRifas({ searchParams }: { searchParams: Promise<PainelSearchParams> }) {
  const { pagina: paginaParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { count, error: erroContagem } = await supabase
    .from("raffles")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (erroContagem) {
    console.error("[painel] falha ao contar rifas", erroContagem);
    return (
      <p className="ui-error rounded-2xl bg-danger-50 p-4" role="alert">
        Não foi possível carregar suas rifas. Tente novamente mais tarde.
      </p>
    );
  }

  const total = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const solicitada = Number.parseInt(paginaParam ?? "", 10);
  const pagina = Math.min(
    totalPaginas,
    Math.max(1, Number.isInteger(solicitada) && solicitada > 0 ? solicitada : 1)
  );
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;

  const { data, error } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, status, total_numbers, reservations(status, total_cents, reservation_numbers(active))"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .range(inicio, inicio + ITENS_POR_PAGINA - 1);

  if (error) {
    console.error("[painel] falha ao listar rifas", error);
    return (
      <p className="ui-error rounded-2xl bg-danger-50 p-4" role="alert">
        Não foi possível carregar suas rifas. Tente novamente mais tarde.
      </p>
    );
  }

  const rifas = (data ?? []) as unknown as RifaResumo[];

  if (total === 0) {
    return (
      <div className="ui-empty">
        <Logo size={48} className="mx-auto" />
        <h2 className="mt-4 text-lg font-extrabold text-ink-900">Você ainda não tem rifas</h2>
        <p className="ui-caption mt-2">
          Crie a primeira para começar a vender números.
        </p>
        <Link href="/painel/rifas/nova" className="ui-btn ui-btn-primary mt-5">
          Criar minha primeira rifa
        </Link>
      </div>
    );
  }

  return (
    <>
      {rifas.length > 0 ? (
        <ul className="ui-rifa-list">
          {rifas.map((rifa, indice) => {
            const reservas = rifa.reservations ?? [];
            const confirmadas = reservas.filter((reserva) => reserva.status === "confirmed");
            const pagos = confirmadas.reduce(
              (total, reserva) =>
                total +
                (reserva.reservation_numbers ?? []).filter((numero) => numero.active).length,
              0
            );
            const arrecadado = confirmadas.reduce((total, reserva) => total + reserva.total_cents, 0);
            const progresso =
              rifa.total_numbers > 0
                ? Math.min(100, Math.round((pagos / rifa.total_numbers) * 100))
                : 0;

            return (
              <li key={rifa.id} className="ui-rifa-row">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="ui-rifa-mark" aria-hidden="true">
                    {String(inicio + indice + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-extrabold tracking-tight text-ink-900">
                        {rifa.title}
                      </h2>
                      <span className={`ui-badge ${statusClasses[rifa.status] ?? "ui-badge-brand"}`}>
                        {statusLabels[rifa.status] ?? rifa.status}
                      </span>
                    </div>
                    <p className="ui-caption mt-1 break-all">/r/{rifa.slug}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-accent-500"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-accent-700">
                        {progresso}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pl-[4.25rem] lg:pl-0">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-ink-600">Pagos</p>
                    <p className="mt-0.5 text-xl font-extrabold text-ink-900">
                      {pagos}
                      <span className="text-base font-semibold text-ink-500">/{rifa.total_numbers}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                      Arrecadação
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold text-ink-900">{brl(arrecadado)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-[4.25rem] lg:pl-0">
                  <Link href={`/painel/rifas/${rifa.id}`} className="ui-btn ui-btn-primary">
                    Reservas
                  </Link>
                  <Link
                    href={`/r/${rifa.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ui-btn ui-btn-secondary"
                  >
                    Abrir rifa
                    <ArrowUpRight aria-hidden="true" size={17} />
                  </Link>
                  <CopyLinkButton url={publicRaffleUrl(rifa.slug)} />
                  <Link
                    href={`/painel/rifas/${rifa.id}/editar`}
                    className="ui-btn ui-btn-ghost"
                  >
                    Editar
                  </Link>
                  {reservas.length === 0 && (
                    <ExcluirRifaButton id={rifa.id} titulo={rifa.title} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ui-hint border-t border-line-soft pt-4">Nenhuma rifa nesta página.</p>
      )}

      <Pagination pagina={pagina} totalItens={total} rotulo="rifas" hrefBase="/painel" />
    </>
  );
}
