# PRD — Ajudaí (v1.0)

## 1. Visão

**Problema:** organizar rifas beneficentes por papel ou por WhatsApp é trabalhoso: controlar quais números já foram vendidos, evitar números repetidos e divulgar a rifa dá muito trabalho.

**Solução:** uma página pública para cada rifa, com link fácil de compartilhar, onde a pessoa escolhe os números e paga por Pix em poucos toques. O organizador acompanha tudo em um painel e confirma os pagamentos.

**Público:** pessoas e grupos que organizam rifas beneficentes (igrejas, escolas, ONGs, campanhas entre amigos) e quem compra os números, em sua maioria pelo celular.

## 2. Perfis

- **Organizador**: tem conta (e-mail e senha). Cria rifas, confere pagamentos, faz o sorteio.
- **Comprador**: não tem conta. Entra pelo link da rifa e compra.

## 3. Princípios

1. **Fluxo do comprador curto**: no máximo 4 interações (escolher números → informar nome e sobrenome → pagar → tocar em "Já paguei").
2. **Confiança**: o botão "Já paguei" é uma declaração de boa-fé. Não pedimos comprovante.
3. **Simples para o organizador**: confirmação manual com poucos cliques.
4. **Transparência**: números livres, reservados e pagos sempre visíveis; resultado do sorteio público.
5. **Sem custo operacional de pagamento**: o dinheiro vai direto para a chave Pix do organizador. A plataforma não processa nem guarda valores.

## 4. Escopo

### Dentro do MVP
- Conta do organizador (criação pelo administrador com acesso ao Supabase, login, logout). Não há auto-cadastro.
- Criar, editar e encerrar rifas: título, descrição, imagem, quantidade de números, preço por número, nome do organizador, dados do Pix, prazo de reserva, data limite.
- Página pública da rifa com grade de números e prévia bonita ao compartilhar.
- Botões de compartilhamento (WhatsApp, Facebook, X, Telegram, copiar link, compartilhar do celular).
- Escolha de um ou mais números; nome e sobrenome; WhatsApp obrigatório (para contato do organizador).
- Pagamento por Pix: QR Code + "copia e cola" com valor calculado.
- Botão "Já paguei".
- Painel do organizador: listas de reservas, confirmar, liberar, confirmação em lote, busca, resumo (arrecadação, progresso).
- Sorteio (aleatório entre números pagos ou informando o número vencedor manualmente) e página pública com o resultado.

### Fora do MVP
- Confirmação automática de pagamento (webhook de banco).
- Importação de extrato bancário.
- Pagamento por cartão ou boleto.
- Login de comprador, histórico de compras.
- Notificações por e-mail ou WhatsApp.
- Exportar CSV (opcional, última tarefa).
- Múltiplos idiomas.

## 5. Fluxos

### 5.1 Organizador
1. Cria conta e entra no painel.
2. Toca em "Nova rifa" e preenche o formulário (ver 7.2). Ao salvar, recebe o link público `/r/{slug}`.
3. Divulga o link (botões de compartilhamento na página da rifa e no painel).
4. No painel, acompanha as reservas. Prioriza a lista **"Já paguei"**, confere no extrato bancário e **confirma** (ou **libera** se o pagamento não aparecer).
5. Ao encerrar a rifa, realiza o **sorteio**. O resultado aparece na página pública.

### 5.2 Comprador
1. Abre o link da rifa (vindo do WhatsApp, Instagram etc.).
2. Vê imagem, descrição, preço e a grade de números. Toca em um ou mais números livres.
3. Uma barra fixa mostra: "N números · R$ total · Continuar". Ao tocar, aparece um formulário com **Nome**, **Sobrenome** e **WhatsApp** (obrigatório, usado apenas para o organizador entrar em contato).
4. Ao tocar em "Gerar Pix", a reserva é criada e ele vê o **QR Code**, o valor, o **Pix copia e cola** e o botão **"Já paguei"**.
5. Paga no app do banco, volta e toca em **"Já paguei"**. Vê a mensagem de agradecimento.
6. Pode reabrir o link a qualquer momento e ver o estado da reserva.

