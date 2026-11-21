import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Heart, ShieldCheck, Ticket } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o painel do organizador de rifas.",
};

export default function EntrarPage() {
  return (
    <main className="ui-container flex flex-1 items-center justify-center py-12 sm:py-20">
      <div className="ui-card grid w-full max-w-4xl overflow-hidden lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
          <div className="space-y-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Heart aria-hidden="true" size={24} />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-white">
                Rifa Solidária
              </p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
                Sua rifa do bem começa aqui.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-white">
              Crie, divulgue e acompanhe tudo em um só lugar. O comprador paga por Pix e você
              confirma no painel.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-brand-800 p-5">
            <p className="flex items-center gap-3 text-sm font-semibold">
              <Ticket aria-hidden="true" size={18} />
              Números organizados em um clique
            </p>
            <p className="flex items-center gap-3 text-sm font-semibold">
              <ShieldCheck aria-hidden="true" size={18} />
              Pagamentos conferidos por você
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-10">
          <div className="space-y-2">
            <p className="ui-eyebrow">Área do organizador</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Bem-vindo de volta</h1>
            <p className="ui-text">
              Entre com o e-mail e a senha fornecidos pelo administrador.
            </p>
          </div>

          <div className="mt-8">
            <AuthForm />
          </div>

          <p className="mt-8 text-center text-base">
            <Link
              href="/"
              className="ui-link inline-flex items-center gap-2"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Voltar para o início
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
