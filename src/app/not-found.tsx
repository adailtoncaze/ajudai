import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="ui-container flex flex-1 items-center justify-center py-16">
      <div className="ui-card max-w-lg p-8 text-center">
        <Logo size={56} className="mx-auto" />
        <p className="ui-eyebrow mt-5">Página não encontrada</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
          Não encontramos o que você procura
        </h1>
        <p className="ui-text mt-3">
          Confira o endereço digitado ou volte ao início para continuar.
        </p>
        <Link href="/" className="ui-btn ui-btn-primary mt-6">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
