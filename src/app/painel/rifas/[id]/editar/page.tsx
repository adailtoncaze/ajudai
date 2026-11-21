import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { encerrarRifa } from "@/app/painel/actions";
import { ExcluirRifaButton } from "@/components/excluir-rifa-button";
import { RaffleForm } from "@/components/raffle-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Editar rifa",
};

export default function EditarRifaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="ui-container flex-1 py-10 sm:py-14">
      <div className="w-full max-w-3xl space-y-7">
        <header className="space-y-3">
          <div className="mb-5">
            <Link href="/painel" className="ui-link inline-flex items-center gap-2">
              <ArrowLeft aria-hidden="true" size={16} />
              Voltar ao painel
            </Link>
          </div>
          <p className="ui-eyebrow block">Configurações da rifa</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Editar rifa
          </h1>
        </header>

        <Suspense fallback={<p className="text-ink-600">Carregando rifa...</p>}>
          <FormularioEdicao params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function FormularioEdicao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: raffle } = await supabase
    .from("raffles")
    .select(
      "id, title, description, organizer_name, total_numbers, price_cents, pix_key, pix_receiver_name, pix_city, reservation_hours, ends_at, image_url, prize_title, prize_image_url, prize_description, draw_date, status"
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!raffle) {
    notFound();
  }

  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("raffle_id", id);

  return (
    <div className="space-y-8">
      <RaffleForm
        mode="edit"
        userId={user.id}
        initial={{
          id: raffle.id,
          title: raffle.title,
          description: raffle.description,
          organizer_name: raffle.organizer_name,
          total_numbers: raffle.total_numbers,
          price_cents: raffle.price_cents,
          pix_key: raffle.pix_key,
          pix_receiver_name: raffle.pix_receiver_name,
          pix_city: raffle.pix_city,
          reservation_hours: raffle.reservation_hours,
          ends_at: raffle.ends_at,
          image_url: raffle.image_url,
          prize_title: raffle.prize_title,
          prize_image_url: raffle.prize_image_url,
          prize_description: raffle.prize_description,
          draw_date: raffle.draw_date,
          hasReservations: (count ?? 0) > 0,
          status: raffle.status,
        }}
      />

      {raffle.status === "open" ? (
        <form
          action={encerrarRifa}
          className="space-y-2 rounded-2xl border border-danger-200 bg-danger-50 p-5"
        >
          <input type="hidden" name="id" value={raffle.id} />
          <button type="submit" className="ui-btn ui-btn-danger">
            Encerrar rifa
          </button>
          <p className="ui-hint">Depois de encerrada, a rifa não aceita novas reservas.</p>
        </form>
      ) : (
        <p className="border-t border-line-soft pt-5 text-sm text-ink-600">
          Esta rifa já foi encerrada ou sorteada.
        </p>
      )}

      {(count ?? 0) === 0 ? (
        <div className="space-y-2 border-t border-line-soft pt-5">
          <ExcluirRifaButton id={raffle.id} titulo={raffle.title} variante="danger" />
          <p className="ui-hint">
            A rifa e a imagem serão removidas. Essa ação não pode ser desfeita.
          </p>
        </div>
      ) : (
        <p className="ui-hint border-t border-line-soft pt-5">
          Esta rifa já tem reservas e não pode ser excluída.
        </p>
      )}
    </div>
  );
}
