import Link from "next/link";
import { Logo } from "./logo";

/** Rodapé comum a todas as páginas, incluindo o link da política de privacidade. */
export function SiteFooter() {
  return (
    <footer className="ui-site-footer mt-auto border-t border-line-soft bg-surface/70">
      <div className="ui-container ui-caption flex flex-wrap items-center justify-between gap-2 py-4">
        <Logo size={28} />
        <nav aria-label="Links do rodapé">
          <Link href="/privacidade" className="ui-link font-semibold">
            Política de privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
