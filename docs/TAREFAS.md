# TAREFAS — Rifa Solidária

## Como usar com o opencode

Para cada tarefa, abra uma sessão nova e use este pedido (troque `T03`):

```
Leia AGENTS.md. Depois leia apenas as seções de docs/PRD.md e docs/SPEC.md
indicadas na tarefa T03 de docs/TAREFAS.md.
Execute SOMENTE a tarefa T03. Ao terminar, rode os comandos de verificação,
marque a tarefa como [x] em docs/TAREFAS.md, resuma o que fez e pare.
```

Se a tarefa ficar grande demais, peça ao agente para dividi-la em passos menores e fazer um passo por vez. Faça um `git commit` ao fim de cada tarefa.

---

## [x] T01 — Projeto base

**Ler:** `AGENTS.md` (Stack e Estrutura); SPEC §1 e §4.

**Fazer**
1. Criar o projeto Next.js (App Router, TypeScript, Tailwind, ESLint, pasta `src/`).
2. Instalar: `@supabase/supabase-js @supabase/ssr zod qrcode server-only lucide-react` e, como dev, `vitest @types/qrcode`.
3. Adicionar o script `"test": "vitest run"` no `package.json`.
4. Criar `.env.example` (SPEC §1) e garantir `.env.local` no `.gitignore`.
5. Criar `src/lib/supabase/{server.ts,client.ts,admin.ts}` e `src/proxy.ts` conforme o SPEC §4 (no Next.js 16 a convenção é `proxy`, que substitui `middleware`; pode só atualizar a sessão).
6. Criar `src/lib/format.ts` (SPEC §7).
7. Página `/` simples (título, frase de apresentação, botões "Entrar" e "Criar minha rifa" levando a `/entrar`).
8. Em `layout.tsx`: `lang="pt-BR"` e `metadataBase`.

**Critérios de aceite**
- `npm run dev` abre a página `/` sem erros.
- `npm run build`, `npm run lint` e `npm test` passam (o teste pode ser um arquivo mínimo).
- `admin.ts` começa com `import "server-only"`.

---

## [x] T02 — Banco de dados

**Ler:** SPEC §2 e §3; PRD §6.

**Fazer**
1. Criar `supabase/migrations/0001_init.sql` com o SQL completo do SPEC §2 e §3 (copiar exatamente).
2. Aplicar no projeto Supabase (SQL Editor ou CLI) e registrar no `README.md` como aplicar.

**Critérios de aceite (verificar no SQL Editor, com uma rifa e um usuário de teste)**
- Reservar os números `{1,2}` com `create_reservation` funciona e devolve `R0001`; `total_cents` = 2 × `price_cents`.
- Reservar o número `2` de novo falha com `23505`, e nenhuma reserva nova é gravada.
- Reservar o número `0` ou maior que `total_numbers` falha com `invalid_number`.
- Reservar 51 números falha com `invalid_quantity`.
- Com `expires_at` vencido (ajuste manual) em uma reserva `pending`, `get_taken_numbers` não lista mais seus números e a reserva passa a `expired`.
- `declare_paid` numa reserva `expired` com números livres os reativa (`out_conflicts = 0`); se outro comprador pegou um dos números, `out_conflicts` = 1.
- Alterar `price_cents` depois da primeira reserva falha com `locked_fields`.
- Usuário autenticado que não é dono não consegue executar `owner_confirm_reservation` (`forbidden`).

---

## [x] T03 — Biblioteca Pix

**Ler:** SPEC §5 e §11.

**Fazer**
1. Criar `src/lib/pix.ts` com o código do SPEC §5 (copiar).
2. Criar `src/lib/pix.test.ts` conforme SPEC §11.

**Critérios de aceite**
- `npm test` passa, incluindo `crc16("123456789") === "29B1"` e os dois vetores completos de `buildPixPayload`.
- **Teste manual (feito pelo usuário):** gerar um QR Code com a chave Pix real (pode ser numa página temporária) e conferir no app do banco que nome, cidade e valor aparecem corretos.

---

## [x] T04 — Login do organizador

**Ler:** PRD §7.1; SPEC §4 e §6 (cabeçalho).

**Fazer**
1. Página `/entrar` somente com login (e-mail e senha, mínimo 8 caracteres). Sem auto-cadastro: a conta é criada pelo administrador no Supabase.
2. Botão "Sair" no painel.
3. Middleware: acesso a `/painel/*` sem sessão redireciona para `/entrar`; usuário logado em `/entrar` vai para `/painel`.
4. Página `/painel` provisória (mostra o e-mail do usuário).

