import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Entenda quais dados são coletados no Ajudaí, para quê e quem pode vê-los.",
};

export default function PrivacidadePage() {
  return (
    <main className="ui-container flex-1 py-10 sm:py-14">
      <article className="mx-auto max-w-3xl space-y-7">
        <header className="space-y-3">
          <Link href="/" className="ui-link inline-flex items-center gap-2">
            <ArrowLeft aria-hidden="true" size={16} />
            Voltar ao início
          </Link>
          <p className="ui-eyebrow mt-4">
            <ShieldCheck aria-hidden="true" size={16} />
            Privacidade
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
            Política de privacidade
          </h1>
          <p className="ui-text">
            Esta página explica, em linguagem simples, quais informações usamos para organizar uma
            rifa beneficente e quem pode vê-las.
          </p>
        </header>

        <section className="ui-card p-6 sm:p-7" aria-labelledby="dados-coletados">
          <h2 id="dados-coletados" className="text-lg font-extrabold tracking-tight text-ink-900">
            O que coletamos
          </h2>
          <ul className="mt-4 space-y-3 ui-text">
            <li>
              <strong className="text-ink-900">Do organizador:</strong> e-mail de acesso e os dados
              da rifa — título, descrição, imagem, nome do organizador, quantidade e preço dos
              números, chave Pix e nome e cidade do recebedor.
            </li>
            <li>
              <strong className="text-ink-900">Do comprador:</strong> nome, sobrenome e WhatsApp
              (obrigatório) no momento da reserva. O WhatsApp é usado somente para o organizador
              entrar em contato sobre a reserva e o pagamento. Não pedimos login nem dados do
              aplicativo do banco.
            </li>
          </ul>
          <p className="ui-hint mt-4">
            Coletamos apenas o necessário para criar a rifa, reservar números e confirmar pagamentos.
          </p>
        </section>

        <section className="ui-card p-6 sm:p-7" aria-labelledby="finalidade">
          <h2 id="finalidade" className="text-lg font-extrabold tracking-tight text-ink-900">
            Para que usamos
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 ui-text">
            <li>Exibir a rifa e sua grade de números.</li>
            <li>Registrar reservas, prazos e a escolha de números.</li>
            <li>Gerar o QR Code e o código Pix copia e cola da reserva.</li>
            <li>Permitir que o organizador confira e confirme os pagamentos manualmente.</li>
            <li>Permitir que o organizador fale com o comprador pelo WhatsApp sobre a reserva.</li>
          </ul>
          <p className="ui-hint mt-4">
            Não enviamos mensagens automáticas nem usamos o WhatsApp para divulgação.
          </p>
        </section>

        <section className="ui-card p-6 sm:p-7" aria-labelledby="quem-ve">
          <h2 id="quem-ve" className="text-lg font-extrabold tracking-tight text-ink-900">
            Quem pode ver
          </h2>
          <ul className="mt-4 space-y-3 ui-text">
            <li>
              O nome completo e o WhatsApp do comprador ficam visíveis apenas para o organizador da
              rifa, no painel dele. Outros compradores e visitantes não veem esses dados.
            </li>
            <li>
              Nenhuma página pública — incluindo a página de pagamento — mostra o WhatsApp do
              comprador.
            </li>
            <li>
              Na página pública, o vencedor aparece no máximo como &quot;Nome S.&quot;, sem telefone
              nem código da reserva.
            </li>
            <li>
              A chave Pix e o nome do recebedor aparecem somente na página de pagamento da reserva.
            </li>
            <li>
              A equipe da plataforma e a infraestrutura de banco e armazenamento acessam os dados
              apenas para manter o serviço funcionando.
            </li>
          </ul>
        </section>

        <section className="ui-card p-6 sm:p-7" aria-labelledby="remocao">
          <h2 id="remocao" className="text-lg font-extrabold tracking-tight text-ink-900">
            Como pedir remoção
          </h2>
          <p className="mt-4 ui-text">
            Se você comprou um número e quer pedir a remoção do seu nome ou WhatsApp, fale com o
            organizador da rifa. Ele é quem administra esses dados no painel.
          </p>
          <p className="mt-3 ui-text">
            Se você é organizador e deseja remover os dados da sua conta, entre em contato com o
            administrador da plataforma pelo mesmo canal em que recebeu o acesso.
          </p>
        </section>

        <section className="ui-card p-6 sm:p-7" aria-labelledby="pagamentos">
          <h2 id="pagamentos" className="text-lg font-extrabold tracking-tight text-ink-900">
            Pagamentos e responsabilidade
          </h2>
          <p className="mt-4 ui-text">
            A plataforma não processa pagamentos. O Pix é estático e o organizador confere manualmente
            quem pagou, usando nome e valor. O organizador é responsável pela rifa e por cumprir a
            legislação aplicável; recomenda-se consulta jurídica antes de divulgar a campanha.
          </p>
        </section>
      </article>
    </main>
  );
}
