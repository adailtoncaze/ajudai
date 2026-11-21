const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Minúsculas, sem acentos, até 50 caracteres + `-` e 4 caracteres aleatórios. */
export function slugify(title: string, suffix: string = randomSuffix()): string {
  const base =
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/g, "") || "rifa";

  return `${base}-${suffix}`;
}