**Critérios de aceite**
- Entrar, sair e entrar de novo funcionam com uma conta criada pelo administrador no Supabase.
- `/painel` sem login redireciona para `/entrar`.
- Erros (senha curta, e-mail inválido, senha errada) aparecem em português, perto do campo, com `aria-live`.
- Campos com `label` visível e foco visível.

**Decisão:** auto-cadastro removido a pedido; contas e senhas são criadas pelo administrador no Supabase.

---

## [x] T05 — Cadastro e edição de rifas

**Ler:** PRD §7.2, §7.3, RN03, RN12; SPEC §3, §7 (Slug e Formatação), §9 (Criar, Editar, Encerrar).

**Fazer**
1. `src/lib/slug.ts` e `src/lib/validation.ts` (schema da rifa com os limites do banco).
2. Formulário `/painel/rifas/nova` com todos os campos do PRD §7.2; preço digitado em reais e convertido para centavos; chave Pix validada com `normalizePixKey`.
3. Upload da imagem para o bucket `raffle-images` (SPEC §3) com validação de tipo e tamanho e pré-visualização.
4. Server Actions de criar, editar e encerrar (SPEC §9).
5. `/painel` lista as rifas do organizador (título, status, link público com botão copiar).
6. `/painel/rifas/[id]/editar`: bloquear (desabilitar) quantidade e preço quando já houver reservas.

**Critérios de aceite**
- Criar uma rifa gera `slug` e mostra o link `/r/{slug}` com botão copiar.
- Imagem acima de 2 MB ou de tipo inválido é recusada com mensagem clara.
- Chave Pix inválida é recusada. CPF e telefone com pontuação são aceitos e gravados normalizados.
- Um organizador não enxerga rifas de outro (testar com duas contas).
- Quantidade acima de 1000 ou preço zero são recusados.

---

## [x] T06 — Página pública da rifa (leitura)

**Ler:** PRD §7.5, RN10; SPEC §4 (Leitura pública), §6 (`GET numbers`), §7 (Grade), §8.

**Fazer**
1. `src/lib/raffles.ts` com `getPublicRaffle(slug)` (sem colunas `pix_*`).
2. Rota `GET /api/raffles/[slug]/numbers`.
3. Página `/r/[slug]`: imagem, título, organizador, descrição (`white-space: pre-line`), preço por número, barra de progresso ("X de Y números já reservados"), legenda, grade (`NumberGrid`, ainda só exibindo e selecionando), aviso no rodapé.
4. `generateMetadata` com Open Graph (SPEC §8) e `ShareButtons` + `src/lib/share.ts`.
5. Atualização automática da grade a cada 15 s e ao voltar para a aba.
6. Estados: rifa inexistente (404), encerrada (mensagem, grade desabilitada) e sorteada (resultado, RN15, `getPublicWinner`).

**Critérios de aceite**
- A grade mostra livres, reservados e pagos com aparência diferente **sem depender só de cor** e com `aria-label` por número.
- A seleção de vários números funciona por toque e por teclado (Tab, Enter/Espaço).
- Ao colar o link no WhatsApp ou em um validador de Open Graph, aparecem título, descrição e imagem.
- O HTML da página pública não contém `pix_key`, `pix_receiver_name` nem `pix_city`.
- Botões de compartilhar funcionam; "Copiar link" mostra confirmação.
- `npm run build` passa.

---

## [x] T07 — Reservar números

**Ler:** PRD §5.2, RN01–RN04, RN16; SPEC §6 (`POST reservations`), §7 (BuyerForm, SelectionBar), §10.

**Fazer**
1. Rota `POST /api/raffles/[slug]/reservations` conforme SPEC §6 (isca, zod, `ipHash`, `create_reservation`, mapeamento de erros).
2. `SelectionBar` fixa no rodapé: "N números · R$ total · Continuar" (aparece quando há seleção).
3. `BuyerForm` (nome, sobrenome, WhatsApp obrigatório para contato do organizador, campo isca) em um painel/modal acessível (foco no primeiro campo, `Esc` fecha, foco volta ao botão).
4. Em sucesso: gravar o token em `localStorage` e navegar para `/r/[slug]/reserva/[token]`.
5. Em `409 number_taken`: atualizar a grade, desmarcar os números indisponíveis e mostrar a mensagem do PRD §9.
6. Na página pública, se houver token em `localStorage` para o `slug`, mostrar aviso "Você tem uma reserva em andamento — ver pagamento".

