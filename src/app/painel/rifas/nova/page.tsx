import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { RaffleForm } from "@/components/raffle-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nova rifa",
};

export default function NovaRifaPage() {
  return (
    <main className="ui-container flex-1 py-10 sm:py-14">
      <div className="w-full max-w-3xl space-y-7">
        <header className="space-y-3">
          <div className="mb-5">
            <Link href="/painel" className="ui-link inline-flex items-center gap-2">
              <ArrowLeft aria-hidden="true" size={16} />
              Voltar ao painel
            </Link>
          </div>
          <p className="ui-eyebrow block">Nova rifa</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Conte sua história
          </h1>
          <p className="text-sm text-ink-600">
            Preencha os dados abaixo. Você poderá editar quase tudo depois.
          </p>
        </header>

        <Suspense fallback={<p className="text-ink-600">Carregando formulário...</p>}>
          <FormularioNovaRifa />
        </Suspense>
      </div>
    </main>
  );
}

async function FormularioNovaRifa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  return <RaffleForm mode="create" userId={user.id} />;
}
