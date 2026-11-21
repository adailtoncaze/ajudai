import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { io } from "next/cache";

export async function createClient() {
  // getUser() do Supabase lê o relógio para renovar tokens. Com Cache Components,
  // isso precisa ficar fora do shell estático. `io()` suspende no prerender e
  // resolve imediatamente em requests, Server Actions e escopos cacheados.
  await io();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component: o proxy já atualiza a sessão.
          }
        },
      },
    }
  );
}
