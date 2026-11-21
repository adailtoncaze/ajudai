"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}

export function PendingReservationNotice({ slug }: { slug: string }) {
  const getSnapshot = useCallback(() => {
    try {
      const guardado = window.localStorage.getItem(`rifa:${slug}:last`);
      return guardado && uuidPattern.test(guardado) ? guardado : null;
    } catch {
      return null;
    }
  }, [slug]);
  const getServerSnapshot = useCallback(() => null, []);
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!token) return null;

  return (
    <div role="status" className="ui-notice-success">
      Você tem uma reserva em andamento —{" "}
      <Link href={`/r/${slug}/reserva/${token}`} className="ui-link font-extrabold">
        ver pagamento
      </Link>
      .
    </div>
  );
}
