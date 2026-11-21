"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { raffleImageStoragePath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { getOwnerWinner, type WinnerDetails } from "@/lib/winner";
import {
  raffleCreateSchema,
  raffleEditSchema,
  raffleErrors,
  type RaffleActionState,
} from "@/lib/validation";

const falhaLogin: RaffleActionState = {
  status: "error",
  errors: { form: "Entre na sua conta para gerenciar suas rifas." },
};

const falhaServidor: RaffleActionState = {
  status: "error",
  errors: { form: "Não foi possível salvar. Tente novamente em instantes." },
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9-]{3,60}$/;

export type ReservaActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type ConfirmarLoteState = ReservaActionState & {
  confirmed?: number;
  failed?: number;
};

export type SorteioVencedor = WinnerDetails;

export type SorteioActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  winner?: SorteioVencedor;
};

const sorteioInputSchema = z.object({
  raffleId: z.string().uuid("Rifa inválida."),
  raffleSlug: z.string().regex(slugPattern, "Rifa inválida."),
  number: z.number().int().positive().max(1_000_000).nullable(),
});

function dadosDoFormulario(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    organizer_name: String(formData.get("organizer_name") ?? ""),
    total_numbers: String(formData.get("total_numbers") ?? ""),
    price_reais: String(formData.get("price_reais") ?? ""),
    pix_key: String(formData.get("pix_key") ?? ""),
    pix_receiver_name: String(formData.get("pix_receiver_name") ?? ""),
    pix_city: String(formData.get("pix_city") ?? ""),
    reservation_hours: String(formData.get("reservation_hours") ?? "48"),
    ends_at: String(formData.get("ends_at") ?? ""),
    image_url: String(formData.get("image_url") ?? ""),
    prize_title: String(formData.get("prize_title") ?? ""),
    prize_image_url: String(formData.get("prize_image_url") ?? ""),
    prize_description: String(formData.get("prize_description") ?? ""),
    draw_date: String(formData.get("draw_date") ?? ""),
  };
}

export async function criarRifa(formData: FormData): Promise<RaffleActionState> {
  const parsed = raffleCreateSchema.safeParse(dadosDoFormulario(formData));
  if (!parsed.success) {
    return { status: "error", errors: raffleErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return falhaLogin;

  const valores = { ...parsed.data, owner_id: user.id, status: "open" };

  // Em caso de colisão do slug (23505), gera outro sufixo e tenta de novo.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data, error } = await supabase
      .from("raffles")
      .insert({ ...valores, slug: slugify(parsed.data.title) })
      .select("id, slug")
      .single();

    if (!error && data) {
      revalidatePath("/painel");
      redirect(`/painel?saved=create&slug=${encodeURIComponent(data.slug)}`);
    }

    if (error?.code === "23505") continue;

    console.error("[rifas] falha ao criar rifa", error);
    return falhaServidor;
  }

  return {
    status: "error",
    errors: { form: "Não foi possível gerar um link único. Tente novamente." },
  };
}

export async function editarRifa(formData: FormData): Promise<RaffleActionState> {
  const parsed = raffleEditSchema.safeParse({
    ...dadosDoFormulario(formData),
    id: String(formData.get("id") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", errors: raffleErrors(parsed.error) };
  }

  const { id, price_cents, ...campos } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return falhaLogin;

  const { data: atual } = await supabase
    .from("raffles")
    .select("slug, total_numbers, price_cents")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!atual) {
    return { status: "error", errors: { form: "Rifa não encontrada." } };
  }

  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("raffle_id", id);

  const mudouQuantidade = campos.total_numbers !== undefined && campos.total_numbers !== atual.total_numbers;
  const mudouPreco = price_cents !== undefined && price_cents !== atual.price_cents;

  if ((mudouQuantidade || mudouPreco) && (count ?? 0) > 0) {
    return {
      status: "error",
      errors: {
        form: "Quantidade e preço não podem ser alterados depois da primeira reserva.",
      },
    };
  }

  const alteracoes = {
    ...campos,
    ...(price_cents === undefined ? {} : { price_cents }),
  };

  const { data, error } = await supabase
    .from("raffles")
    .update(alteracoes)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("slug")
    .single();

  if (error || !data) {
    console.error("[rifas] falha ao editar rifa", error);
    return falhaServidor;
  }

  revalidatePath("/painel");
  revalidatePath(`/painel/rifas/${id}/editar`);
  revalidatePath(`/r/${data.slug}`);
  redirect(`/painel?saved=edit&slug=${encodeURIComponent(data.slug)}`);
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function encerrarRifa(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuidPattern.test(id)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("raffles")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("status", "open")
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    console.error("[rifas] falha ao encerrar rifa", error);
    return;
  }

  revalidatePath("/painel");
  revalidatePath(`/painel/rifas/${id}/editar`);
  revalidatePath(`/r/${data.slug}`);
}

export async function excluirRifa(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!uuidPattern.test(id)) redirect("/painel?erro=exclusao");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: raffle } = await supabase
    .from("raffles")
    .select("slug, image_url, prize_image_url")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!raffle) redirect("/painel?erro=exclusao");

  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("raffle_id", id);

  if ((count ?? 0) > 0) {
    redirect(`/painel?erro=reservas&slug=${encodeURIComponent(raffle.slug)}`);
  }

  const { error } = await supabase
    .from("raffles")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    console.error("[rifas] falha ao excluir rifa", error);
    redirect("/painel?erro=exclusao");
  }

  const caminhos = [raffle.image_url, raffle.prize_image_url]
    .map((url) => raffleImageStoragePath(url, user.id))
    .filter((caminho): caminho is string => caminho !== null);

  if (caminhos.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("raffle-images")
      .remove(caminhos);
    if (storageError) {
      console.error("[rifas] falha ao remover imagens da rifa", storageError);
    }
  }

  revalidatePath("/painel");
  revalidatePath(`/painel/rifas/${id}/editar`);
  revalidatePath(`/r/${raffle.slug}`);
  redirect("/painel?saved=delete");
}

