"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

const links = [{ href: "/painel", label: "Minhas rifas", icon: LayoutDashboard }];

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  function estaAtivo(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <nav aria-label="Navegação principal" className="space-y-1 p-4">
      <p className="ui-caption px-3 pb-2 font-bold uppercase tracking-widest">Menu</p>
      {links.map(({ href, label, icon: Icon }) => {
        const ativo = estaAtivo(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            onClick={onNavigate}
            className={`ui-nav-link ${ativo ? "ui-nav-link-active" : ""}`}
          >
            <Icon aria-hidden="true" size={19} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardNavFallback() {
  return <div className="h-40" aria-hidden="true" />;
}
