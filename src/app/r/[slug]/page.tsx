import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { Logo } from "@/components/logo";
import { PendingReservationNotice } from "@/components/pending-reservation-notice";
import { ReservationFlow } from "@/components/reservation-flow";
import { ShareButtons } from "@/components/share-buttons";
import { brl, dateOnly, dateTime } from "@/lib/format";
import {
  getPublicRaffle,
  getPublicTakenNumbers,
  getPublicWinner,
} from "@/lib/raffles";
import { shareCardUrl } from "@/lib/share";
import { publicRaffleUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };
type MetadataProps = Props & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Evita duas consultas idênticas entre generateMetadata e a página.
const carregarRifa = cache(getPublicRaffle);

export async function generateMetadata({ params, searchParams }: MetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const busca = await searchParams;
  // O link do WhatsApp (?wa) e do Direct (?ig=direct) pedem cards próprios na prévia.
  // O CTA fica na legenda/nativa da mensagem, então o título continua sendo o da rifa.
  const peloWhatsapp = busca.wa !== undefined;
  const peloDirect = busca.ig === "direct";
  const raffle = await carregarRifa(slug);

  if (!raffle) return { title: "Rifa não encontrada" };

  const title = raffle.title;
  const description =
    (raffle.description.replace(/\s+/g, " ").trim() ||
      `Participe da rifa ${raffle.title}`).slice(0, 160);
  // O CTA fica na mensagem, então o título permanece o da rifa para não duplicá-lo.
  const tituloPrevia = title;
  const card = peloWhatsapp
    ? {
        url: shareCardUrl(slug, "whatsapp"),
        width: 1080,
        height: 1920,
        alt: `Card da rifa ${title}`,
      }
    : peloDirect
      ? {
          url: shareCardUrl(slug, "instagram", "direct"),
          width: 1080,
          height: 1080,
          alt: `Card da rifa ${title}`,
        }
      : {
          url: shareCardUrl(slug, "facebook"),
          width: 1200,
          height: 630,
          alt: `Card da rifa ${title}`,
        };
  const images = [
    card,
    ...(raffle.image_url ? [{ url: raffle.image_url, width: 1200, height: 630 }] : []),
    ...(raffle.prize_image_url ? [{ url: raffle.prize_image_url, width: 1200, height: 630 }] : []),
  ];

  return {
    title,
    description,
    openGraph: {
      title: tituloPrevia,
      description,
      url: `/r/${slug}`,
      type: "website",
      locale: "pt_BR",
      siteName: "Ajudaí",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: tituloPrevia,
      description,
      images: images.map((image) => image.url),
    },
  };
}

export default function RifaPublicaPage({ params }: Props) {
  return (
    <main className="ui-container flex-1 py-8 sm:py-12">
      <Suspense fallback={<Carregando />}>
        <ConteudoRifa params={params} />
      </Suspense>
    </main>
  );
}

