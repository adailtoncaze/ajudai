"use client";

import Image from "next/image";
import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/social-icons";
import { baixarImagem, copiarTexto } from "@/lib/clipboard";
import { configuracaoCard, resumirTexto } from "@/lib/share-card";
import {
  compartilhamentoLink,
  compartilhamentoNativo,
  legendaCard,
  linkStoryInstagram,
  shareCardUrl,
  shareLinks,
  urlComCardDirect,
  whatsappShareLink,
  type FormatoCard,
  type RedeSocial,
} from "@/lib/share";

export type DadosCompartilhamento = {
  slug: string;
  titulo: string;
  descricao: string;
  url: string;
  premioTitulo: string | null;
  precoCents: number;
};

type Props = { dados: DadosCompartilhamento; text?: string };

const NOMES: Record<RedeSocial, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

const INSTRUCOES: Record<RedeSocial, string> = {
  whatsapp: "",
  facebook:
    "Ao colar o link, o Facebook mostra este card. Você também pode publicar a imagem diretamente.",
  instagram:
    "Story abre a câmera do Instagram com o card salvo e o link copiado. Direct envia o card como prévia do link na mensagem.",
};

function IconeRede({ rede, tamanho = 18 }: { rede: RedeSocial; tamanho?: number }) {
  if (rede === "whatsapp") return <WhatsAppIcon tamanho={tamanho} />;
  if (rede === "instagram") return <InstagramIcon tamanho={tamanho} />;
  return <FacebookIcon tamanho={tamanho} />;
}