**Critérios de aceite**
- Reservar 2 números cria **uma** reserva com valor correto (conferir no banco).
- Dois navegadores tentando o mesmo número ao mesmo tempo: só um consegue; o outro vê a mensagem e a grade atualizada.
- A tentativa de enviar um valor ou total pela requisição é ignorada (o servidor calcula).
- Nome com 1 letra e WhatsApp ausente ou inválido são recusados com mensagem junto ao campo.
- O WhatsApp do comprador não aparece em nenhuma página pública; só no painel do organizador.
- A sexta reserva `pending` da mesma origem recebe `429` e a mensagem do PRD §9.

---

## [x] T08 — Pagamento por Pix e "Já paguei"

**Ler:** PRD §7.6, RN05–RN07, RN13; SPEC §5 (QR Code), §6 (`declare-paid`), §7 (PixPayment).

**Fazer**
1. Página `/r/[slug]/reserva/[token]` (Server Component): buscar a reserva pelo token com `supabaseAdmin()`; só aqui ler `pix_*` da rifa; montar o payload com `txid = código da reserva`; gerar o QR Code.
2. Exibir conforme o status (PRD §7.6): `pending`, `declared_paid`, `confirmed`, `expired`, `released`.
3. `PixPayment` (client): QR Code, valor, números, validade, **copia e cola** com botão copiar e aviso "Código Pix copiado!" (`aria-live`), botão **"Já paguei"**.
4. Rota `POST /api/reservations/[token]/declare-paid` (SPEC §6). Ao concluir, atualizar a página para o estado `declared_paid`.
5. Se `conflicts > 0` na resposta, mostrar: "Alguns números desta reserva já foram reservados por outra pessoa. O organizador entrará em contato."

**Critérios de aceite**
- O valor do QR Code é igual a (quantidade × preço) e o app do banco lê o QR corretamente.
- Reabrir o link da reserva mostra o mesmo QR Code (reserva `pending`).
- Tocar em "Já paguei" muda o estado para `declared_paid`, some o QR Code e aparece a mensagem de agradecimento; tocar de novo não causa erro (idempotente).
- Reserva `expired` não mostra QR Code, mas mostra "Já paguei" e o link para a rifa.
- Token inexistente ou não UUID mostra página "Reserva não encontrada" (sem vazar informação).
- O QR Code tem `alt` descritivo e o copia e cola está sempre visível.

---

## [x] T09 — Painel de reservas do organizador

**Ler:** PRD §7.4, RN05–RN09; SPEC §9.

**Fazer**
1. `/painel/rifas/[id]` com: resumo (pagos, reservados, livres, arrecadação confirmada, a conferir), botões copiar link e compartilhar, editar, encerrar.
2. `ReservationsTable` com as quatro abas, busca por nome ou código, ordenação conforme SPEC §9 e selo de **conflito**.
3. Server Actions: confirmar, liberar (com diálogo "Tem certeza?"), confirmar em lote (seleção múltipla).
4. Chamar `expire_stale_reservations` antes de listar.
5. Tratar erro `23505` ao confirmar com a mensagem do SPEC §9.

**Critérios de aceite**
- A aba "Já paguei" abre por padrão e mostra as mais antigas primeiro.
- Confirmar muda a reserva para "Confirmadas" e os números ficam **Pago** na página pública.
- Liberar devolve os números à grade pública.
- Confirmar 3 reservas em lote funciona e informa o resultado.
- Reserva `expired` com número tomado por outra pessoa: confirmar mostra a mensagem de conflito e liberar funciona.
- Outro organizador não consegue ver nem alterar estas reservas (testar com duas contas).
- A tabela é utilizável no celular (rolagem horizontal ou cartões) e pelo teclado.

---

## [x] T10 — Sorteio

**Ler:** PRD RN14, RN15; SPEC §9 (Sorteio e Vencedor público).

**Fazer**
1. No painel, botão "Sorteio" abre diálogo com duas opções: **sortear entre números pagos** ou **informar o número vencedor**; confirmação antes de executar.
2. Chamar `owner_draw` e mostrar ao organizador: número, nome completo, telefone e código da reserva.
3. Na página pública: bloco "Resultado" com o número e o vencedor no formato "Nome S." (ou o texto de RN15).

**Critérios de aceite**
- O sorteio aleatório só escolhe números de reservas `confirmed`.
- Sem nenhum número pago, aparece a mensagem "Ainda não há números pagos para sortear."
- Informar um número fora do intervalo é recusado.
- Um segundo sorteio na mesma rifa é recusado (`already_drawn`).
- Depois do sorteio a rifa fica encerrada para novas reservas.
- A página pública não mostra nome completo nem telefone do vencedor.

---

## [x] T11 — Acessibilidade, privacidade e acabamento

**Ler:** PRD §8, §9, §10.

