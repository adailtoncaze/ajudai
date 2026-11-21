"use client";

import { useActionState } from "react";
import { entrar } from "@/app/entrar/actions";
import type { AuthState } from "@/lib/auth-schema";

const initialState: AuthState = { status: "idle", errors: {} };

export function AuthForm() {
  const [state, action, pending] = useActionState(entrar, initialState);

  return (
    <form action={action} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="ui-label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.errors.email)}
          aria-describedby="email-error"
          className="ui-input"
        />
        <p id="email-error" className="ui-error" aria-live="polite">
          {state.errors.email ?? ""}
        </p>
      </div>

      <div>
        <label htmlFor="password" className="ui-label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.errors.password)}
          aria-describedby="password-error"
          className="ui-input"
        />
        <p id="password-error" className="ui-error" aria-live="polite">
          {state.errors.password ?? ""}
        </p>
      </div>

      <p className="ui-error" role="alert" aria-live="polite">
        {state.errors.form ?? ""}
      </p>

      <button type="submit" disabled={pending} className="ui-btn ui-btn-primary w-full">
        {pending ? "Aguarde..." : "Entrar"}
      </button>
    </form>
  );
}
