/** Códigos públicos de erro da reserva (SPEC §6). Nunca exponha detalhes internos. */
export type ReservationErrorCode =
  | "invalid"
  | "number_taken"
  | "raffle_closed"
  | "too_many_pending"
  | "raffle_not_found"
  | "server_error";

export const reservationHttpStatus: Record<ReservationErrorCode, number> = {
  invalid: 400,
  number_taken: 409,
  raffle_closed: 409,
  too_many_pending: 429,
  raffle_not_found: 404,
  server_error: 500,
};

/** Microcopy do PRD §9. */
export const reservationMessages: Record<ReservationErrorCode, string> = {
  invalid: "Confira os dados informados e tente novamente.",
  number_taken: "Ops! Este número acabou de ser reservado por outra pessoa. Escolha outro.",
  raffle_closed: "Esta rifa foi encerrada e não aceita novas reservas.",
  too_many_pending:
    "Você já tem várias reservas aguardando pagamento. Conclua o pagamento ou aguarde o prazo expirar.",
  raffle_not_found: "Esta rifa não foi encontrada.",
  server_error: "Não foi possível concluir a reserva. Tente novamente em instantes.",
};

/** Traduz o erro do Postgres para um código público estável. */
export function mapReservationError(code?: string, message?: string): ReservationErrorCode {
  if (code === "23505") return "number_taken";

  const texto = message ?? "";
  if (texto.includes("number_taken")) return "number_taken";
  if (texto.includes("raffle_closed")) return "raffle_closed";
  if (texto.includes("too_many_pending")) return "too_many_pending";
  if (texto.includes("raffle_not_found")) return "raffle_not_found";
  if (texto.includes("invalid_quantity") || texto.includes("invalid_number")) return "invalid";
  return "server_error";
}
