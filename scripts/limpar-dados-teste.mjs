/**
 * Limpa dados de teste do Supabase.
 *
 * Apaga TODAS as rifas do projeto (reservas e números vão em cascata) e TODOS
 * os arquivos do bucket `raffle-images`. Não apaga usuários do Auth.
 *
 * Uso:
 *   npm run limpar:teste                       # simulação (nada é apagado)
 *   npm run limpar:teste -- --confirmar=REF    # executa (REF = ref do projeto)
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "raffle-images";
const LIMITE_LISTAGEM = 1000;
const LOTE_REMOCAO = 100;
const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

const AJUDA = `
Uso: npm run limpar:teste -- [opções]

Opções:
  --confirmar=REF   Executa a limpeza. REF deve ser o ref do projeto exibido na simulação.
  --ajuda           Mostra esta mensagem.

Sem --confirmar, o script apenas mostra o que seria apagado.
`;

function carregarVariaveisDeAmbiente() {
  // Carrega primeiro o .env genérico e depois o .env.local (que tem prioridade).
  for (const arquivo of [".env", ".env.local"]) {
    try {
      process.loadEnvFile(join(RAIZ, arquivo));
    } catch {
      // Arquivo opcional: em alguns ambientes as variáveis já vêm do shell.
    }
  }
}

function lerArgumentos() {
  const argumentos = process.argv.slice(2);
  const invalidos = argumentos.filter(
    (argumento) =>
      argumento !== "-h" &&
      argumento !== "--ajuda" &&
      argumento !== "--confirmar" &&
      !argumento.startsWith("--confirmar=")
  );

  if (invalidos.length > 0) {
    throw new Error(`Argumento não reconhecido: ${invalidos.join(", ")}`);
  }

  const confirmacao = argumentos.find(
    (argumento) => argumento === "--confirmar" || argumento.startsWith("--confirmar=")
  );

  return {
    confirmar: Boolean(confirmacao),
    refInformado: confirmacao?.startsWith("--confirmar=")
      ? confirmacao.slice("--confirmar=".length)
      : null,
  };
}

function referenciaDoProjeto(url) {
  const host = new URL(url).hostname;
  return host.endsWith(".supabase.co") ? host.split(".")[0] : host;
}

async function contar(supabase, tabela) {
  const { count, error } = await supabase
    .from(tabela)
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(`Falha ao contar ${tabela}: ${error.message}`);
  return count ?? 0;
}

async function listarCaminhos(supabase, prefixo = "") {
  const caminhos = [];
  let deslocamento = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefixo, { limit: LIMITE_LISTAGEM, offset: deslocamento });

    if (error) throw new Error(`Falha ao listar ${prefixo || "o bucket"}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const nome = `${prefixo}${item.name}`;
      if (item.id === null) {
        caminhos.push(...(await listarCaminhos(supabase, `${nome}/`)));
      } else {
        caminhos.push(nome);
      }
    }

    deslocamento += data.length;
    if (data.length < LIMITE_LISTAGEM) break;
  }

  return caminhos;
}

async function removerImagens(supabase, caminhos) {
  for (let indice = 0; indice < caminhos.length; indice += LOTE_REMOCAO) {
    const lote = caminhos.slice(indice, indice + LOTE_REMOCAO);
    const { error } = await supabase.storage.from(BUCKET).remove(lote);
    if (error) throw new Error(`Falha ao remover imagens: ${error.message}`);
  }
}

async function principal() {
  if (process.argv.slice(2).some((argumento) => argumento === "-h" || argumento === "--ajuda")) {
    console.log(AJUDA);
    return;
  }

  carregarVariaveisDeAmbiente();
  const { confirmar, refInformado } = lerArgumentos();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local antes de continuar."
    );
  }

  const referencia = referenciaDoProjeto(url);
  const supabase = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log(`Projeto: ${referencia}`);
  const [rifas, reservas, numeros, imagens] = await Promise.all([
    contar(supabase, "raffles"),
    contar(supabase, "reservations"),
    contar(supabase, "reservation_numbers"),
    listarCaminhos(supabase),
  ]);

  console.log("Dados encontrados:");
  console.log(`  Rifas:                 ${rifas}`);
  console.log(`  Reservas:              ${reservas}`);
  console.log(`  Números reservados:    ${numeros}`);
  console.log(`  Imagens (${BUCKET}): ${imagens.length}`);

  if (!confirmar) {
    console.log("\nSimulação concluída — nada foi apagado.");
    console.log(`Para executar: npm run limpar:teste -- --confirmar=${referencia}`);
    return;
  }

  if (refInformado !== referencia) {
    throw new Error(
      `Confirmação inválida. Use --confirmar=${referencia} para apagar os dados deste projeto.`
    );
  }

  console.log("\n▶ Apagando rifas (reservas e números em cascata)...");
  const { error: erroRifas } = await supabase
    .from("raffles")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");

  if (erroRifas) throw new Error(`Falha ao apagar rifas: ${erroRifas.message}`);

  console.log(`▶ Removendo ${imagens.length} imagem(ns)...`);
  await removerImagens(supabase, imagens);

  const [rifasRestantes, imagensRestantes] = await Promise.all([
    contar(supabase, "raffles"),
    listarCaminhos(supabase),
  ]);

  console.log("\nLimpeza concluída.");
  console.log(`  Rifas restantes: ${rifasRestantes}`);
  console.log(`  Imagens restantes: ${imagensRestantes.length}`);
}

principal().catch((erro) => {
  console.error(`\nErro: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exitCode = 1;
});
