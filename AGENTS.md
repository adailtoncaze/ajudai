# AGENTS.md — Ajudaí

Aplicação web para **rifas beneficentes online**. O organizador cadastra a rifa (descrição, imagem, quantidade de números, preço). O comprador abre o link, escolhe um ou mais números, informa nome e sobrenome e paga por **Pix (QR Code estático)**. O organizador confirma os pagamentos **manualmente**.

## Documentos (leia na ordem)

1. `docs/PRD.md` — o quê e por quê (fluxos e regras de negócio).
2. `docs/SPEC.md` — como (stack, SQL, rotas, Pix, componentes).
3. `docs/TAREFAS.md` — lista de tarefas pequenas com critérios de aceite.
4. `docs/DESIGN.md` — design system (paleta, tipografia, componentes); toda nova tela deve segui-lo.

**Trabalhe em UMA tarefa por vez**, só a que o usuário pediu. Leia apenas as seções de `PRD.md`/`SPEC.md` indicadas na tarefa.

## Stack

- Next.js (App Router) + TypeScript (`strict`) + Tailwind CSS
- Supabase: Postgres, Auth (e-mail e senha), Storage
- Bibliotecas: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `qrcode`, `server-only`, `lucide-react`; testes com `vitest`
- Não adicione outras dependências sem pedir antes.

## Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção (deve passar sem erros)
npm run lint       # lint
npm test           # vitest
npm run check      # build + lint + test; se passarem, commita e faz push
```

`npm run check` commita apenas os arquivos declarados em `scripts/verify-and-push.mjs` e aceita uma mensagem personalizada após `--`.

## Estrutura de pastas

```
src/
  app/
    r/[slug]/page.tsx                      # página pública da rifa
    r/[slug]/reserva/[token]/page.tsx      # pagamento (QR Pix)
    entrar/page.tsx                        # login/cadastro do organizador
    painel/...                             # área do organizador (protegida)
    api/raffles/[slug]/reservations/route.ts
    api/raffles/[slug]/numbers/route.ts
    api/reservations/[token]/declare-paid/route.ts
  components/
  lib/
    pix.ts  format.ts  validation.ts  share.ts  slug.ts
    supabase/{server.ts,client.ts,admin.ts}
supabase/migrations/0001_init.sql
docs/
```

## Regras que nunca podem ser quebradas

1. **Dinheiro sempre em centavos (inteiro).** Só formatar como R$ na exibição.
2. **O servidor calcula o valor**: `total = quantidade de números × preço da rifa`. Nunca confie em valor vindo do navegador.
3. **A chave `SUPABASE_SERVICE_ROLE_KEY` só existe no servidor.** Arquivos que a usam começam com `import "server-only"`. Nunca importar em componente `"use client"`.
4. **Compradores não têm login.** Todo acesso de comprador passa por rotas do servidor (`/api/...` ou Server Components) usando o cliente admin. As tabelas não têm política para `anon`.
5. **Nunca selecionar colunas `pix_*` nas consultas da página pública da rifa.** A chave Pix só é lida na página de pagamento (`/r/[slug]/reserva/[token]`), no servidor.
6. **Dados pessoais do comprador** (nome completo, telefone) só aparecem para o dono da rifa. Publicamente, no máximo "Nome S." (ex.: "João S.").
7. **Não edite migrations já aplicadas.** Mudanças no banco entram em uma nova migration (`0002_...sql`).
8. **Validação com `zod` no servidor** em toda rota que recebe dados.
9. Textos da interface em **português do Brasil**. Datas e horas em `America/Sao_Paulo`.
10. Não invente regras de negócio. Se algo não estiver em `PRD.md` ou `SPEC.md`, pergunte.

## Convenções

- Componentes em PascalCase, arquivos de lib em kebab-case ou camelCase conforme a pasta.
- Server Components por padrão; `"use client"` só onde há interação.
- Em Next.js 15 ou superior, `params` e `searchParams` das páginas são **Promises** (`const { slug } = await params`). Confira a versão instalada.
- Mobile first. Acessibilidade conforme `PRD.md` (seção 8).
- Design system: use os tokens e as classes `ui-*` de `src/app/globals.css`, conforme `docs/DESIGN.md`. Não crie cores, raios ou sombras avulsas em telas novas.
- Mensagens de erro para o usuário em linguagem simples; detalhes técnicos só no log do servidor.

## Definição de pronto (para cada tarefa)

- `npm run build`, `npm run lint` e `npm test` passam.
- Todos os critérios de aceite da tarefa foram verificados.
- A tarefa foi marcada como `[x]` em `docs/TAREFAS.md`.
- Resumo curto do que foi feito e de qualquer decisão tomada.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
