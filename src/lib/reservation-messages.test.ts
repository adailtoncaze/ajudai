import { describe, expect, it } from "vitest";
import { mapReservationError, reservationMessages } from "./reservation-messages";

describe("mapReservationError", () => {
  it("mapeia conflito de número e erros do banco para códigos públicos", () => {
    expect(mapReservationError("23505")).toBe("number_taken");
    expect(mapReservationError(undefined, "raffle_closed")).toBe("raffle_closed");
    expect(mapReservationError(undefined, "too_many_pending")).toBe("too_many_pending");
    expect(mapReservationError(undefined, "invalid_number")).toBe("invalid");
  });

  it("esconde erros desconhecidos como server_error", () => {
    expect(mapReservationError("42P01", "detalhe interno")).toBe("server_error");
  });

  it("usa a microcopy do PRD para os erros de reserva", () => {
    expect(reservationMessages.number_taken).toBe(
      "Ops! Este número acabou de ser reservado por outra pessoa. Escolha outro."
    );
    expect(reservationMessages.too_many_pending).toContain("várias reservas aguardando pagamento");
  });
});
