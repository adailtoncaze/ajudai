"use server";

import { redirect } from "next/navigation";
import {
  authErrorMessage,
  loginSchema,
  zodErrors,
  type AuthState,
} from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function entrar(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", errors: zodErrors(parsed.error) };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { status: "error", errors: { form: authErrorMessage(error) } };
    }
  } catch (error) {
    console.error("[auth] falha ao entrar", error);
    return {
      status: "error",
      errors: { form: "Não foi possível entrar. Tente novamente em instantes." },
    };
  }

  redirect("/painel");
}