**Fazer**
1. Revisar todas as telas: contraste (≥ 4,5:1), foco visível, `label` em todos os campos, mensagens de erro ligadas aos campos, `aria-live` nos avisos, alvos de toque ≥ 44 px, `prefers-reduced-motion`.
2. Página `/privacidade` (o que é coletado, para quê, quem vê, como pedir remoção) e link no rodapé de todas as páginas.
3. Aviso legal no rodapé da rifa (PRD §9).
4. Estados de carregamento e de erro amigáveis (`loading.tsx`, `error.tsx`, `not-found.tsx`).
5. Favicon e título padrão.

**Critérios de aceite**
- Navegação completa por teclado (login, criar rifa, comprar, pagar, painel).
- Lighthouse (Acessibilidade) ≥ 90 em `/r/[slug]` e na página de pagamento.
- Funciona bem em 360 px de largura, sem rolagem horizontal da página.

---

## [ ] T12 — Publicação

**Ler:** SPEC §1 e §10.

**Fazer**
1. Criar o projeto no Supabase de produção e aplicar a migration.
2. Configurar autenticação (URL do site, regra de confirmação de e-mail) no Supabase.
3. Publicar na Vercel com as variáveis de ambiente (SPEC §1) e `NEXT_PUBLIC_SITE_URL` com o domínio final.
4. Escrever no `README.md`: como rodar localmente, variáveis e como aplicar migrations.

**Critérios de aceite (teste de ponta a ponta em produção)**
- Entrar com conta criada pelo administrador → criar rifa → abrir o link em outro aparelho → reservar 2 números → ver QR Code → pagar um valor simbólico → tocar em "Já paguei" → confirmar no painel → número aparece como Pago.
- A prévia do link aparece correta no WhatsApp.
- `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum arquivo enviado ao navegador (conferir no código-fonte da página).

---

## [ ] T13 (opcional) — Exportar CSV

**Fazer:** botão no painel que baixa um CSV com as reservas confirmadas (código, nome, sobrenome, telefone, números, valor, data da confirmação).

**Critérios de aceite:** o arquivo abre corretamente no Excel/LibreOffice com acentos (UTF-8 com BOM) e contém só reservas da rifa do organizador logado.

---

## [x] T14 — Design system (tema da referência UX/UI)

**Ler:** `AGENTS.md`; `docs/PRD.md` §8; `docs/DESIGN.md`.

**Fazer**
1. Definir tokens de cor, tipografia, raio e sombra no `src/app/globals.css` (Tailwind v4 CSS-first), inspirados na referência [Landing Page UX/UI — Rifa](https://www.behance.net/gallery/187038003/Landing-Page-UXUI-Rifa).
2. Criar as classes semânticas `ui-*` (container, card, botões, campos, selos, avisos) com foco visível, estados e contraste acessíveis.
3. Aplicar o tema nas telas existentes: `/`, `/entrar`, `/painel`, `/painel/rifas/nova`, `/painel/rifas/[id]/editar` e componentes compartilhados.
4. Registrar as regras em `docs/DESIGN.md` e referenciá-las em `AGENTS.md` para que toda tela nova siga o tema.

**Critérios de aceite**
- Nenhuma tela usa cores utilitárias avulsas (`emerald-*`, `zinc-*`, `red-*`); todas usam tokens/classes semânticas.
- `docs/DESIGN.md` documenta paleta, tipografia, componentes e checklist de nova tela.
- Telas existentes mantêm labels, `aria-live`, foco visível, alvos de 44 px e `prefers-reduced-motion`.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T15 — Layout dashboard e fundo cinza

**Ler:** `docs/DESIGN.md` §1, §2 e §3.

**Fazer**
1. Substituir o fundo rosado (`#FFF6F2`) por cinza claro (`#F3F5F7`), ajustando superfícies, bordas e texto auxiliar para manter contraste AA.
2. Criar `src/app/painel/layout.tsx` com a casca do dashboard: barra lateral com navegação, topbar e área de conteúdo dinâmico (`{children}`).
3. Tornar a barra lateral um drawer no mobile (botão com `aria-expanded`, overlay e fechar com `Esc`) e sticky no desktop.
4. Mover a ação de sair para `src/app/painel/actions.ts` e exibi-la no rodapé da barra lateral.
5. Registrar o padrão em `docs/DESIGN.md`.

**Critérios de aceite**
- Rotas `/painel`, `/painel/rifas/nova` e `/painel/rifas/[id]/editar` compartilham a mesma barra lateral; só o conteúdo muda.
- Link ativo com `aria-current="page"`; navegação por teclado e foco visível preservados.
- Contraste AA no novo fundo (texto laranja usa `brand-800`).
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T16 — Formulário e lista sem cartões brancos

