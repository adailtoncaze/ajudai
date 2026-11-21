import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .email("Informe um e-mail válido.");

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type AuthErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export type AuthState = {
  status: "idle" | "error";
  errors: AuthErrors;
};

export function zodErrors(error: z.ZodError): AuthErrors {
  const fields = error.flatten().fieldErrors as {
    email?: string[];
    password?: string[];
  };
  return {
    email: fields.email?.[0],
    password: fields.password?.[0],
  };
}

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";
    const rawMessage =
      "message" in error && typeof error.message === "string"
        ? error.message.toLowerCase()
        : "";

    if (code === "invalid_credentials" || rawMessage.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos.";
    }
    if (code === "email_not_confirmed" || rawMessage.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar.";
    }
    if (code === "too_many_requests" || rawMessage.includes("too many requests")) {
      return "Muitas tentativas. Aguarde um momento e tente novamente.";
    }
  }

  return "Não foi possível entrar. Tente novamente em instantes.";
}
