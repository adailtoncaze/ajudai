import "server-only";
import { headers } from "next/headers";

function normalizar(url: string) {
  return url.replace(/\/+$/, "");
}

function eLocal(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * URL pública da aplicação. Em produção, o host da requisição tem prioridade sobre
 * NEXT_PUBLIC_SITE_URL quando ela não foi configurada (ou ficou como localhost).
 */
export async function publicSiteUrl(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configurada && !eLocal(configurada)) {
    return normalizar(configurada);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizar(`https://${vercel.replace(/^https?:\/\//, "")}`);
  }

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host && eLocal(host) ? "http" : "https");

  if (host) {
    return normalizar(`${protocolo}://${host}`);
  }

  return normalizar(configurada || "http://localhost:3000");
}

export async function publicRaffleUrl(slug: string): Promise<string> {
  return `${await publicSiteUrl()}/r/${slug}`;
}