**Ler:** `docs/DESIGN.md` §2 e §3.

**Fazer**
1. Substituir o `ui-card` do formulário de rifas por seções numeradas (`ui-form-section`) com divisórias e ações agrupadas em `ui-form-actions`.
2. Substituir os cartões da lista de rifas por linhas (`ui-rifa-list`/`ui-rifa-row`) com índice, slug, mini barra de progresso, indicadores e ações alinhadas.
3. Ajustar o bloco de "Encerrar rifa" e o estado vazio para a mesma linguagem visual.
4. Registrar os novos padrões em `docs/DESIGN.md`.

**Critérios de aceite**
- Não há fundo branco envolvendo o formulário de cadastro/edição nem os itens da lista de rifas.
- Hierarquia visual mantém título, status, valores e ações legíveis em 360 px.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T17 — Ajustes de cabeçalho e rodapé do dashboard

**Fazer**
1. Separar o link "Voltar ao painel" do rótulo das páginas "Nova rifa"/"Editar rifa" (ambos eram `inline-flex` e ficavam na mesma linha).
2. Fixar o rodapé da barra lateral (e-mail + "Sair") na base, com a linha divisória, deixando a navegação ocupar o espaço restante.

**Critérios de aceite**
- "Voltar ao painel" aparece acima do rótulo da página, com espaçamento visível.
- O rodapé da barra lateral permanece na base mesmo com poucos itens de menu.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T18 — Logo única e menu enxuto

**Fazer**
1. Criar `src/components/logo.tsx` com o bilhete de rifa (SVG com os tokens do tema) e usá-la no estado vazio da lista e ao lado de "Rifa Solidária" na barra lateral.
2. Remover "Nova rifa" do menu lateral, mantendo apenas o botão existente na página "Minhas rifas".

**Critérios de aceite**
- Mesma marca nos dois pontos; nenhum ícone avulso no lugar da logo.
- Menu lateral mostra somente "Minhas rifas".
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T19 — Redirecionar após salvar com aviso de sucesso

**Fazer**
1. Fazer `criarRifa` e `editarRifa` redirecionarem para `/painel?saved=create|edit&slug=...` após revalidar as rotas.
2. Exibir `PainelFlash` no topo de "Minhas rifas", com mensagem adequada e link para a rifa (slug validado por regex).
3. Remover o aviso de sucesso antigo que ficava dentro do formulário, já que a página é trocada.

**Critérios de aceite**
- Salvar criação ou edição leva ao painel, sem deixar o usuário na página do formulário.
- O painel mostra "Rifa criada com sucesso!" ou "Alterações salvas." com `role="status"`.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T20 — Excluir rifa

**Regra definida com o usuário:** excluir somente rifas **sem reservas**; remover também a imagem do Storage; ação disponível na lista e na edição.

**Fazer**
1. Criar `excluirRifa` em `src/app/painel/actions.ts`: valida UUID e dono, bloqueia se houver reservas, apaga a rifa, remove a imagem do bucket `raffle-images` e redireciona com feedback.
2. Adicionar `raffleImageStoragePath` e testes para converter a URL pública no caminho do Storage sem aceitar outro dono/bucket.
3. Criar `ExcluirRifaButton` com modal `ui-dialog` de confirmação; exibir na linha de "Minhas rifas" e em "Editar rifa" apenas quando não houver reservas.
4. Estender `PainelFlash` com `saved=delete` e `erro=reservas|exclusao`; documentar em `docs/DESIGN.md`.

**Critérios de aceite**
- Rifas com qualquer reserva não mostram o botão e são bloqueadas também no servidor.
- A imagem da rifa é removida do Storage junto com o registro.
- Após excluir, o usuário volta ao painel e vê "Rifa excluída com sucesso."
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T21 — Centralizar modal de exclusão

**Fazer**
1. Anular o `margin: 0` do reset do Tailwind em `.ui-dialog` com `position: fixed`, `inset: 0` e `margin: auto`.
2. Aumentar o padding interno para 2 rem e limitar a altura com scroll em telas pequenas.

**Critérios de aceite**
- O modal abre centralizado na tela, inclusive no mobile.
- Texto e botões têm espaçamento visível nas bordas do modal.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T22 — Cursor, logout e CTA da landing

**Fazer**
1. Adicionar regra base de `cursor: pointer` para botões, links, `[role="button"]`, `summary` e `label[for]`, preservando `not-allowed` em desabilitados.
2. Fazer `sair` redirecionar para `/` após o signOut.
3. Na landing, substituir o CTA fixo por `BotaoCriarRifaAutenticado` (vai a `/painel` com sessão, `/entrar` sem sessão) e remover o botão "Já sou organizador".