function contextoRifaValido(raffleId: string, raffleSlug: string) {
  return uuidPattern.test(raffleId) && slugPattern.test(raffleSlug);
}

function revalidarRifa(raffleId: string, raffleSlug: string) {
  revalidatePath("/painel");
  revalidatePath(`/painel/rifas/${raffleId}`);
  revalidatePath(`/r/${raffleSlug}`);
}

export async function confirmarReserva(
  reservationId: string,
  raffleId: string,
  raffleSlug: string
): Promise<ReservaActionState> {
  if (!uuidPattern.test(reservationId) || !contextoRifaValido(raffleId, raffleSlug)) {
    return { status: "error", message: "Reserva inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_confirm_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Algum número desta reserva já foi tomado por outra pessoa. Libere esta reserva.",
      };
    }
    console.error("[reservas] falha ao confirmar", error.code);
    return { status: "error", message: "Não foi possível confirmar a reserva." };
  }

  revalidarRifa(raffleId, raffleSlug);
  return { status: "success", message: "Reserva confirmada." };
}

export async function liberarReserva(
  reservationId: string,
  raffleId: string,
  raffleSlug: string
): Promise<ReservaActionState> {
  if (!uuidPattern.test(reservationId) || !contextoRifaValido(raffleId, raffleSlug)) {
    return { status: "error", message: "Reserva inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_release_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.error("[reservas] falha ao liberar", error.code);
    return { status: "error", message: "Não foi possível liberar a reserva." };
  }

  revalidarRifa(raffleId, raffleSlug);
  return { status: "success", message: "Reserva liberada." };
}

export async function confirmarReservasEmLote(
  reservationIds: string[],
  raffleId: string,
  raffleSlug: string
): Promise<ConfirmarLoteState> {
  if (!contextoRifaValido(raffleId, raffleSlug)) {
    return { status: "error", message: "Rifa inválida." };
  }

  const ids = z.array(z.string().uuid()).safeParse(reservationIds);
  if (!ids.success || ids.data.length === 0) {
    return { status: "error", message: "Selecione ao menos uma reserva para confirmar." };
  }

  const supabase = await createClient();
  let confirmed = 0;
  let failed = 0;

  for (const id of ids.data) {
    const { error } = await supabase.rpc("owner_confirm_reservation", {
      p_reservation_id: id,
    });
    if (error) {
      failed += 1;
    } else {
      confirmed += 1;
    }
  }

  if (confirmed > 0) {
    revalidarRifa(raffleId, raffleSlug);
  }

  const partes = [
    confirmed === 1 ? "1 reserva confirmada" : `${confirmed} reservas confirmadas`,
    failed === 1 ? "1 falhou" : `${failed} falharam`,
  ];

  return {
    status: failed > 0 ? "error" : "success",
    message: `${partes[0]}, ${partes[1]}.`,
    confirmed,
    failed,
  };
}

/**
 * RN14/RN15: `p_number` nulo sorteia entre reservas confirmadas; informado,
 * usa o número escolhido pelo organizador. Só uma vez por rifa (owner_draw).
 */
export async function sortearRifa(
  raffleId: string,
  raffleSlug: string,
  numero: number | null
): Promise<SorteioActionState> {
  const entrada = sorteioInputSchema.safeParse({ raffleId, raffleSlug, number: numero });
  if (!entrada.success) return { status: "error", message: "Dados inválidos para o sorteio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Entre na sua conta para sortear." };

  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, slug, total_numbers, status")
    .eq("id", entrada.data.raffleId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!raffle || raffle.slug !== entrada.data.raffleSlug) {
    return { status: "error", message: "Rifa não encontrada." };
  }
  if (raffle.status === "drawn") {
    return { status: "error", message: "Esta rifa já foi sorteada." };
  }

  const faixa = `Informe um número entre 1 e ${raffle.total_numbers}.`;
  if (entrada.data.number !== null && entrada.data.number > raffle.total_numbers) {
    return { status: "error", message: faixa };
  }

  const { data: resultadoDraw, error } = await supabase.rpc("owner_draw", {
    p_raffle_id: raffle.id,
    p_number: entrada.data.number,
  });

  if (error) {
    const detalhe = error.message ?? "";
    if (detalhe.includes("no_paid_numbers")) {
      return { status: "error", message: "Ainda não há números pagos para sortear." };
    }
    if (detalhe.includes("already_drawn")) {
      return { status: "error", message: "Esta rifa já foi sorteada." };
    }
    if (detalhe.includes("invalid_number")) {
      return { status: "error", message: faixa };
    }
    console.error("[sorteio] falha ao sortear", error.code);
    return { status: "error", message: "Não foi possível realizar o sorteio. Tente novamente." };
  }

  const numeroSorteado = z.number().int().positive().safeParse(resultadoDraw);
  if (!numeroSorteado.success) {
    console.error("[sorteio] resposta inválida do banco");
    return {
      status: "error",
      message: "O sorteio foi registrado, mas não foi possível carregar o resultado. Atualize a página.",
    };
  }

  const vencedor = await getOwnerWinner(supabase, raffle.id, numeroSorteado.data);

  revalidarRifa(raffle.id, entrada.data.raffleSlug);

  return {
    status: "success",
    message: vencedor.name
      ? "Sorteio realizado com sucesso."
      : `Número ${vencedor.number} — sem comprador confirmado.`,
    winner: vencedor,
  };
}
