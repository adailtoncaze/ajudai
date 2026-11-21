"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copiarTexto } from "@/lib/clipboard";

type Props = {
  url: string;
  label?: string;
};

export function CopyLinkButton({ url, label = "Copiar link" }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copiar() {
    await copiarTexto(url);

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="ui-btn ui-btn-secondary"
    >
      {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
      {copied ? "Copiado!" : label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copiado" : ""}
      </span>
    </button>
  );
}
