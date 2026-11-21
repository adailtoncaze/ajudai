import Link from "next/link";
import { Logo } from "@/components/logo";

export default function RifaNaoEncontrada() {
  return (
    <main className="ui-container flex flex-1 items-center justify-center py-16">
      <div className="ui-card max-w-lg p-8 text-center">
        <Logo size={56} className="mx-auto" />
        <p className="ui-eyebrow mt-5">Rifa não encontrada</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
          Este link não está disponível
        </h1>
        <p className="ui-text mt-3">
          Confira o endereço recebido ou fale com quem organizou a rifa.
        </p>
        <Link href="/" className="ui-btn ui-btn-primary mt-6">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
