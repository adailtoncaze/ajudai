import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ReservaNaoEncontrada() {
  return (
    <main className="ui-container flex flex-1 items-center justify-center py-16">
      <div className="ui-card max-w-lg p-8 text-center">
        <Logo size={56} className="mx-auto" />
        <p className="ui-eyebrow mt-5">Reserva não encontrada</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
          Não encontramos esta reserva
        </h1>
        <p className="ui-text mt-3">
          O link pode estar incompleto ou a reserva não existe. Confira o endereço recebido ou fale
          com quem organizou a rifa.
        </p>
        <Link href="/" className="ui-btn ui-btn-primary mt-6">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
