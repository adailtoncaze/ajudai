import { spawnSync } from "node:child_process";

const éWindows = process.platform === "win32";
const npm = éWindows ? "npm.cmd" : "npm";

// Arquivos desta tarefa (troca de logo e nome da aplicação).
// Outros arquivos pendentes não entram no commit automático.
const arquivos = [
  "AGENTS.md",
  "README.md",
  "scripts/verify-and-push.mjs",
  "docs/DESIGN.md",
  "docs/PRD.md",
  "docs/TAREFAS.md",
  "package.json",
  "package-lock.json",
  "src/app/entrar/page.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/layout.tsx",
  "src/app/privacidade/page.tsx",
  "src/app/r/[slug]/page.tsx",
  "src/app/r/[slug]/reserva/[token]/page.tsx",
  "src/components/dashboard-shell.tsx",
  "src/components/logo.tsx",
  "src/components/site-footer.tsx",
];

// `:(literal)` evita que colchetes de rotas dinâmicas sejam tratados como curinga do git.
const caminhos = arquivos.map((arquivo) => `:(literal)${arquivo}`);

function executar(comando, argumentos = [], opcoes = {}) {
  const configuração = {
    cwd: process.cwd(),
    encoding: opcoes.encoding,
    stdio: opcoes.stdio ?? "inherit",
  };

  // No Windows, npm.cmd exige shell. Passar o comando como string evita o aviso
  // DEP0190 (args + shell: true); no Unix, mantemos args separados.
  const resultado =
    opcoes.shell ?? false
      ? spawnSync(`${comando} ${argumentos.join(" ")}`, { ...configuração, shell: true })
      : spawnSync(comando, argumentos, configuração);

  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
  return resultado;
}

function principal() {
  for (const etapa of ["build", "lint", "test"]) {
    console.log(`\n▶ npm run ${etapa}`);
    executar(npm, ["run", etapa], { shell: éWindows });
  }

  const situacao = executar("git", ["status", "--porcelain", "--", ...caminhos], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (!situacao.stdout.trim()) {
    console.log("\nNada para commitar: os arquivos desta tarefa já estão atualizados.");
    return;
  }

  const mensagem = process.argv[2] ?? "chore: valida build, lint e testes";

  console.log("\n▶ git add (arquivos desta tarefa)");
  executar("git", ["add", "--", ...caminhos]);

  console.log(`▶ git commit -m "${mensagem}"`);
  executar("git", ["commit", "-m", mensagem, "--", ...caminhos]);

  console.log("▶ git push");
  executar("git", ["push"]);
}

principal();
