"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="ui-container flex flex-1 items-center justify-center py-16">
      <div className="ui-card max-w-lg p-8 text-center" role="alert">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
          Não foi possível carregar esta página
        </h1>
        <p className="ui-text mt-3">
          Ocorreu um problema temporário. Tente novamente; se continuar, volte ao início e acesse o
          link mais tarde.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={retry} className="ui-btn ui-btn-primary">
            Tentar novamente
          </button>
          <Link href="/" className="ui-btn ui-btn-secondary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
