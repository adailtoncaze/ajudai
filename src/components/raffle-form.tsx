"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { criarRifa, editarRifa } from "@/app/painel/actions";
import {
  assinaturaFormulario,
  valoresIniciaisFormulario,
  type RaffleFormInitial,
  type RaffleFormValues,
} from "@/lib/raffle-form";
import { createClient } from "@/lib/supabase/client";
import { validateImageFile, type RaffleActionState } from "@/lib/validation";

export type { RaffleFormInitial } from "@/lib/raffle-form";

type Props = {
  userId: string;
  mode: "create" | "edit";
  initial?: RaffleFormInitial;
};

const estadoInicial: RaffleActionState = { status: "idle", errors: {} };

const inputClass = "ui-input";
const errorClass = "ui-error";

function Campo({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="ui-label">
        {label}
      </label>
      {children}
      {hint && <p className="ui-hint">{hint}</p>}
      <p id={`${name}-error`} className={errorClass} aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}

export function RaffleForm({ userId, mode, initial }: Props) {
  const [state, setState] = useState<RaffleActionState>(estadoInicial);
  const [pending, startTransition] = useTransition();
  // Todos os campos são controlados: um `defaultValue` mantém o valor do primeiro
  // render mesmo quando o servidor entrega dados novos (edição + navegação do router).
  const [valores, setValores] = useState<RaffleFormValues>(() =>
    valoresIniciaisFormulario(initial)
  );
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);
  const [prizePreview, setPrizePreview] = useState<string | null>(initial?.prize_image_url ?? null);
  const [fileError, setFileError] = useState("");
  const [prizeFileError, setPrizeFileError] = useState("");
  const previewRef = useRef<string | null>(initial?.image_url ?? null);
  const prizePreviewRef = useRef<string | null>(initial?.prize_image_url ?? null);
  const locked = mode === "edit" && Boolean(initial?.hasReservations);

  const assinaturaInicial = assinaturaFormulario(initial);
  const assinaturaAplicada = useRef(assinaturaInicial);

  useEffect(() => {
    if (assinaturaAplicada.current === assinaturaInicial) return;
    assinaturaAplicada.current = assinaturaInicial;

    setValores(valoresIniciaisFormulario(initial));
    setPreview(initial?.image_url ?? null);
    setPrizePreview(initial?.prize_image_url ?? null);
    previewRef.current = initial?.image_url ?? null;
    prizePreviewRef.current = initial?.prize_image_url ?? null;
    setFileError("");
    setPrizeFileError("");
    setState(estadoInicial);
  }, [assinaturaInicial, initial]);

  useEffect(
    () => () => {
      for (const ref of [previewRef, prizePreviewRef]) {
        if (ref.current?.startsWith("blob:")) URL.revokeObjectURL(ref.current);
      }
    },
    []
  );

  function atualizar(campo: keyof RaffleFormValues, valor: string) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
  }

  function aoEscolherImagem(evento: React.ChangeEvent<HTMLInputElement>, tipo: "rifa" | "premio") {
    const arquivo = evento.target.files?.[0];
    const ehPremio = tipo === "premio";
    const atual = ehPremio ? valores.prize_image_url || null : valores.image_url || null;
    const ref = ehPremio ? prizePreviewRef : previewRef;
    const definirErro = ehPremio ? setPrizeFileError : setFileError;
    const definirPreview = ehPremio ? setPrizePreview : setPreview;

    definirErro("");
    if (!arquivo) {
      definirPreview(atual);
      return;
    }

    const problema = validateImageFile(arquivo);
    if (problema) {
      definirErro(problema);
      evento.target.value = "";
      definirPreview(atual);
      return;
    }

    if (ref.current?.startsWith("blob:")) URL.revokeObjectURL(ref.current);
    const url = URL.createObjectURL(arquivo);
    ref.current = url;
    definirPreview(url);
  }

  async function enviarImagem(arquivo: File): Promise<string | null> {
    const extensao =
      arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${userId}/${crypto.randomUUID()}.${extensao}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("raffle-images")
      .upload(caminho, arquivo, { contentType: arquivo.type });

    if (error) {
      console.error("[rifas] falha no upload da imagem", error);
      setState({
        status: "error",
        errors: { form: "Não foi possível enviar a imagem. Tente novamente." },
      });
      return null;
    }

    return supabase.storage.from("raffle-images").getPublicUrl(caminho).data.publicUrl;
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const imagem = dados.get("image");
    const imagemPremio = dados.get("prize_image");
    dados.delete("image");
    dados.delete("prize_image");
    setFileError("");
    setPrizeFileError("");
    setState(estadoInicial);

    // Valida os dois arquivos antes de enviar qualquer um ao Storage.
    for (const [arquivo, nome] of [
      [imagem, "imagem"],
      [imagemPremio, "imagem do prêmio"],
    ] as const) {
      if (!(arquivo instanceof File) || arquivo.size === 0) continue;
      const problema = validateImageFile(arquivo);
      if (problema) {
        if (nome === "imagem") setFileError(problema);
        else setPrizeFileError(problema);
        return;
      }
    }

    let imageUrl = valores.image_url;
    if (imagem instanceof File && imagem.size > 0) {
      const url = await enviarImagem(imagem);
      if (!url) return;
      imageUrl = url;
    }

    let prizeImageUrl = valores.prize_image_url;
    if (imagemPremio instanceof File && imagemPremio.size > 0) {
      const url = await enviarImagem(imagemPremio);
      if (!url) return;
      prizeImageUrl = url;
    }

    dados.set("image_url", imageUrl);
    dados.set("prize_image_url", prizeImageUrl);

    startTransition(async () => {
      const resultado = mode === "create" ? await criarRifa(dados) : await editarRifa(dados);
      setState(resultado);
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={aoEnviar} noValidate className="space-y-10">
        <section className="ui-form-section">
          <header className="ui-form-section-header">
            <span className="ui-form-section-number">01</span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Sobre a rifa</h2>
              <p className="ui-hint">O que o comprador vai ver na página pública.</p>
            </div>
          </header>
          <div className="space-y-5">
            <Campo name="title" label="Título" error={state.errors.title}>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={valores.title}
            onChange={(evento) => atualizar("title", evento.target.value)}
            aria-invalid={Boolean(state.errors.title)}
            aria-describedby="title-error"
            className={inputClass}
          />
        </Campo>

        <Campo name="description" label="Descrição" error={state.errors.description} hint="Até 4000 caracteres.">
          <textarea
            id="description"
            name="description"
            rows={5}
            value={valores.description}
            onChange={(evento) => atualizar("description", evento.target.value)}
            aria-invalid={Boolean(state.errors.description)}
            aria-describedby="description-error"
            className={inputClass}
          />
        </Campo>

        <Campo
          name="image"
          label="Imagem da rifa"
          error={fileError || state.errors.image_url}
          hint="JPG, PNG ou WebP de até 2 MB. Prefira uma imagem horizontal (1200×630) com menos de 300 KB."
        >
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(evento) => aoEscolherImagem(evento, "rifa")}
            aria-invalid={Boolean(fileError)}
            aria-describedby="image-error"
            className={`${inputClass} ui-file-input`}
          />
        </Campo>

        {preview && (
          <Image
            src={preview}
            alt="Pré-visualização da imagem da rifa"
            width={640}
            height={335}
            unoptimized
            className="w-full rounded-2xl border border-line object-cover"
          />
        )}

        <Campo
          name="draw_date"
          label="Data do sorteio (opcional)"
          error={state.errors.draw_date}
          hint="Data prevista, exibida na página pública."
        >
          <input
            id="draw_date"
            name="draw_date"
            type="date"
            value={valores.draw_date}
            onChange={(evento) => atualizar("draw_date", evento.target.value)}
            aria-invalid={Boolean(state.errors.draw_date)}
            aria-describedby="draw_date-error"
            className={inputClass}
          />
        </Campo>

        <Campo name="organizer_name" label="Nome do organizador" error={state.errors.organizer_name}>
          <input
            id="organizer_name"
            name="organizer_name"
            type="text"
            required
            value={valores.organizer_name}
            onChange={(evento) => atualizar("organizer_name", evento.target.value)}
            aria-invalid={Boolean(state.errors.organizer_name)}
            aria-describedby="organizer_name-error"
            className={inputClass}
          />
          </Campo>
        </div>
      </section>

      <section className="ui-form-section">
        <header className="ui-form-section-header">
          <span className="ui-form-section-number">02</span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-900">O prêmio</h2>
            <p className="ui-hint">Informações opcionais sobre o que será sorteado.</p>
          </div>
        </header>
        <div className="space-y-5">
          <Campo
            name="prize_title"
            label="Título do prêmio (opcional)"
            error={state.errors.prize_title}
            hint="Ex.: Cesta básica + bicicleta."
          >
            <input
              id="prize_title"
              name="prize_title"
              type="text"
              maxLength={120}
              value={valores.prize_title}
              onChange={(evento) => atualizar("prize_title", evento.target.value)}
              aria-invalid={Boolean(state.errors.prize_title)}
              aria-describedby="prize_title-error"
              className={inputClass}
            />
          </Campo>

          <Campo
            name="prize_image"
            label="Imagem do prêmio (opcional)"
            error={prizeFileError || state.errors.prize_image_url}
            hint="JPG, PNG ou WebP de até 2 MB."
          >
            <input
              id="prize_image"
              name="prize_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(evento) => aoEscolherImagem(evento, "premio")}
              aria-invalid={Boolean(prizeFileError)}
              aria-describedby="prize_image-error"
              className={`${inputClass} ui-file-input`}
            />
          </Campo>

          {prizePreview && (
            <Image
              src={prizePreview}
              alt="Pré-visualização da imagem do prêmio"
              width={640}
              height={335}
              unoptimized
              className="w-full rounded-2xl border border-line object-cover"
            />
          )}

          <Campo
            name="prize_description"
            label="Descrição do prêmio (opcional)"
            error={state.errors.prize_description}
            hint="Até 4000 caracteres."
          >
            <textarea
              id="prize_description"
              name="prize_description"
              rows={4}
              maxLength={4000}
              value={valores.prize_description}
              onChange={(evento) => atualizar("prize_description", evento.target.value)}
              aria-invalid={Boolean(state.errors.prize_description)}
              aria-describedby="prize_description-error"
              className={inputClass}
            />
          </Campo>

        </div>
      </section>

      <section className="ui-form-section">
        <header className="ui-form-section-header">
          <span className="ui-form-section-number">03</span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Números e valores</h2>
            <p className="ui-hint">Defina a grade e o preço de cada número.</p>
          </div>
        </header>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              name="total_numbers"
            label="Quantidade de números"
            error={state.errors.total_numbers}
            hint={locked ? "Bloqueada: esta rifa já tem reservas." : "De 1 a 1000 números."}
          >
            <input
              id="total_numbers"
              name="total_numbers"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              required={!locked}
              disabled={locked}
              value={valores.total_numbers}
              onChange={(evento) => atualizar("total_numbers", evento.target.value)}
              aria-invalid={Boolean(state.errors.total_numbers)}
              aria-describedby="total_numbers-error"
              className={inputClass}
            />
          </Campo>

          <Campo
            name="price_reais"
            label="Preço por número (R$)"
            error={state.errors.price_reais}
            hint={locked ? "Bloqueado: esta rifa já tem reservas." : "Exemplo: 19,90"}
          >
            <input
              id="price_reais"
              name="price_reais"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required={!locked}
              disabled={locked}
              value={valores.price_reais}
              onChange={(evento) => atualizar("price_reais", evento.target.value)}
              aria-invalid={Boolean(state.errors.price_reais)}
              aria-describedby="price_reais-error"
              className={inputClass}
            />
          </Campo>
        </div>
        </div>
      </section>

      <section className="ui-form-section">
        <header className="ui-form-section-header">
          <span className="ui-form-section-number">04</span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Pagamento Pix</h2>
            <p className="ui-hint">Os dados que aparecem no QR Code do comprador.</p>
          </div>
        </header>
        <div className="space-y-5">
          <Campo name="pix_key" label="Chave Pix" error={state.errors.pix_key} hint="CPF, CNPJ, e-mail, telefone com DDD ou chave aleatória.">
          <input
            id="pix_key"
            name="pix_key"
            type="text"
            required
            value={valores.pix_key}
            onChange={(evento) => atualizar("pix_key", evento.target.value)}
            aria-invalid={Boolean(state.errors.pix_key)}
            aria-describedby="pix_key-error"
            className={inputClass}
          />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo name="pix_receiver_name" label="Nome do recebedor" error={state.errors.pix_receiver_name}>
            <input
              id="pix_receiver_name"
              name="pix_receiver_name"
              type="text"
              required
              maxLength={25}
              value={valores.pix_receiver_name}
              onChange={(evento) => atualizar("pix_receiver_name", evento.target.value)}
              aria-invalid={Boolean(state.errors.pix_receiver_name)}
              aria-describedby="pix_receiver_name-error"
              className={inputClass}
            />
          </Campo>

          <Campo name="pix_city" label="Cidade do recebedor" error={state.errors.pix_city}>
            <input
              id="pix_city"
              name="pix_city"
              type="text"
              required
              maxLength={15}
              value={valores.pix_city}
              onChange={(evento) => atualizar("pix_city", evento.target.value)}
              aria-invalid={Boolean(state.errors.pix_city)}
              aria-describedby="pix_city-error"
              className={inputClass}
            />
          </Campo>
        </div>

        </div>
      </section>

      <section className="ui-form-section">
        <header className="ui-form-section-header">
          <span className="ui-form-section-number">05</span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-900">Prazo e encerramento</h2>
            <p className="ui-hint">Por quanto tempo o número fica reservado após o Pix.</p>
          </div>
        </header>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo name="reservation_hours" label="Prazo de reserva (horas)" error={state.errors.reservation_hours} hint="De 1 a 720 horas.">
            <input
              id="reservation_hours"
              name="reservation_hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={720}
              required
              value={valores.reservation_hours}
              onChange={(evento) => atualizar("reservation_hours", evento.target.value)}
              aria-invalid={Boolean(state.errors.reservation_hours)}
              aria-describedby="reservation_hours-error"
              className={inputClass}
            />
          </Campo>

          <Campo name="ends_at" label="Data limite (opcional)" error={state.errors.ends_at}>
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              value={valores.ends_at}
              onChange={(evento) => atualizar("ends_at", evento.target.value)}
              aria-invalid={Boolean(state.errors.ends_at)}
              aria-describedby="ends_at-error"
              className={inputClass}
            />
          </Campo>
        </div>

        </div>
      </section>

      <div className="ui-form-actions">
        {mode === "edit" && initial && <input type="hidden" name="id" value={initial.id} />}

        <p role="alert" aria-live="polite" className={errorClass}>
          {state.errors.form ?? ""}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="ui-btn ui-btn-primary w-full sm:w-auto"
        >
          {pending ? "Salvando..." : mode === "create" ? "Criar rifa" : "Salvar alterações"}
        </button>
      </div>
      </form>
    </div>
  );
}
