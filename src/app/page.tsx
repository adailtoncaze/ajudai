import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  QrCode,
  Share2,
  ShieldCheck,
  Smartphone,
  Ticket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const numeros = [
  { value: "07", state: "paid" },
  { value: "12", state: "selected" },
  { value: "18", state: "free" },
  { value: "23", state: "free" },
  { value: "31", state: "reserved" },
  { value: "42", state: "free" },
  { value: "56", state: "paid" },
  { value: "63", state: "free" },
  { value: "78", state: "free" },
  { value: "85", state: "reserved" },
  { value: "91", state: "free" },
  { value: "99", state: "free" },
];

// Cores de texto sobre fundo colorido usam as variantes escuras (contraste >= 4,5:1).
const numeroClasse: Record<string, string> = {
  free: "border-line bg-surface text-ink-700",
  selected: "border-brand-700 bg-brand-700 text-white",
  reserved: "border-dashed border-line bg-surface-muted text-ink-500",
  paid: "border-success-700 bg-success-700 text-white",
};

const beneficios = [
  {
    icon: Ticket,
    title: "Escolha de números",
    text: "Uma grade clara, com números livres, reservados e pagos sempre visíveis.",
  },
  {
    icon: QrCode,
    title: "Pix sem complicação",
    text: "O comprador escaneia o QR Code ou copia o código e paga no app do banco.",
  },
  {
    icon: ShieldCheck,
    title: "Você confirma",
    text: "O pagamento entra na sua fila e você confirma com poucos toques no painel.",
  },
];

const passos = [
  { n: "01", title: "Crie sua rifa", text: "Título, imagem, preço e chave Pix em um formulário só." },
  { n: "02", title: "Compartilhe o link", text: "WhatsApp, Facebook ou copia e cola: o link é seu." },
  { n: "03", title: "Acompanhe e sorteie", text: "Confirme pagamentos e publique o resultado na página." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="ui-container grid gap-14 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:py-24">
        <div className="space-y-7">
          <p className="ui-eyebrow">
            <Heart aria-hidden="true" size={16} strokeWidth={2.5} />
            Rifas beneficentes online
          </p>

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Sua rifa do bem,{" "}
            <span className="text-brand-800">pronta para compartilhar.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
            Crie sua rifa, compartilhe o link e venda números com pagamento por Pix.
            Você confirma os pagamentos com calma, no seu painel.
          </p>

          <div className="flex">
            <Suspense fallback={<BotaoCriarRifa href="/entrar" />}>
              <BotaoCriarRifaAutenticado />
            </Suspense>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-base font-medium text-ink-600">
            <li className="inline-flex items-center gap-2">
              <Smartphone aria-hidden="true" size={17} className="text-brand-800" />
              Feita para o celular
            </li>
            <li className="inline-flex items-center gap-2">
              <Share2 aria-hidden="true" size={17} className="text-brand-800" />
              Fácil de divulgar
            </li>
            <li className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" size={17} className="text-brand-800" />
              Sem custo de pagamento
            </li>
          </ul>
        </div>

        <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-6 -top-8 h-44 w-44 rounded-full bg-accent-200/70 blur-2xl" />
          <div className="absolute -bottom-10 -left-8 h-48 w-48 rounded-full bg-brand-200/70 blur-2xl" />

          <div className="ui-card relative -rotate-2 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-brand-800">
                  Rifa da esperança
                </p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">
                  Bazar da escola
                </p>
              </div>
              <span className="ui-badge ui-badge-success">Aberta</span>
            </div>

            <div className="mt-5 flex h-28 items-center justify-center rounded-2xl bg-linear-to-br from-brand-600 to-accent-500 text-white">
              <Heart size={42} strokeWidth={1.7} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm font-semibold text-ink-600">
                <span>128 de 300 números</span>
                <span className="text-brand-800">43% vendidos</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full w-[43%] rounded-full bg-brand-600" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-2.5">
              {numeros.map((numero) => (
                <span
                  key={numero.value}
                  className={`flex h-11 items-center justify-center rounded-xl border text-base font-bold ${numeroClasse[numero.state]}`}
                >
                  {numero.value}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-base text-ink-600">Cada número</span>
              <span className="text-lg font-extrabold text-ink-900">R$ 20,00</span>
            </div>
          </div>

          <div className="ui-card absolute -bottom-6 -left-3 flex items-center gap-3 px-4 py-3 shadow-lift sm:-left-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-700">
              <CheckCircle2 aria-hidden="true" size={22} />
            </span>
            <span className="text-base font-bold text-ink-900">Pagamento confirmado!</span>
          </div>
        </div>
      </section>

      <section className="ui-container pb-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {beneficios.map(({ icon: Icon, title, text }) => (
            <article key={title} className="ui-card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                <Icon aria-hidden="true" size={24} />
              </span>
              <h2 className="mt-5 text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
              <p className="ui-text mt-2">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ui-container pb-20">
        <div className="ui-card overflow-hidden">
          <div className="border-b border-line px-6 py-6 sm:px-8">
            <p className="ui-eyebrow">Como funciona</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Três passos e a rifa está no ar
            </h2>
          </div>
          <ol className="grid gap-6 px-6 py-7 sm:grid-cols-3 sm:px-8">
            {passos.map((passo) => (
              <li key={passo.n} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-base font-extrabold text-accent-700">
                  {passo.n}
                </span>
                <div>
                  <h3 className="font-extrabold text-ink-900">{passo.title}</h3>
                  <p className="ui-text mt-1">{passo.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function BotaoCriarRifa({ href }: { href: string }) {
  return (
    <Link href={href} className="ui-btn ui-btn-primary">
      Criar minha rifa
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

async function BotaoCriarRifaAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <BotaoCriarRifa href={user ? "/painel" : "/entrar"} />;
}
