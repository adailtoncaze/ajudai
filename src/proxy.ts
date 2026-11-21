import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirecionarComCookies(url: URL, origem: NextResponse) {
  const resposta = NextResponse.redirect(url);
  origem.cookies.getAll().forEach((cookie) => resposta.cookies.set(cookie));
  return resposta;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const éPainel = pathname === "/painel" || pathname.startsWith("/painel/");
  const éEntrar = pathname === "/entrar";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem configuração (ex.: primeiro checkout), não há sessão possível.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (éPainel) {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value)
        );
      },
    },
  });

  // Atualiza a sessão (renovação de token) antes de responder.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (éPainel && !user) {
    return redirecionarComCookies(new URL("/entrar", request.url), supabaseResponse);
  }

  if (éEntrar && user) {
    return redirecionarComCookies(new URL("/painel", request.url), supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
