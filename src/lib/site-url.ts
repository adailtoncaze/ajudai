import "server-only";
import { headers } from "next/headers";
import { siteUrlConfigurada } from "./site-url-config";

function normalizar(url: string) {
  return url.replace(/\/+$/, "");
}

function eLocal(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * URL pública da aplicação. Em produção, usa a variável configurada; se ela não
 * existir, aproveita o host da requisição (útil em previews e domínios customizados).
 */
export async function publicSiteUrl(): Promise<string> {
  const configurada = siteUrlConfigurada();
  if (configurada) {
    return configurada;
  }

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host && eLocal(host) ? "http" : "https");

  if (host) {
    return normalizar(`${protocolo}://${host}`);
  }

  return "http://localhost:3000";
}

export async function publicRaffleUrl(slug: string): Promise<string> {
  return `${await publicSiteUrl()}/r/${slug}`;
}