**Critérios de aceite**
- Ao passar o mouse sobre "Sair" e qualquer outro botão/link, o cursor vira mão.
- Logout leva à página inicial.
- "Criar minha rifa" leva ao painel quando logado e a `/entrar` quando não logado; não há mais "Já sou organizador".
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T23 — Topbar/rodapé fixos e paginação no painel

**Fazer**
1. No dashboard, manter a topbar e o rodapé comum fixos na viewport; só `.ui-dashboard-content` rola.
2. Criar `Pagination` (`src/components/pagination.tsx`) com 10 itens por página; manter a constante em `src/lib/pagination.ts` para uso em Server Components.
3. Paginar "Minhas rifas" no servidor (`?pagina=N`, `count` + `range`) e as reservas por aba/busca no cliente.
4. Deixar os controles sem borda e com o indicador da página alinhado a "anterior"/"próxima".
5. Registrar os padrões em `docs/DESIGN.md`.

**Critérios de aceite**
- Ao rolar o painel, a barra "Gerencie suas rifas e pagamentos em um só lugar." e o rodapé permanecem visíveis.
- Listas de rifas e de reservas mostram no máximo 10 itens por página, com controles anterior/próxima e páginas numeradas.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T24 — Liberar rolagem ao sair do painel

**Fazer**
1. Substituir `body:has(.ui-dashboard)` por uma classe `ui-body-panel` aplicada por `BodyScrollMode` montado no layout do painel (add no mount, remove no unmount).
2. Manter o travamento enquanto o painel estiver montado, sem `usePathname()` no layout raiz — isso evita o limite de Suspense que quebra rotas dinâmicas com Cache Components.
3. Fazer o botão "Abrir rifa" usar `target="_blank"` (com `rel="noopener noreferrer"`) para preservar o painel aberto.

**Critérios de aceite**
- "Abrir rifa" abre a página pública em nova aba; o painel permanece aberto.
- A página pública na nova aba rola normalmente sem precisar recarregar.
- O painel continua com topbar/rodapé fixos e rolagem apenas em `.ui-dashboard-content`.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T25 — Reduzir botões de compartilhamento da rifa

**Fazer**
1. Manter apenas WhatsApp, Instagram, Facebook e Copiar link, nessa ordem, na página pública da rifa.
2. Remover o botão "Compartilhar" nativo (`navigator.share`), X e Telegram.
3. Como o Instagram não tem URL de compartilhamento com link pré-preenchido, o botão copia o link e abre o Instagram para colar no story/Direct, com aviso `role="status"`.

**Decisão:** a lista pedida pelo usuário substitui a do PRD §4 / SPEC §8, que ainda citam X, Telegram e compartilhamento nativo. Esses documentos não foram alterados nesta tarefa.

**Critérios de aceite**
- A página pública mostra exatamente quatro botões, na ordem: WhatsApp, Instagram, Facebook, Copiar link.
- "Copiar link" continua exibindo a confirmação "Copiado!".
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T26 — Cards de compartilhamento por rede social

**Fazer**
1. Centralizar o grupo de botões e adicionar ícones: WhatsApp (`MessageCircle`), Instagram (`Camera`), Facebook (`ThumbsUp`) e Copiar link (`Link2`/`Copy` → `Check`).
2. Criar o endpoint `GET /api/raffles/[slug]/share-card` com `ImageResponse`, gerando cards com imagem principal, prêmio (imagem/título), título, descrição curta e preço; variantes horizontais (1200×630, WhatsApp/Facebook) e verticais (1080×1350 feed e 1080×1920 story, Instagram).
3. Apontar `og:image`/`twitter:image` da rifa para o card gerado, para que o preview em WhatsApp e Facebook use o card; Manter imagem da rifa e do prêmio como imagens adicionais.
4. Abrir um modal com prévia do card ao clicar em uma rede: WhatsApp/Facebook oferecem abrir a rede e baixar o card; Instagram oferece copiar a imagem (com fallback para download) e formatos feed/story.
5. Extrair helpers puros (`src/lib/share-card.ts`, `src/lib/share.ts`, `src/lib/clipboard.ts`) e cobrir com testes, incluindo um teste de renderização das quatro variantes.

**Decisão:** Instagram não aceita URL com texto/link pré-preenchido nem lê o `og:image` de um link colado; por isso o card é entregue como PNG para copiar/colar no feed ou story. WhatsApp e Facebook usam o card gerado como preview Open Graph.

