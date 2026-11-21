/** Copia texto com fallback para navegadores sem a Clipboard API. */
export async function copiarTexto(texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    document.execCommand("copy");
    campo.remove();
  }
}

/** Copia o PNG do card. Retorna false quando o navegador não aceita imagem na área de transferência. */
export async function copiarImagem(url: string): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;

  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return false;
    const blob = await resposta.blob();
    const tipo = blob.type || "image/png";
    await navigator.clipboard.write([new ClipboardItem({ [tipo]: blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Último recurso para levar o card até a rede social: salvar o PNG no dispositivo. */
export function baixarImagem(url: string, nomeArquivo: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
