const PREFIXO_PUBLICO = "/storage/v1/object/public/raffle-images/";

/**
 * Converte a URL pública de uma imagem de rifa no caminho do Storage.
 * Só aceita arquivos do bucket `raffle-images` dentro da pasta do dono.
 */
export function raffleImageStoragePath(
  imageUrl: string | null | undefined,
  ownerId: string
): string | null {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    if (!url.pathname.startsWith(PREFIXO_PUBLICO)) return null;

    const caminho = decodeURIComponent(url.pathname.slice(PREFIXO_PUBLICO.length));
    const [pasta, arquivo, ...resto] = caminho.split("/");

    if (pasta !== ownerId) return null;
    if (!arquivo || arquivo === "." || arquivo === ".." || resto.length > 0) return null;

    return `${pasta}/${arquivo}`;
  } catch {
    return null;
  }
}