async function ConteudoRifa({ params }: Props) {
  const { slug } = await params;
  const raffle = await carregarRifa(slug);

  if (!raffle) notFound();

  const taken = await getPublicTakenNumbers(raffle.id);
  const winner =
    raffle.status === "drawn" && raffle.winner_number !== null
      ? await getPublicWinner(raffle.id, raffle.winner_number)
      : null;

  const encerrada = raffle.status !== "open";
  const total = raffle.total_numbers;
  const reservados = taken.length;
  const percentual = total > 0 ? Math.round((reservados / total) * 100) : 0;
  const url = await publicRaffleUrl(slug);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Ajudaí — página inicial" className="inline-flex items-center">
          <Logo size={40} />
        </Link>
        <Selo status={raffle.status} />
      </header>

      <PendingReservationNotice slug={slug} />

      <section className="ui-card overflow-hidden" aria-labelledby="titulo-rifa">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="bg-brand-50 p-4 sm:p-6">
            {raffle.image_url ? (
              <Image
                src={raffle.image_url}
                alt={`Imagem da rifa ${raffle.title}`}
                width={1200}
                height={630}
                unoptimized
                className="h-64 w-full rounded-2xl border border-line-soft object-cover sm:h-80 lg:h-96"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-line-soft bg-surface sm:h-80 lg:h-96">
                <Logo size={56} className="h-auto max-w-full" />
              </div>
            )}
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div>
              <p className="ui-caption font-semibold">
                Organizada por:{" "}
                <strong className="font-extrabold text-ink-900">{raffle.organizer_name}</strong>
              </p>
              <h1
                id="titulo-rifa"
                className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl"
              >
                {raffle.title}
              </h1>
            </div>

            {raffle.description.trim() && (
              <p className="ui-text whitespace-pre-line">
                {raffle.description}
              </p>
            )}

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-muted p-4">
                <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">
                  Cada número
                </dt>
                <dd className="mt-1 text-xl font-extrabold text-ink-900">
                  {brl(raffle.price_cents)}
                </dd>
              </div>
              {raffle.ends_at && (
                <div className="rounded-2xl bg-surface-muted p-4">
                  <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">
                    {encerrada ? "Data limite" : "Encerra em"}
                  </dt>
                  <dd className="mt-1 text-base font-bold text-ink-900">
                    {dateTime(raffle.ends_at)}
                  </dd>
                </div>
              )}
              {raffle.draw_date && (
                <div className="rounded-2xl bg-surface-muted p-4">
                  <dt className="text-sm font-bold uppercase tracking-wide text-ink-600">
                    Data do sorteio
                  </dt>
                  <dd className="mt-1 text-base font-bold text-ink-900">
                    {dateOnly(raffle.draw_date)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {(raffle.prize_title?.trim() || raffle.prize_image_url || raffle.prize_description.trim()) && (
        <section className="ui-card p-5 sm:p-7" aria-labelledby="premio-da-rifa">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
            {raffle.prize_image_url && (
              <div className="w-48 shrink-0 rounded-2xl bg-brand-50 p-3 sm:w-56 sm:p-4">
                <Image
                  src={raffle.prize_image_url}
                  alt={`Prêmio: ${raffle.prize_title?.trim() || raffle.title}`}
                  width={640}
                  height={640}
                  unoptimized
                  className="h-auto w-full rounded-2xl border border-line-soft"
                />
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <p className="ui-eyebrow">Prêmio</p>
              <h2 id="premio-da-rifa" className="text-2xl font-extrabold tracking-tight text-ink-900">
                {raffle.prize_title?.trim() || "O que será sorteado"}
              </h2>
              {raffle.prize_description.trim() && (
                <p className="ui-text whitespace-pre-line text-left">
                  {raffle.prize_description}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {raffle.status === "drawn" && (
        <section role="status" className="ui-notice-success" aria-labelledby="resultado-sorteio">
          <h2 id="resultado-sorteio" className="font-extrabold">
            Resultado do sorteio
          </h2>
          <p className="mt-1 text-lg font-extrabold">
            {winner?.name
              ? `Número ${winner.number} — ${winner.name}`
              : `Número ${raffle.winner_number} — sem comprador confirmado`}
          </p>
          {raffle.drawn_at && (
            <p className="ui-caption mt-1">Sorteado em {dateTime(raffle.drawn_at)}</p>
          )}
        </section>
      )}

      {raffle.status === "closed" && (
        <section role="status" className="ui-card p-5 text-base leading-relaxed text-warning-800">
          Esta rifa está encerrada. Não é possível selecionar novos números.
        </section>
      )}

      {/* Espaço reservado para a barra fixa: sem isso ela cobre as últimas linhas no celular. */}
      <section className="ui-card scroll-mt-6 p-5 pb-28 sm:p-7 sm:pb-24" aria-labelledby="numeros-da-rifa">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="ui-eyebrow">Escolha seus números</p>
            <h2 id="numeros-da-rifa" className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">
              Números da rifa
            </h2>
          </div>
          <p className="text-base font-extrabold text-ink-900">
            {brl(raffle.price_cents)} por número
          </p>
        </div>

        <div className="mt-6">
          <div className="ui-caption flex flex-wrap items-center justify-between gap-2 font-semibold">
            <span>{reservados} de {total} números já reservados</span>
            <span>{percentual}% vendidos</span>
          </div>
          <div
            role="progressbar"
            aria-label="Números já reservados"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={reservados}
            aria-valuetext={`${reservados} de ${total} números já reservados`}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full bg-accent-500"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>

        <div className="mt-7">
          <ReservationFlow
            slug={slug}
            total={total}
            taken={taken}
            priceCents={raffle.price_cents}
            disabled={encerrada}
          />
          {/* Faz a barra funcionar no instante do toque, antes da hidratação. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){
  var preco=${raffle.price_cents};
  var fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  function atualizar(){
    var b=document.querySelector('.ui-selecao-bar');
    if(!b)return;
    var n=document.querySelectorAll('input[data-numero]:checked').length;
    var d=b.querySelector('.ui-selecao-bar-detalhe');
    if(d)d.textContent=n+' '+(n===1?'número':'números')+' · '+fmt.format(preco*n/100);
  }
  document.addEventListener('change',function(e){
    if(e.target&&e.target.matches&&e.target.matches('input[data-numero]'))atualizar();
  },true);
  document.addEventListener('click',function(e){
    if(!e.target.closest||!e.target.closest('.ui-selecao-bar button'))return;
    window.__rifaContinuar=true;
  },true);
  atualizar();
})();`,
            }}
          />
        </div>
      </section>

      <section className="ui-card p-5 sm:p-6" aria-labelledby="compartilhar-rifa">
        <h2 id="compartilhar-rifa" className="text-xl font-extrabold tracking-tight text-ink-900">
          Compartilhe esta rifa
        </h2>
        <p className="ui-hint mb-4">
          Convide mais pessoas para participar desta rifa beneficente.
        </p>
        <ShareButtons
          dados={{
            slug,
            titulo: raffle.title,
            descricao: raffle.description,
            url,
            premioTitulo: raffle.prize_title,
            precoCents: raffle.price_cents,
          }}
        />
      </section>

      <footer className="ui-caption space-y-2 pb-4 text-center">
        <p>
          Rifa beneficente organizada por {raffle.organizer_name}. A plataforma não processa
          pagamentos nem se responsabiliza pela rifa.
        </p>
        <p>
          O pagamento é conferido manualmente pelo organizador; em caso de dúvidas, fale com quem
          organizou a rifa.
        </p>
      </footer>
    </div>
  );
}

function Selo({ status }: { status: "open" | "closed" | "drawn" }) {
  if (status === "drawn") return <span className="ui-badge ui-badge-success">Sorteada</span>;
  if (status === "closed") return <span className="ui-badge ui-badge-warning">Encerrada</span>;
  return <span className="ui-badge ui-badge-brand">Aberta</span>;
}

function Carregando() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mx-auto max-w-5xl space-y-6">
      <span className="sr-only">Carregando rifa...</span>
      <div className="ui-card h-72 animate-pulse" aria-hidden="true" />
      <div className="ui-card h-96 animate-pulse" aria-hidden="true" />
    </div>
  );
}