**Critérios de aceite**
- Os quatro botões ficam centralizados e com ícones coerentes.
- Ao clicar em cada rede, o modal mostra um card com imagem principal, prêmio, título e breve descrição, no formato adequado à rede.
- O card gerado é usado como `og:image` da página pública da rifa.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T27 — Refinar cards e ícones de compartilhamento

**Fazer**
1. Aumentar a descrição dos cards (230 caracteres no horizontal, 300 no feed e 420 no story) e da mensagem do WhatsApp (240), ajustando tamanhos de fonte e espaçamento para caber em cada formato.
2. Substituir os ícones genéricos por SVG dos logotipos oficiais de WhatsApp, Instagram (gradiente) e Facebook, embutidos em `src/components/social-icons.tsx` (sem nova dependência).
3. Remover a quantidade de números do card e dos dados passados ao gerador: a tag de preço agora mostra somente `R$ ...`.
4. Destacar o valor com uma tag em laranja da marca, moldura branca, fonte maior e cantos arredondados.

**Critérios de aceite**
- Os botões mostram os logotipos originais das redes sociais.
- A descrição do card traz mais texto que na versão anterior.
- O card exibe apenas o valor, sem "por número" nem quantidade de números.
- O valor aparece em uma tag chamativa.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T28 — Compartilhamento completo no WhatsApp

**Fazer**
1. Trocar a ação do WhatsApp por "Copiar card e abrir WhatsApp": o link `wa.me` continua levando texto e link, e o PNG do card é copiado para a área de transferência (com fallback para download) para ser anexado à conversa.
2. Deixar a prévia do card clicável e adicionar o link "Abrir página da rifa" no modal, para o usuário abrir a rifa a partir do card/share.
3. Atualizar as instruções do modal para explicar que o texto/link vão preparados e que a imagem deve ser colada na conversa.

**Decisão:** `wa.me` não permite anexar arquivos por URL. O card gerado também é o `og:image` da rifa, então o link compartilhado mostra a prévia rica; cópiamos o PNG para o usuário anexar quando quiser enviar a imagem como mídia.

**Critérios de aceite**
- Ao compartilhar no WhatsApp, o usuário recebe o texto/link e tem o card disponível para colar/anexar.
- O card e o link "Abrir página da rifa" abrem a página pública da rifa.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T29 — Enviar o card como imagem no WhatsApp

**Fazer**
1. Remover o link da prévia do card dentro do modal: a imagem na página da rifa não é clicável.
2. Trocar a ação do WhatsApp por "Compartilhar no WhatsApp": gera o PNG, usa `navigator.canShare`/`navigator.share` com `files` para enviar a imagem como mídia, com `title`, `text` e `url` da rifa.
3. Manter o link da rifa na legenda para que quem receber a imagem no WhatsApp possa tocar no link e abrir a página.
4. Manter fallback para navegadores sem compartilhamento de arquivo: abre `wa.me` com texto/link e copia ou salva o PNG para anexar manualmente.
5. Pré-carregar o PNG ao abrir o modal para não perder o gesto do usuário exigido pelo share nativo.

**Decisão:** um PNG enviado como mídia não é clicável por si só no WhatsApp; o que abre a rifa é o link incluído na legenda. Quando o navegador não suporta `share` com arquivo, o envio da imagem passa a ser manual.

**Critérios de aceite**
- O card exibido no modal da rifa não é clicável.
- Um clique em "Compartilhar no WhatsApp" abre o compartilhamento do sistema com a imagem do card e a legenda contendo o link.
- Quem receber a imagem no WhatsApp encontra o link da rifa na legenda.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T30 — Corrigir o compartilhamento no WhatsApp

**Fazer**
1. Enviar apenas a URL da rifa no `wa.me`, sem texto, para que o WhatsApp gere a prévia rica (og:image) com o card, o título e a descrição.
2. Simplificar os botões do modal: apenas "Compartilhar" e "Baixar card" (no Instagram, "Copiar imagem" e "Baixar card").
3. Remover o compartilhamento nativo com arquivo (`navigator.share`/`canShare`), que não anexava a imagem no WhatsApp.
4. Acrescentar um parâmetro único (`?wa=<timestamp>`) à URL compartilhada para forçar o WhatsApp a gerar uma nova prévia.
5. Cobrir com testes o texto vazio em `shareLinks` e o helper `whatsappShareLink`.

**Decisão:** uma imagem enviada como mídia no WhatsApp não é clicável. A prévia do link (card gerado como `og:image`) é que permite tocar no card e abrir a rifa. A URL precisa ser pública e `NEXT_PUBLIC_SITE_URL` precisa apontar para o domínio de produção; se o WhatsApp já tiver cacheado a página sem o card, é preciso atualizar o cache do preview.

