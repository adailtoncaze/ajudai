"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { sair } from "@/app/painel/actions";
import { DashboardNav, DashboardNavFallback } from "./dashboard-nav";
import { Logo } from "./logo";

type Props = {
  children: ReactNode;
  userInfo?: ReactNode;
};

export function DashboardShell({ children, userInfo }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <div className="ui-dashboard min-h-0 flex-1">
      {menuAberto && (
        <button
          type="button"
          className="ui-dashboard-overlay lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        id="dashboard-sidebar"
        aria-label="Menu do organizador"
        className={`ui-dashboard-sidebar flex flex-col ${menuAberto ? "ui-dashboard-sidebar-open" : ""}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-line-soft px-5">
          <Logo size={40} className="shrink-0" />
          <div>
            <p className="text-base font-extrabold leading-tight text-ink-900">Rifa Solidária</p>
            <p className="ui-caption">Área do organizador</p>
          </div>
        </div>

        <div className="flex-1">
          <Suspense fallback={<DashboardNavFallback />}>
            <DashboardNav onNavigate={() => setMenuAberto(false)} />
          </Suspense>
        </div>

        <div className="sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-line-soft bg-surface p-4">
          {userInfo}
          <form action={sair}>
            <button type="submit" className="ui-nav-link w-full text-left">
              <LogOut aria-hidden="true" size={19} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="ui-dashboard-main">
        <header className="ui-dashboard-topbar">
          <button
            type="button"
            className="ui-btn ui-btn-ghost lg:hidden"
            aria-controls="dashboard-sidebar"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            {menuAberto ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            <span className="sr-only">{menuAberto ? "Fechar menu" : "Abrir menu"}</span>
          </button>
          <p className="text-base font-extrabold text-ink-900 lg:hidden">Rifa Solidária</p>
          <p className="ui-caption hidden sm:block">
            Gerencie suas rifas e pagamentos em um só lugar.
          </p>
        </header>
        <div className="ui-dashboard-content">{children}</div>
      </div>
    </div>
  );
}
