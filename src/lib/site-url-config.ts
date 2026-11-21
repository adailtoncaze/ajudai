function normalizar(url: string) {
  return url.replace(/\/+$/, "");
}

function eLocal(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * URL pública vinda das variáveis de ambiente, sem depender de dados da requisição.
 * Aceita NEXT_PUBLIC_SITE_URL e NEXT_SITE_URL; a segunda é útil em ambientes
 * somente servidor. VERCEL_URL é o fallback automático da Vercel.
 */
export function siteUrlConfigurada(): string | null {
  const publica = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (publica && !eLocal(publica)) {
    return normalizar(publica);
  }

  const alternativa = process.env.NEXT_SITE_URL?.trim();
  if (alternativa && !eLocal(alternativa)) {
    return normalizar(alternativa);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizar(`https://${vercel.replace(/^https?:\/\//, "")}`);
  }

  return null;
}

export function urlBaseMetadata(): string {
  return siteUrlConfigurada() ?? "http://localhost:3000";
}
