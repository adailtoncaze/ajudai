import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import QRCode from "qrcode";
import { DeclarePaidButton } from "@/components/declare-paid-button";
import { Logo } from "@/components/logo";
import { PixPayment } from "@/components/pix-payment";
import { brl, dateTime } from "@/lib/format";
import { buildPixPayload, normalizePixKey } from "@/lib/pix";
import { getReservationForPayment } from "@/lib/raffles";

type Props = { params: Promise<{ slug: string; token: string }> };

const carregarReserva = cache(getReservationForPayment);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, token } = await params;
  const reserva = await carregarReserva(slug, token);
  if (!reserva) return { title: "Reserva não encontrada" };
  return {
    title: `Pagamento — ${reserva.raffle.title}`,
    description: `Pagamento por Pix da reserva ${reserva.code}.`,
    robots: { index: false, follow: false },
  };
}

export default function PagamentoReservaPage({ params }: Props) {
  return (
    <main className="ui-container flex-1 py-8 sm:py-12">
      <Suspense fallback={<Carregando />}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ params }: Props) {
  const { slug, token } = await params;
  const reserva = await carregarReserva(slug, token);

  if (!reserva) notFound();

  const amountLabel = brl(reserva.totalCents);
  const numerosTexto = formatarNumeros(reserva.numbers);
  const linkRifa = `/r/${encodeURIComponent(reserva.raffle.slug)}`;

  let qrDataUrl: string | null = null;
  let payload: string | null = null;
  if (reserva.status === "pending") {
    // Rifas cadastradas antes da correção podem ter a chave de telefone sem o +55.
    const chavePix = normalizePixKey(reserva.raffle.pixKey)?.key ?? reserva.raffle.pixKey;
    payload = buildPixPayload({
      key: chavePix,
      name: reserva.raffle.pixReceiverName,
      city: reserva.raffle.pixCity,
      amountCents: reserva.totalCents,
      txid: reserva.code,
    });
    qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={linkRifa}
          aria-label={`${reserva.raffle.title} — voltar para a rifa`}
          className="inline-flex min-w-0 items-center gap-3"
        >
          <Logo size={32} className="shrink-0" />
          <span className="truncate text-base font-extrabold tracking-tight text-ink-900 sm:text-lg">
            {reserva.raffle.title}
          </span>
        </Link>
        <Selo status={reserva.status} />
      </header>

      <section className="ui-card p-5 sm:p-7" aria-labelledby="titulo-pagamento">
        <p className="ui-eyebrow">Reserva {reserva.code}</p>
        <h1
          id="titulo-pagamento"
          className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900"
        >
          Pagamento por Pix
        </h1>
        <p className="ui-text mt-2">
          Organizada por:{" "}
          <strong className="font-extrabold text-ink-900">
            {reserva.raffle.organizerName}
          </strong>
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted p-4">
            <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">Valor</dt>
            <dd className="mt-1 text-xl font-extrabold text-ink-900">{amountLabel}</dd>
          </div>
          <div className="rounded-2xl bg-surface-muted p-4">
            <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">Números</dt>
            <dd className="mt-1 text-base font-bold text-ink-900 break-words">{numerosTexto}</dd>
          </div>
          {reserva.status === "pending" && (
            <div className="rounded-2xl bg-surface-muted p-4 sm:col-span-2">
              <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">
                Reserva válida até
              </dt>
              <dd className="mt-1 text-base font-bold text-ink-900">{dateTime(reserva.expiresAt)}</dd>
            </div>
          )}
        </dl>
      </section>

      {reserva.status === "pending" && qrDataUrl && payload && (
        <section className="ui-card p-5 sm:p-7" aria-labelledby="pagar-agora">
          <h2 id="pagar-agora" className="text-xl font-extrabold tracking-tight text-ink-900">
            Pague com o Pix
          </h2>
          <p className="ui-text mb-5">
            Escaneie o QR Code no app do seu banco ou use o código &quot;copia e cola&quot;. Depois,
            toque em &quot;Já paguei&quot; para avisar o organizador.
          </p>
          <PixPayment
            token={reserva.publicToken}
            qrDataUrl={qrDataUrl}
            payload={payload}
            amountLabel={amountLabel}
          />
        </section>
      )}

      {reserva.status === "declared_paid" && (
        <section className="ui-notice-success" role="status">
          <h2 className="text-lg font-extrabold">Obrigado!</h2>
          <p className="ui-text mt-1">
            O organizador confirmará seu pagamento em breve.
          </p>
        </section>
      )}

      {reserva.status === "confirmed" && (
        <section className="ui-notice-success" role="status">
          <h2 className="text-lg font-extrabold">Pagamento confirmado</h2>
          <p className="ui-text mt-1">Pagamento confirmado. Boa sorte!</p>
        </section>
      )}

      {reserva.status === "expired" && (
        <section className="ui-card space-y-4 p-5 sm:p-7" role="status">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Reserva expirada</h2>
            <p className="ui-text mt-2 text-ink-700">
              Esta reserva expirou. Se você já pagou, toque em <strong>Já paguei</strong>. Se ainda
              não pagou, escolha seus números novamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <DeclarePaidButton token={reserva.publicToken} />
            <Link href={linkRifa} className="ui-btn ui-btn-secondary">
              Voltar para a rifa
            </Link>
          </div>
        </section>
      )}

      {reserva.status === "released" && (
        <section className="ui-card p-5 sm:p-7" role="status">
          <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Reserva cancelada</h2>
          <p className="ui-text mt-2 text-ink-700">
            Esta reserva foi cancelada pelo organizador.
          </p>
          <Link href={linkRifa} className="ui-btn ui-btn-secondary mt-4">
            Voltar para a rifa
          </Link>
        </section>
      )}

      <footer className="ui-caption pb-4 text-center">
        Guarde este link para acompanhar o andamento da sua reserva.
      </footer>
    </div>
  );
}

function formatarNumeros(numeros: number[]): string {
  if (numeros.length === 0) return "—";
  return numeros.join(", ");
}

function Selo({ status }: { status: "pending" | "declared_paid" | "confirmed" | "released" | "expired" }) {
  if (status === "confirmed") return <span className="ui-badge ui-badge-success">Confirmada</span>;
  if (status === "declared_paid") return <span className="ui-badge ui-badge-brand">Já paguei</span>;
  if (status === "pending") return <span className="ui-badge ui-badge-warning">Aguardando</span>;
  if (status === "expired") return <span className="ui-badge ui-badge-warning">Expirada</span>;
  return <span className="ui-badge bg-surface-muted text-ink-700">Cancelada</span>;
}

function Carregando() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mx-auto max-w-2xl space-y-6">
      <span className="sr-only">Carregando pagamento...</span>
      <div className="ui-card h-56 animate-pulse" aria-hidden="true" />
      <div className="ui-card h-80 animate-pulse" aria-hidden="true" />
    </div>
  );
}
