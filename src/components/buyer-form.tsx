"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { brl } from "@/lib/format";
import {
  reservationMessages,
  type ReservationErrorCode,
} from "@/lib/reservation-messages";
import { createReservationSchema, reservationErrors } from "@/lib/validation";

type Props = {
  slug: string;
  numbers: number[];
  priceCents: number;
  open: boolean;
  onClose: () => void;
  onNumberTaken: () => void;
};

type Campos = "firstName" | "lastName" | "phone";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function BuyerForm({
  slug,
  numbers,
  priceCents,
  open,
  onClose,
  onNumberTaken,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  const elementoQueAbriu = useRef<HTMLElement | null>(null);
  const abertoRef = useRef(open);
  const fecharRef = useRef(onClose);

  // Refs estáveis: o Activity do Next 16 preserva o estado ao sair e voltar da página.
  // Sem este cleanup o modal pode voltar aberto e bloquear todos os toques na grade.
  useEffect(() => {
    abertoRef.current = open;
    fecharRef.current = onClose;
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [erros, setErros] = useState<Partial<Record<Campos, string>>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      elementoQueAbriu.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      primeiroCampoRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (!abertoRef.current) return;
      dialogRef.current?.close();
      fecharRef.current();
    },
    []
  );

  // O Activity do Next 16 mantém a página anterior montada após navegar. Um
  // <dialog open> continua na top layer e bloqueia os cliques da página nova.
  // Fechamos antes do router.push (abaixo) e também em voltar/avançar.
  useEffect(() => {
    function fecharAoNavegar() {
      dialogRef.current?.close();
    }
    window.addEventListener("popstate", fecharAoNavegar);
    return () => window.removeEventListener("popstate", fecharAoNavegar);
  }, []);

  function fechar() {
    onClose();
    elementoQueAbriu.current?.focus();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setErros({});
    setErroGeral("");

    if (website.trim() !== "") {
      setErroGeral(reservationMessages.invalid);
      return;
    }

    const validados = createReservationSchema.safeParse({
      numbers,
      firstName,
      lastName,
      phone,
    });
    if (!validados.success) {
      const mensagens = reservationErrors(validados.error);
      setErros({
        firstName: mensagens.firstName,
        lastName: mensagens.lastName,
        phone: mensagens.phone,
      });
      setErroGeral(mensagens.numbers ?? "");
      return;
    }
    if (numbers.length === 0) {
      setErroGeral("Selecione ao menos um número antes de continuar.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch(
        `/api/raffles/${encodeURIComponent(slug)}/reservations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numbers: validados.data.numbers,
            firstName: validados.data.firstName,
            lastName: validados.data.lastName,
            phone: validados.data.phone,
            website,
          }),
        }
      );

      if (!resposta.ok) {
        const corpo: unknown = await resposta.json().catch(() => null);
        const possivelCodigo =
          corpo && typeof corpo === "object" && "error" in corpo
            ? (corpo as { error?: unknown }).error
            : undefined;
        const codigo: ReservationErrorCode =
          typeof possivelCodigo === "string" && possivelCodigo in reservationMessages
            ? (possivelCodigo as ReservationErrorCode)
            : "server_error";

        if (codigo === "number_taken") onNumberTaken();
        setErroGeral(reservationMessages[codigo]);
        return;
      }

      const corpo: unknown = await resposta.json().catch(() => null);
      const token =
        corpo && typeof corpo === "object" && "token" in corpo
          ? (corpo as { token?: unknown }).token
          : undefined;
      if (typeof token !== "string" || !uuidPattern.test(token)) {
        setErroGeral(reservationMessages.server_error);
        return;
      }

      try {
        window.localStorage.setItem(`rifa:${slug}:last`, token);
      } catch {
        // Navega mesmo se o navegador bloquear o armazenamento local.
      }
      // Fecha antes de navegar: o diálogo aberto ficaria na top layer e
      // interceptaria os toques na página de pagamento.
      dialogRef.current?.close();
      router.push(`/r/${encodeURIComponent(slug)}/reserva/${token}`);
    } catch {
      setErroGeral(reservationMessages.server_error);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-formulario-comprador"
      className="ui-dialog"
      onCancel={onClose}
      onClose={() => {
        onClose();
        elementoQueAbriu.current?.focus();
      }}
    >
      <h2 id="titulo-formulario-comprador" className="text-xl font-extrabold tracking-tight text-ink-900">
        Finalizar reserva
      </h2>
      <p className="ui-eyebrow mt-3">
        {numbers.length} {numbers.length === 1 ? "número" : "números"} · {brl(numbers.length * priceCents)}
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
        <div>
          <label htmlFor="buyer-first-name" className="ui-label">
            Nome
          </label>
          <input
            ref={primeiroCampoRef}
            id="buyer-first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(evento) => setFirstName(evento.target.value)}
            aria-invalid={Boolean(erros.firstName)}
            aria-describedby="buyer-first-name-error"
            className="ui-input"
          />
          <p id="buyer-first-name-error" className="ui-error" aria-live="polite">
            {erros.firstName ?? ""}
          </p>
        </div>

        <div>
          <label htmlFor="buyer-last-name" className="ui-label">
            Sobrenome
          </label>
          <input
            id="buyer-last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(evento) => setLastName(evento.target.value)}
            aria-invalid={Boolean(erros.lastName)}
            aria-describedby="buyer-last-name-error"
            className="ui-input"
          />
          <p id="buyer-last-name-error" className="ui-error" aria-live="polite">
            {erros.lastName ?? ""}
          </p>
        </div>

        <div>
          <label htmlFor="buyer-phone" className="ui-label">
            WhatsApp
          </label>
          <input
            id="buyer-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="83999990000"
            required
            value={phone}
            onChange={(evento) => setPhone(evento.target.value)}
            aria-invalid={Boolean(erros.phone)}
            aria-describedby="buyer-phone-hint buyer-phone-error"
            className="ui-input"
          />
          <p id="buyer-phone-hint" className="ui-hint">
            Necessário para o organizador entrar em contato sobre a reserva.
          </p>
          <p id="buyer-phone-error" className="ui-error" aria-live="polite">
            {erros.phone ?? ""}
          </p>
        </div>

        {/* Campo isca (SPEC §10): invisível para pessoas, tentador para robôs. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="buyer-website">Deixe este campo em branco</label>
          <input
            id="buyer-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(evento) => setWebsite(evento.target.value)}
          />
        </div>

        <p className="ui-error" role="alert" aria-live="polite">
          {erroGeral}
        </p>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft pt-4">
          <button type="button" onClick={fechar} className="ui-btn ui-btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className="ui-btn ui-btn-primary">
            {enviando ? "Gerando Pix..." : "Gerar Pix"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