**Critérios de aceite**
- O link do WhatsApp contém somente a URL da rifa.
- O modal mostra apenas os botões de compartilhar e baixar card.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T31 — Imagem do card com link clicável na legenda

**Fazer**
1. Enviar o PNG do card como mídia via `navigator.share` com `files` quando o navegador permitir; a legenda traz título, descrição, prêmio, valor e a chamada "👉 Clique aqui para ajudar e participar: <URL>".
2. Manter o fallback `wa.me` para navegadores sem compartilhamento de arquivo: abre a conversa com a legenda e o link clicável, e copia ou salva o PNG para anexar manualmente.
3. Manter apenas os botões "Compartilhar" e "Baixar card" no modal e atualizar as instruções para explicar que a imagem vai junto e o link fica abaixo dela.
4. Extrair `legendaCard`, `textoComLink` e `whatsappShareLink` para `src/lib/share.ts` e cobrir com testes.

**Decisão:** uma imagem PNG não é clicável no WhatsApp. A solução é enviar a imagem como mídia e colocar a URL clicável na legenda, logo abaixo dela, precedida de uma chamada para ação. No desktop, onde navegadores geralmente não anexam arquivo pelo `navigator.share`, o fallback abre o `wa.me` com a legenda/link e deixa o PNG copiado ou salvo para anexo manual.

**Critérios de aceite**
- A mensagem compartilhada contém a imagem do card e o link clicável na legenda.
- A legenda usa uma chamada para ação antes da URL.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T32 — Ajustar detecção de compartilhamento de arquivo

**Fazer**
1. Validar `navigator.canShare` com o PNG real do card, em vez de um arquivo de teste vazio.
2. Tentar `navigator.share` sempre que disponível, com fallback para `wa.me` quando o arquivo não for aceito.
3. Deixar o aviso explícito no fallback: o WhatsApp não anexa imagem automaticamente pelo link, o card foi copiado/salvo para anexo manual.
4. Atualizar a instrução do modal para diferenciar celular e computador.

**Decisão:** em desktop/localhost, `wa.me` envia apenas texto por limitação do WhatsApp — não é possível anexar arquivo por URL. O anexo automático depende do compartilhamento nativo com `files`, disponível em navegadores móveis com HTTPS.

**Critérios de aceite**
- O compartilhamento nativo é tentado com o PNG real.
- O aviso do fallback orienta a anexar o card manualmente.
- `npm run build`, `npm run lint` e `npm test` passam.

---

## [x] T33 — Card vertical e legenda enxuta no WhatsApp

**Fazer**
1. Manter o card do WhatsApp vertical (1080x1920) e reduzir a imagem do topo para 780px, liberando espaço para texto e prêmio.
2. Aumentar a fonte da descrição para 40px e a imagem do prêmio para 180px apenas no card do WhatsApp.
3. Enviar no compartilhamento nativo o PNG como arquivo, a legenda “Clique aqui para ajudar!” e a URL com `?wa=<timestamp>`. Com imagem anexada, o WhatsApp usa essa legenda como texto e a URL como link clicável.
4. Fazer a página reconhecer o parâmetro `wa` e gerar a prévia com o card vertical e o título “Clique aqui para ajudar!” quando o link vier do WhatsApp.
5. Derivar a URL pública de `NEXT_PUBLIC_SITE_URL`, `NEXT_SITE_URL` ou `VERCEL_URL`, e usar o host da requisição como último recurso, corrigindo os links gerados na Vercel.
6. Manter CTA e URL no fallback `wa.me` (necessário quando não há Web Share) e atualizar as instruções/avisos do modal.
7. Cobrir com testes a configuração do card, a fonte/prêmio maiores e o payload nativo sem legenda.

**Decisão:** o WhatsApp não permite anexar imagem e, ao mesmo tempo, esconder a URL mantendo o link clicável. Com `files` + `url`, a URL aparece como texto; sem `files`, o card vira prévia clicável mas não é enviado como mídia. Após validação no celular, optou-se por priorizar imagem + link funcional: a legenda traz o CTA e a URL visível (clicável).

**Critérios de aceite**
- O card do WhatsApp é vertical (1080x1920), com descrição em 40px e imagem do prêmio em 180px.
- No celular, a mensagem traz o card vertical como imagem e a legenda “Clique aqui para ajudar!” seguida da URL clicável.
- Os links gerados na Vercel usam o domínio hospedado, não localhost.
- No fallback `wa.me`, CTA e URL continuam presentes para abrir a rifa.
- `npm run build`, `npm run lint` e `npm test` passam.