export function ShareButtons({ dados, text }: Props) {
  const [redeAtiva, setRedeAtiva] = useState<RedeSocial | null>(null);
  const [formato, setFormato] = useState<FormatoCard>("story");
  const [aviso, setAviso] = useState("");
  const [preparandoCard, setPreparandoCard] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const arquivoCardRef = useRef<File | null>(null);

  const legenda =
    text?.trim() ||
    legendaCard({
      titulo: dados.titulo,
      descricao: resumirTexto(dados.descricao, 240),
      premioTitulo: dados.premioTitulo,
      precoCents: dados.precoCents,
    });
  const linkWhatsapp = whatsappShareLink(dados.url);
  const linkFacebook = shareLinks(dados.url, legenda).facebook;
  const config = redeAtiva ? configuracaoCard(redeAtiva, formato) : null;
  const cardUrl = shareCardUrl(dados.slug, redeAtiva ?? "facebook", formato);
  const nomeArquivo = `card-rifa-${dados.slug}-${redeAtiva ?? "facebook"}-${formato}.png`;

  // O compartilhamento exige gesto do usuário: buscamos o PNG antes do clique.
  useEffect(() => {
    if (redeAtiva !== "whatsapp" && redeAtiva !== "instagram") return;
    let cancelado = false;

    (async () => {
      try {
        const resposta = await fetch(cardUrl);
        if (!resposta.ok || cancelado) return;
        const blob = await resposta.blob();
        if (!cancelado) {
          arquivoCardRef.current = new File([blob], nomeArquivo, {
            type: blob.type || "image/png",
          });
        }
      } catch {
        // A ação de compartilhar tenta buscar o arquivo novamente.
      } finally {
        if (!cancelado) setPreparandoCard(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [redeAtiva, cardUrl, nomeArquivo]);

  function abrir(rede: RedeSocial) {
    setRedeAtiva(rede);
    setFormato("story");
    setAviso("");
    arquivoCardRef.current = null;
    setPreparandoCard(rede === "whatsapp" || rede === "instagram");
    dialogRef.current?.showModal();
  }

  function baixarCard() {
    baixarImagem(cardUrl, nomeArquivo);
    setAviso("Card salvo no dispositivo.");
  }

  async function buscarArquivoCard(): Promise<File> {
    const resposta = await fetch(cardUrl);
    if (!resposta.ok) throw new Error("card_indisponivel");
    const blob = await resposta.blob();
    return new File([blob], nomeArquivo, { type: blob.type || "image/png" });
  }

  async function compartilharWhatsapp() {
    setAviso("");

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setPreparandoCard(true);
      try {
        const arquivo = arquivoCardRef.current ?? (await buscarArquivoCard());
        arquivoCardRef.current = arquivo;
        const suportaArquivo =
          typeof navigator.canShare !== "function" || navigator.canShare({ files: [arquivo] });
        if (!suportaArquivo) throw new Error("arquivo_nao_suportado");

        await navigator.share(compartilhamentoNativo(dados.url, arquivo));
        setAviso("Escolha o WhatsApp e envie o card com o link clicável.");
        return;
      } catch (erro) {
        if ((erro as { name?: string })?.name === "AbortError") return;
        // Sem suporte a arquivo: tenta compartilhar só a URL (prévia clicável).
        try {
          await navigator.share(compartilhamentoNativo(dados.url));
          setAviso("Escolha o WhatsApp e envie o link clicável da rifa.");
          return;
        } catch (erroUrl) {
          if ((erroUrl as { name?: string })?.name === "AbortError") return;
        }
      } finally {
        setPreparandoCard(false);
      }
    }

    window.open(linkWhatsapp, "_blank", "noopener,noreferrer");
    setAviso(
      "A conversa foi aberta com o CTA e o link. No computador a URL aparece no texto — use “Baixar card” se quiser anexar a imagem."
    );
  }

  async function compartilharInstagram() {
    setAviso("");

    if (formato === "direct") {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        setAviso("Seu navegador não oferece compartilhamento. Baixe o card para enviar no Direct.");
        return;
      }

      try {
        await navigator.share(compartilhamentoLink(urlComCardDirect(dados.url)));
        setAviso("Escolha o Instagram e envie no Direct: o card vai como prévia do link.");
      } catch (erro) {
        if ((erro as { name?: string })?.name === "AbortError") return;
        setAviso("Não foi possível abrir o compartilhamento. Baixe o card para enviar no Direct.");
      }
      return;
    }

    // O Web Share com imagem sempre abre o Direct; para o Story usamos o deep link
    // da câmera, com o card salvo e o endereço pronto para o adesivo de link.
    try {
      await copiarTexto(dados.url);
      baixarImagem(cardUrl, nomeArquivo);
      const destino = linkStoryInstagram(navigator.userAgent);
      if (destino.startsWith("https://")) {
        window.open(destino, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = destino;
      }
      setAviso(
        "Card salvo e link copiado. Na câmera de Stories, escolha o card na galeria e cole o link no adesivo."
      );
    } catch {
      setAviso("Não foi possível copiar o link. Use “Baixar card” para publicar no Story.");
    }
  }

  return (
    <>
      <div role="group" aria-label="Compartilhar rifa" className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => abrir("whatsapp")} className="ui-btn ui-btn-secondary">
          <IconeRede rede="whatsapp" />
          WhatsApp
        </button>
        <button type="button" onClick={() => abrir("instagram")} className="ui-btn ui-btn-secondary">
          <IconeRede rede="instagram" />
          Instagram
        </button>
        <button type="button" onClick={() => abrir("facebook")} className="ui-btn ui-btn-secondary">
          <IconeRede rede="facebook" />
          Facebook
        </button>
        <CopyLinkButton url={dados.url} />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="titulo-compartilhar-card"
        className="ui-dialog ui-dialog-card"
        onClick={(evento) => {
          if (evento.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {redeAtiva && config && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-eyebrow">Compartilhar</p>
                <h2
                  id="titulo-compartilhar-card"
                  className="mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink-900"
                >
                  <IconeRede rede={redeAtiva} />
                  {NOMES[redeAtiva]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Fechar"
                className="ui-btn ui-btn-ghost"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            {INSTRUCOES[redeAtiva] && <p className="ui-hint mt-2">{INSTRUCOES[redeAtiva]}</p>}

            {redeAtiva === "instagram" && (
              <div className="mt-4">
                <p id="formato-card-label" className="ui-caption font-bold">
                  Formato do card
                </p>
                <div
                  role="group"
                  aria-labelledby="formato-card-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {(["story", "direct"] as const).map((opcao) => (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={formato === opcao}
                      onClick={() => {
                        setFormato(opcao);
                        setAviso("");
                        arquivoCardRef.current = null;
                        setPreparandoCard(true);
                      }}
                      className={`ui-btn ui-btn-secondary ${
                        formato === opcao ? "ui-toggle-ativo" : ""
                      }`}
                    >
                      {opcao === "story" ? "Story (9:16)" : "Direct (1:1)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 overflow-hidden rounded-2xl border border-line-soft bg-surface-muted p-2">
              <Image
                src={cardUrl}
                alt={`Prévia do card da rifa ${dados.titulo} para ${NOMES[redeAtiva]}`}
                width={config.largura}
                height={config.altura}
                unoptimized
                className="mx-auto h-auto max-h-[32rem] w-full rounded-xl object-contain"
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {redeAtiva === "whatsapp" && (
                <button
                  type="button"
                  onClick={compartilharWhatsapp}
                  disabled={preparandoCard}
                  className="ui-btn ui-btn-primary"
                >
                  <IconeRede rede="whatsapp" />
                  {preparandoCard ? "Preparando card..." : "Compartilhar no WhatsApp"}
                </button>
              )}

              {redeAtiva === "facebook" && (
                <a
                  href={linkFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn-primary"
                >
                  <IconeRede rede="facebook" />
                  Compartilhar no Facebook
                </a>
              )}

              {redeAtiva === "instagram" && (
                <button
                  type="button"
                  onClick={compartilharInstagram}
                  disabled={preparandoCard}
                  className="ui-btn ui-btn-primary"
                >
                  <IconeRede rede="instagram" />
                  {preparandoCard
                    ? "Preparando card..."
                    : formato === "direct"
                      ? "Compartilhar no Direct"
                      : "Abrir câmera do Story"}
                </button>
              )}

              <button type="button" onClick={baixarCard} className="ui-btn ui-btn-secondary">
                <Download aria-hidden="true" size={18} />
                Baixar card
              </button>
            </div>

            <p role="status" className="ui-hint mt-3 text-center">
              {aviso}
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