## 6. Regras de negócio

- **RN01** — Cada número só pode pertencer a **uma reserva ativa** por vez.
- **RN02** — Valor da reserva = quantidade de números × preço por número. Calculado no servidor.
- **RN03** — Máximo de **50 números por reserva**. Máximo de **1000 números por rifa** no MVP.
- **RN04** — Ao gerar o Pix, a reserva é criada com status `pending` e vale por `reservation_hours` (padrão 48 h, configurável de 1 a 720).
- **RN05** — Status da reserva: `pending` (aguardando pagamento), `declared_paid` ("Já paguei"), `confirmed` (confirmada pelo organizador), `released` (liberada pelo organizador), `expired` (prazo vencido).
- **RN06** — Reservas `pending` vencidas passam a `expired` e **liberam os números**. Reservas `declared_paid` e `confirmed` **não expiram**.
- **RN07** — Uma reserva `expired` continua visível ao organizador. Se o comprador tocar em "Já paguei" nela, o sistema tenta reativar os números; os que já foram tomados por outra pessoa ficam marcados como **conflito** para o organizador resolver.
- **RN08** — Confirmar uma reserva `expired` só é possível se **todos** os números estiverem livres; caso contrário o organizador deve liberá-la.
- **RN09** — O organizador pode **liberar** qualquer reserva que não esteja liberada (inclusive desfazer uma confirmação). Os números voltam a ficar livres.
- **RN10** — Na grade pública, `pending` e `declared_paid` aparecem como **Reservado**; `confirmed` aparece como **Pago**.
- **RN11** — Com a rifa **encerrada** (manualmente, pela data limite ou após o sorteio) não se aceitam novas reservas.
- **RN12** — `total_numbers` e `price_cents` **não podem ser alterados** depois da primeira reserva.
- **RN13** — Cada reserva tem um **código curto** (`R0001`, `R0002`...) único na rifa. Ele é enviado como `txid` no Pix e exibido ao organizador e ao comprador.
- **RN14** — **Sorteio**: (a) aleatório entre os números com reserva `confirmed`; ou (b) o organizador informa o número vencedor (por exemplo, o resultado de um sorteio externo). Só pode ocorrer **uma vez** por rifa.
- **RN15** — Publicamente, o vencedor aparece como **"Nome S."** (primeiro nome e inicial do sobrenome). Se o número vencedor não tiver reserva confirmada, a página mostra "Número X — sem comprador confirmado".
- **RN16** — Limite anti-abuso: no máximo **5 reservas `pending` por origem (hash de IP) por rifa**.
- **RN17** — O organizador só vê e altera as próprias rifas.

## 7. Requisitos por tela

### 7.1 Login (`/entrar`)
E-mail e senha (mínimo 8 caracteres). Não há auto-cadastro: a conta do organizador é criada pelo administrador com acesso ao Supabase, que também define a senha.

### 7.2 Nova rifa / editar (`/painel/rifas/nova`)
Campos: título (3–120), descrição (até 4000), imagem (JPG/PNG/WebP até 2 MB), nome do organizador (2–80), quantidade de números (1–1000), preço por número (R$), chave Pix, nome do recebedor (até 25), cidade (até 15), prazo de reserva em horas (padrão 48), data limite (opcional).
Ao salvar, gera o `slug`. Mostra o link público com botão de copiar.
Depois da primeira reserva, quantidade e preço ficam bloqueados (RN12).

### 7.3 Painel (`/painel`)
Lista de rifas do organizador com: título, progresso (pagos/total), arrecadação confirmada, status e link para abrir.

### 7.4 Detalhe da rifa no painel (`/painel/rifas/[id]`)
- **Resumo**: números pagos, reservados, livres; arrecadação confirmada; valor "a conferir" (reservas "Já paguei").
- **Abas**: "Já paguei" (padrão) · "Aguardando pagamento" · "Confirmadas" · "Expiradas e liberadas".
- Cada linha: código, nome completo, números, valor, data; selo de **conflito** quando houver.
- Ações por linha: **Confirmar**, **Liberar**. Seleção múltipla com **Confirmar selecionadas**.
- Busca por nome ou código.
- Botões: copiar link público, compartilhar, editar rifa, encerrar rifa, **Sorteio**.

