import { describe, expect, it } from "vitest";
import { authErrorMessage, loginSchema, zodErrors } from "./auth-schema";

describe("validação de login", () => {
  it("recusa senha com menos de 8 caracteres", () => {
    const result = loginSchema.safeParse({
      email: "organizador@example.com",
      password: "1234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrors(result.error).password).toBe(
        "A senha deve ter pelo menos 8 caracteres."
      );
    }
  });

  it("recusa e-mail inválido", () => {
    const result = loginSchema.safeParse({
      email: "nao-e-um-email",
      password: "senha123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrors(result.error).email).toBe("Informe um e-mail válido.");
    }
  });

  it("aceita e-mail e senha válidos", () => {
    expect(
      loginSchema.safeParse({
        email: "organizador@example.com",
        password: "senha123",
      }).success
    ).toBe(true);
  });
});

describe("mensagens do Supabase", () => {
  it("traduz credenciais inválidas", () => {
    expect(
      authErrorMessage({ message: "Invalid login credentials" })
    ).toBe("E-mail ou senha incorretos.");
  });

  it("esconde detalhes desconhecidos", () => {
    expect(authErrorMessage(new Error("token interno vazou"))).toBe(
      "Não foi possível entrar. Tente novamente em instantes."
    );
  });
});
