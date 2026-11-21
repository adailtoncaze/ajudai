# DESIGN SYSTEM — Ajudaí

Fonte de referência: [Landing Page UX/UI — Rifa](https://www.behance.net/gallery/187038003/Landing-Page-UXUI-Rifa), Daniel Mota (dezembro de 2023). A arte foi usada como direção visual: paleta alegre e confiável, superfícies arredondadas, bilhete/números como elemento gráfico central e chamadas de ação bem evidentes. As cores da arte foram mantidas; o fundo rosado foi substituído por **cinza claro** e a área autenticada passou a usar um **dashboard com barra lateral**, conforme decisão de produto.

**Este documento é a fonte da verdade do tema.** Toda tela nova (incluindo as tarefas T06 a T11 de `TAREFAS.md`) deve usar os tokens e as classes semânticas definidos aqui. Não crie cores, raios ou sombras avulsas em componentes.

---

## 1. Tokens

Os tokens vivem em `src/app/globals.css` dentro de `@theme` (Tailwind CSS v4, CSS-first). Eles geram utilitários como `bg-brand-600`, `text-ink-700`, `border-line` etc.

### Paleta (hex extraídos da referência)

| Token | Hex | Papel | Contraste |
|---|---|---|---|
| `brand-600` | `#F04E23` | Laranja da marca: preenchimentos grandes, faixas, detalhes. **Não usar como cor de texto pequeno.** | 3,6:1 no branco (decorativo) |
| `brand-700` | `#D6411A` | Laranja de texto e fundo de botão primário (hover: `brand-800` `#B23514`). | 4,5:1 no branco / 4,2:1 no cinza — para texto use `brand-800` |
| `brand-800` | `#B23514` | Texto de links e hovering do primário. | 6,2:1 no branco |
| `brand-50/100/200` | `#FFF1EC` / `#FFE0D5` / `#FFC2AD` | Tintas suaves: fundo de selos, hover de botões secundários, brilhos. | — |
| `accent-500` | `#3EDA94` | Verde-menta de acento: barras de progresso, ícones grandes, faixas. **Não usar como fundo de texto pequeno branco.** | 1,8:1 no branco (decorativo) |
| `accent-700` | `#1B744E` | Texto sobre fundo menta claro. | 5,8:1 no branco |
| `success-700` | `#1B744E` | Números pagos e confirmações (mesmo verde, papel semântico). | 5,8:1 no branco |
| `canvas` | `#F3F5F7` | Fundo de todas as páginas (cinza claro). | — |
| `surface` / `surface-muted` | `#FFFFFF` / `#E9EDF1` | Cartões e superfícies secundárias. | — |
| `ink-900` | `#321C0F` | Texto principal e títulos (marrom-espresso). | 16:1 no branco |
| `ink-600` | `#75543F` | Texto de corpo e apoio. | 6,8:1 no branco / 6,2:1 no cinza |
| `ink-500` | `#7E604A` | Texto auxiliar pequeno. | 5,7:1 no branco / 5,2:1 no cinza |
| `line` / `line-soft` | `#7C8791` / `#DCE1E6` | Bordas de controles (3,7:1 no branco) e bordas suaves de cartões. | — |
| `warning-100/700` | `#FFEDBF` / `#8A5B00` | Selo "Encerrada". | — |
| `danger-600/700` | `#B3261E` / `#8E1D17` | Ações destrutivas e mensagens de erro. | — |

Regra de contraste: **texto pequeno branco só sobre `brand-700`, `brand-800`, `success-700`, `accent-700` ou `danger-700`.** As variantes 500/600 são exclusivamente decorativas (ícones grandes, faixas, preenchimentos de bilhete). **Texto laranja sobre o fundo cinza usa `brand-800`** (`brand-700` fica em 4,2:1 no canvas, abaixo de AA).

A referência também usa azul-marinho/roxo (`#181830` / `#A8A8F0`) em uma seção escura de mockups; ele não entra no tema base para manter a coerência com a paleta laranja + menta + marrom sobre neutros frios.

### Tipografia

- Fonte: Geist (variável `--font-geist-sans`) para textos; Geist Mono para códigos e valores monospace. A família usada na arte de referência não é identificável a partir dos quadros publicados; Geist foi escolhida por ser a fonte do projeto e por ter peso/presença semelhantes.
- Títulos: `font-extrabold`, `tracking-tight`, `text-balance` quando houver quebra.
- Escala mobile first: `text-sm`/14 px (detalhes e rótulos), `text-base`/16 px (corpo), `text-lg`/18 px (destaque), `text-3xl`/`text-4xl` (títulos de página), `sm:text-5xl` (hero). Corpo em 16 px evita o zoom automático do iOS em campos.
- Para texto corrido use `ui-text` (16 px) e `ui-caption` (14 px) em vez de repetir `text-sm leading-relaxed text-ink-600`.
- Nunca use `uppercase` em textos longos; reserve para `ui-eyebrow` e rótulos curtos.
- Alvos de toque: mínimo de 44 px (`min-h-11`); botões e campos seguem esse mínimo.

### Marca (logo)

- Componente único: `src/components/logo.tsx` — SVG da marca **Ajudaí**: bilhete de rifa com coração e o nome ao lado. O bilhete usa `brand-600` / `accent-500`, os detalhes em `surface` e a wordmark em `ink-900`.
- `size` define a **altura** em px; a largura é arredondada para um pixel inteiro para evitar serrilhado em telas 1x, mantendo a proporção 431:104. Usar na barra lateral (32 px), no rodapé e nas páginas (28 a 40 px) e nos estados vazios (48 a 56 px). Não inventar outro ícone para representar a marca.
- O menu lateral contém apenas "Minhas rifas"; a action "Nova rifa" fica no botão da página, não no menu.

### Formas e profundidade

- Cantos: `--radius-card` (1,5 rem — superfícies) e `--radius-control` (0,9 rem — botões/campos).
- Sombra: `--shadow-soft` para cartões e `--shadow-lift` para elementos que "flutuam" (ex.: selo de pagamento confirmado).
- Espaçamento: múltiplos de 4 px (`p-4`, `p-6`, `gap-3`, `gap-5`). Container: `.ui-container`.
- Raios, sombras e espaçamentos são **decisões de implementação inspiradas na arte** (a referência publicada não permite medi-los com exatidão); as cores e a hierarquia visual, sim, foram extraídas dos quadros.

---

## 2. Classes semânticas

Use SEMPRE que o elemento se repetir entre telas. Elas já incluem foco visível, contraste e estados hover/disabled.

| Classe | Uso |
|---|---|
| `ui-app` | Raiz da aplicação: altura mínima e fundo da página. Aplicada no `<body>`. |
| `ui-container` | Largura máxima e paddings laterais de qualquer página. |
| `ui-card` | Painel/cartão base (fundo, borda, raio, sombra). |
| `ui-eyebrow` | Rótulo curto acima de títulos. |
| `ui-text`, `ui-caption` | Texto corrido e texto auxiliar, respectivamente (16 px e 14 px no mobile). |
| `ui-btn ui-btn-primary` | Ação principal (uma por tela). |
| `ui-btn ui-btn-secondary` | Ação alternativa. |
| `ui-btn ui-btn-ghost` | Ações de baixo destaque (ex.: "Sair"). |
| `ui-btn ui-btn-danger` | Ações destrutivas (ex.: "Encerrar rifa", confirmar exclusão). |
| `ui-btn ui-btn-ghost-danger` | Ação destrutiva de baixo destaque em listas (ex.: "Excluir"). |
| `ui-input`, `ui-label`, `ui-hint`, `ui-error` | Campos de formulário e mensagens associadas. |
| `ui-file-input` | Ajuste do seletor de arquivo. |
| `ui-notice-success` | Confirmação de ação (role="status"). |
| `ui-notice-error` | Falha de ação (role="alert"). |
| `ui-dialog` | Modal de confirmação nativo (`<dialog>`), com `::backdrop` do tema. |
| `ui-badge`, `ui-badge-success`, `ui-badge-warning`, `ui-badge-brand` | Selos de status. |
| `ui-link` | Link textual com foco visível. |
| `ui-dashboard`, `ui-dashboard-sidebar`, `ui-dashboard-main`, `ui-dashboard-content`, `ui-dashboard-topbar`, `ui-dashboard-overlay` | Casca do dashboard autenticado. Barra lateral em drawer no mobile e sticky no desktop. |
| `ui-nav-link`, `ui-nav-link-active` | Itens da navegação lateral; o ativo usa `aria-current="page"`. |
| `ui-form-section`, `ui-form-section-header`, `ui-form-section-number`, `ui-form-actions` | Formulário em seções numeradas e divisórias, sem caixa branca. |
| `ui-rifa-list`, `ui-rifa-row`, `ui-rifa-mark`, `ui-empty` | Lista de rifas em linhas sobre o fundo cinza, com índice, progresso e ações. |
| `ui-pagination`, `ui-pagination-paginas`, `ui-pagination-atual` | Paginação das listagens (10 itens por página), com contador, páginas numeradas e botões anterior/próxima. |

Exemplo:

```tsx
<section className="ui-container py-12">
  <div className="ui-card p-6">
    <p className="ui-eyebrow">Nova rifa</p>
    <button className="ui-btn ui-btn-primary">Continuar</button>
  </div>
</section>
```

---

## 3. Padrões por tela

- **Landing (`/`)**: hero em duas colunas no desktop (texto + bilhete ilustrativo), faixa de três benefícios e bloco "Como funciona". O bilhete usa a grade de números como linguagem visual. Há um único CTA, "Criar minha rifa": vai para `/painel` se houver sessão e para `/entrar` se não houver (leitura em `BotaoCriarRifaAutenticado`, dentro de `<Suspense>`). Não existe botão "Já sou organizador".
- **Login (`/entrar`)**: cartão central; no desktop, painel lateral com a cor da marca e ícones.
- **Dashboard autenticado (`/painel/*`)**: `src/app/painel/layout.tsx` monta a barra lateral, a topbar e o `<div className="ui-dashboard-content">{children}</div>`. Cada rota (visão geral, nova rifa, editar rifa) fornece **somente o conteúdo** — não duplique a casca nas páginas. A topbar (com "Gerencie suas rifas e pagamentos em um só lugar.") e o rodapé comum (`SiteFooter`) permanecem fixos: a casca ocupa a altura da viewport menos o rodapé e **somente `.ui-dashboard-content` rola**. O travamento do `body` é feito pela classe `ui-body-panel`, aplicada por `BodyScrollMode` montado no próprio layout do painel: o `useEffect` adiciona a classe e o cleanup a remove ao desmontar. Não use `body:has(.ui-dashboard)` (a casca antiga fica escondida no DOM após a navegação) nem `usePathname()` no layout raiz com Cache Components — isso cria um limite de Suspense que falha em rotas dinâmicas públicas. O link ativo é marcado com `aria-current="page"`. No Next 16, `usePathname()` usado pela navegação fica em `DashboardNav`, dentro de `<Suspense>` — não mova esse hook para a casca sem manter o limite. O botão "Abrir rifa" da lista usa `target="_blank"` e `rel="noopener noreferrer"`: a rifa pública abre em nova aba e o painel continua disponível na aba original. A barra lateral é uma coluna flex: a navegação ocupa o espaço livre e o rodapé (e-mail + "Sair") fica fixo na base, com a linha divisória sempre visível. "Sair" encerra a sessão e redireciona para a página inicial (`/`).
- **Paginação**: toda listagem do painel usa `src/components/pagination.tsx` com **10 itens por página**. A constante `ITENS_POR_PAGINA` e o cálculo das páginas visíveis ficam em `src/lib/pagination.ts` (módulo sem `"use client"`) para poderem ser importados por Server Components — importá-los do componente cliente gera `NaN` no servidor. "Minhas rifas" pagina no servidor via `?pagina=N` (consulta com `count` + `range`); as reservas paginam no cliente por aba/busca (`onPaginaChange`), voltando à página 1 ao trocar de aba ou buscar. Os controles não têm borda, ficam centralizados e têm o mesmo tamanho; a navegação anuncia a faixa exibida (`aria-live`) e marca a página atual com `aria-current="page"`.
- **Painel (`/painel`)**: lista de rifas em linhas (`ui-rifa-list`) separadas por fios, com índice, selo de status, slug, mini barra de progresso, indicadores e ações. Sem cartões brancos. Após salvar, a ação redireciona para `/painel?saved=create|edit|delete&slug=...` e `PainelFlash` (dentro de `<Suspense>`) exibe `ui-notice-success` com link para a rifa quando houver slug; o slug é validado antes de virar link. Falhas usam `?erro=reservas|exclusao` com `ui-notice-error`.
- **Exclusão de rifa**: permitida somente sem reservas. A ação aparece na linha da lista e em "Editar rifa" apenas quando não há reservas; `ExcluirRifaButton` abre um `ui-dialog` de confirmação. A Server Action apaga o registro (cascata do banco) e remove a imagem do bucket `raffle-images` pela pasta do dono. `.ui-dialog` usa `position: fixed`, `inset: 0` e `margin: auto` porque o reset do Tailwind zera a margem padrão que centralizaria o `<dialog>`.
- **Formulários**: seções numeradas com `ui-form-section` sobre o fundo cinza, rótulos sempre visíveis, dica abaixo do campo, erro com `aria-live` e `aria-describedby`. Ações ficam em `ui-form-actions`.
- **Página pública da rifa (T06)**: mesma linguagem do bilhete do hero — imagem em destaque, barra de progresso, grade de números com quatro estados e barra fixa de seleção.
- **Pagamento (T08)**: cartão central com QR Code, valor em destaque, copia e cola e botão "Já paguei".
- **Tabela do painel (T09)**: linhas em cartões no celular; selos de status e conflito sempre com ícone/texto, nunca só cor.

### Grade de números (extensão do bilhete)

| Estado | Aparência |
|---|---|
| Livre | Fundo da superfície, borda visível, número legível. |
| Selecionado | Fundo da marca, texto branco, ícone de check. |
| Reservado | Borda tracejada, texto atenuado, `disabled`, `aria-label="Número 007, reservado"`. |
| Pago | Fundo da cor de sucesso, texto branco, ícone de check, `disabled`. |

---

## 4. Acessibilidade (obrigatório em toda tela)

- Contraste mínimo 4,5:1 para texto; 3:1 para bordas de controles.
- Foco visível global via `:focus-visible` (já definido no CSS base).
- Cursor de mão em todo elemento clicável (`button`, `a[href]`, `[role="button"]`, `summary`, `label[for]`); itens desabilitados continuam com `not-allowed`.
- Alvos de toque com no mínimo 44 × 44 px (`.ui-btn` já garante).
- Estado nunca só por cor: use texto, ícone ou padrão.
- `label` visível em todo campo; erros ligados por `aria-describedby` e anunciados com `aria-live`.
- `prefers-reduced-motion` respeitado globalmente.
- Textos em português do Brasil; datas e horas em `America/Sao_Paulo`.

---

## 5. Checklist para nova tela

1. Usa `.ui-container` e `.ui-card` em vez de criar superfícies novas.
2. Usa tokens (`brand`, `ink`, `surface`, `line`, `success`, `warning`, `danger`) — nenhum `emerald-*`, `zinc-*`, `red-*` avulso.
3. Botões usam `.ui-btn` com uma única variante principal.
4. Campos usam `.ui-input` + `.ui-label` + `.ui-error`.
5. Funciona em 360 px, com alvos de 44 px e navegação por teclado.
6. Nenhuma cor nova foi adicionada sem atualizar este documento e `globals.css`.
7. Em `/painel/*`, a barra lateral vem do layout; a página renderiza apenas o conteúdo dinâmico.
8. Formulários e listas usam seções/divisórias — não envelopar tudo em `ui-card` branco.
9. A marca vem de `Logo`; não use ícones avulsos no lugar dela.
10. Ações destrutivas usam `ui-dialog` para confirmação e `ExcluirRifaButton`; nunca dispare exclusão com um clique direto.
