# Ajudaí

Aplicação web para rifas beneficentes online. Veja `docs/PRD.md`, `docs/SPEC.md`, `docs/TAREFAS.md` e `docs/DESIGN.md` (design system — toda tela nova deve segui-lo).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

Comandos de verificação:

```bash
npm run build
npm run lint
npm test
```

Para validar e publicar de uma vez:

```bash
npm run check                       # build + lint + test, commit e push se tudo passar
npm run check -- "feat: nova marca" # mensagem de commit personalizada
```

O commit inclui apenas os arquivos listados em `scripts/verify-and-push.mjs`; alterações pendentes fora dessa lista permanecem no seu working tree.

## Contas de organizadores

Não há auto-cadastro. O administrador com acesso ao Supabase cria o usuário em **Authentication → Users → Add user** e define a senha inicial (mínimo 8 caracteres). O organizador entra em `/entrar` com esse e-mail e senha.

## Banco de dados — aplicar migrations

A migration inicial está em `supabase/migrations/0001_init.sql`. Ela cria as tabelas `raffles`, `reservations` e `reservation_numbers`, as políticas de RLS, as funções (`create_reservation`, `get_taken_numbers`, `declare_paid`, `owner_*`, `expire_stale_reservations`) e o bucket público `raffle-images`.

**Não edite uma migration já aplicada.** Mudanças posteriores entram em um novo arquivo, por exemplo `0002_ajuste.sql`.

### Opção 1 — SQL Editor (Supabase Dashboard)

1. No projeto Supabase, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo de `supabase/migrations/0001_init.sql` e cole na consulta.
3. Clique em **Run**. Não deve haver erros.
4. Confira em **Database → Tables** se as três tabelas foram criadas e em **Storage** se o bucket `raffle-images` existe.

### Opção 2 — Supabase CLI

Com a [CLI do Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started) instalada e um projeto remoto vinculado:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

Para conferir o que será aplicado antes de enviar:

```bash
supabase db remote commit   # salva o estado remoto para comparação
supabase db diff
```

Se não houver Docker/ambiente local, use a Opção 1.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` e `IP_HASH_SALT` são **somente do servidor** e não devem aparecer em arquivos enviados ao navegador.
