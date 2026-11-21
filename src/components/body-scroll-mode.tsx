"use client";

import { useEffect } from "react";

/**
 * Trava a rolagem do body enquanto o layout do painel estiver montado.
 *
 * Fica em `src/app/painel/layout.tsx` (não no layout raiz): ao sair do painel,
 * o React desmonta o layout e o cleanup remove a classe — sem depender de
 * `usePathname()`, que suspende em rotas dinâmicas com Cache Components.
 */
export function BodyScrollMode() {
  useEffect(() => {
    document.body.classList.add("ui-body-panel");
    return () => document.body.classList.remove("ui-body-panel");
  }, []);

  return null;
}