### 7.5 Página pública (`/r/[slug]`)
Imagem, título, organizador, descrição, preço por número, barra "X de Y números já reservados", botões de compartilhar, legenda, **grade de números**, barra fixa de seleção, aviso legal no rodapé. Quando sorteada, mostra o resultado. A grade se atualiza sozinha a cada 15 segundos e ao voltar para a aba.

### 7.6 Pagamento (`/r/[slug]/reserva/[token]`)
- `pending`: valor, números, QR Code, Pix copia e cola, validade, botão **"Já paguei"**.
- `declared_paid`: "Obrigado! O organizador confirmará seu pagamento em breve." (sem QR Code).
- `confirmed`: "Pagamento confirmado. Boa sorte!"
- `expired`: "Esta reserva expirou. Se você já pagou, toque em *Já paguei*. Se ainda não pagou, escolha seus números novamente." (sem QR Code) + botão **"Já paguei"** e link para a rifa.
- `released`: "Esta reserva foi cancelada pelo organizador."

## 8. Requisitos não funcionais

- **Mobile first**: funciona bem em telas de 360 px. Alvos de toque de pelo menos 44×44 px.
- **Desempenho**: página pública leve (grade de até 1000 botões sem travar). Imagens com `loading="lazy"` e tamanho adequado.
- **Acessibilidade (WCAG 2.1 AA)**:
  - Contraste mínimo 4,5:1 para texto.
  - Estado dos números nunca só por cor: usar também texto/ícone/padrão e `aria-label` ("Número 007, livre").
  - Foco visível e navegação por teclado completa.
  - Formulários com `label`, mensagens de erro associadas aos campos (`aria-describedby`) e `aria-live` para avisos.
  - QR Code com `alt` descritivo e o copia e cola sempre disponível como alternativa.
  - Respeitar `prefers-reduced-motion`.
- **Privacidade (LGPD)**: coletar só o necessário (nome, sobrenome e WhatsApp obrigatório, usado somente para contato sobre a reserva). Dados pessoais visíveis apenas ao organizador da rifa, no painel dele; o WhatsApp nunca aparece em páginas públicas. Página de política de privacidade simples (`/privacidade`) explicando o que é coletado e para quê.
- **Segurança**: ver `SPEC.md` (seção 10).
- **Confiabilidade**: nunca permitir o mesmo número em duas reservas ativas (garantido no banco).

## 9. Mensagens padrão (microcopy)

- Número ocupado: "Ops! Este número acabou de ser reservado por outra pessoa. Escolha outro."
- Rifa encerrada: "Esta rifa foi encerrada e não aceita novas reservas."
- Muitas reservas pendentes: "Você já tem várias reservas aguardando pagamento. Conclua o pagamento ou aguarde o prazo expirar."
- Aviso no rodapé da rifa: "Rifa beneficente organizada por {organizador}. A plataforma não processa pagamentos nem se responsabiliza pela rifa."
- Copiado: "Código Pix copiado!"

## 10. Riscos e observações

- **Aspecto legal**: rifas e sorteios têm regras no Brasil que dependem da finalidade e da forma de organização. O organizador é responsável por cumprir a legislação aplicável. Recomenda-se consulta jurídica antes de divulgar a plataforma.
- **Conferência manual**: pode haver demora na confirmação. A página de pagamento deixa claro que o organizador confirmará.
- **Reservas por má-fé**: mitigadas pelo prazo de expiração e pelo limite da RN16.
- **Pix estático**: o pagamento não é vinculado automaticamente à reserva. Por isso o organizador confere por nome e valor, e o código da reserva segue como `txid`.

## 11. Evoluções futuras

Importar extrato bancário (CSV/OFX) com sugestão automática de pagamentos; confirmação automática via API de banco; avisos por e-mail/WhatsApp; exportar CSV; imagem para stories com a grade atualizada; vários administradores por rifa.
