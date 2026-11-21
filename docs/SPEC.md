# SPEC — Especificação técnica (v1.0)

Complementa `PRD.md`. Onde houver dúvida de regra de negócio, vale o PRD (números `RN..`).

## Índice
1. Variáveis de ambiente
2. Banco de dados (migration `0001_init.sql`)
3. Storage de imagens
4. Clientes Supabase
5. Pix (`src/lib/pix.ts`)
6. Rotas de API
7. Páginas e componentes
8. Prévia ao compartilhar (Open Graph) e botões de compartilhar
9. Painel do organizador (ações)
10. Segurança
11. Testes

---

## 1. Variáveis de ambiente

`.env.local` (nunca versionar) e `.env.example` (sem valores):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # SOMENTE servidor
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # URL pública, sem barra no final
IP_HASH_SALT=                      # texto aleatório longo, SOMENTE servidor
```

---

## 2. Banco de dados

Arquivo `supabase/migrations/0001_init.sql`. Conceitos:

- `raffles`: a rifa (e os dados do Pix, que **nunca** vão para a página pública).
- `reservations`: uma compra (um comprador, vários números).
- `reservation_numbers`: os números de cada reserva. O campo `active` indica se o número está "travado". O **índice único parcial** (`where active`) garante que um número só esteja ativo em uma reserva por vez (RN01). Números de reservas expiradas ou liberadas ficam com `active = false` (histórico).

```sql
create extension if not exists pgcrypto;

-- ============ TABELAS ============
create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  image_url text,
  organizer_name text not null check (char_length(organizer_name) between 2 and 80),
  total_numbers int not null check (total_numbers between 1 and 1000),
  price_cents int not null check (price_cents between 1 and 10000000),
  pix_key text not null check (char_length(pix_key) between 1 and 77),
  pix_receiver_name text not null check (char_length(pix_receiver_name) between 1 and 25),
  pix_city text not null check (char_length(pix_city) between 1 and 15),
  reservation_hours int not null default 48 check (reservation_hours between 1 and 720),
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open','closed','drawn')),
  winner_number int,
  drawn_at timestamptz,
  reservation_seq int not null default 0,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  code text not null,
  public_token uuid not null unique default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 2 and 60),
  last_name text not null check (char_length(last_name) between 2 and 80),
  phone text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  total_cents int not null check (total_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','declared_paid','confirmed','released','expired')),
  ip_hash text,
  expires_at timestamptz not null,
  declared_paid_at timestamptz,
  confirmed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (raffle_id, code)
);
create index reservations_raffle_status_idx on public.reservations (raffle_id, status);

create table public.reservation_numbers (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  number int not null check (number >= 1),
  active boolean not null default true,
  unique (reservation_id, number)
);
-- Garante RN01: um número só pode estar ativo em uma reserva
create unique index reservation_numbers_active_uidx
  on public.reservation_numbers (raffle_id, number) where active;

-- ============ RLS ============
alter table public.raffles enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_numbers enable row level security;

-- Organizador (usuário autenticado) vê/edita só as próprias rifas.
create policy raffles_owner_all on public.raffles
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Organizador só LÊ reservas e números das próprias rifas. Alterações passam pelas funções owner_*.
create policy reservations_owner_select on public.reservations
  for select to authenticated
  using (exists (select 1 from public.raffles f
                 where f.id = reservations.raffle_id and f.owner_id = auth.uid()));

create policy reservation_numbers_owner_select on public.reservation_numbers
  for select to authenticated
  using (exists (select 1 from public.raffles f
                 where f.id = reservation_numbers.raffle_id and f.owner_id = auth.uid()));
-- Não existe política para "anon": comprador só acessa via servidor (service role).

-- ============ TRAVA DE CAMPOS (RN12) ============
create or replace function public.raffles_lock_fields() returns trigger
language plpgsql as $$
begin
  if (new.total_numbers <> old.total_numbers or new.price_cents <> old.price_cents)
     and exists (select 1 from public.reservations where raffle_id = old.id) then
    raise exception 'locked_fields';
  end if;
  return new;
end $$;

create trigger raffles_lock_fields_trg
  before update on public.raffles
  for each row execute function public.raffles_lock_fields();

-- ============ FUNÇÕES ============

-- Expira reservas pending vencidas e libera os números (RN06).
create or replace function public.expire_stale_reservations(p_raffle_id uuid)
returns void language sql security definer set search_path = public as $$
  with expired as (
    update public.reservations
       set status = 'expired'
     where raffle_id = p_raffle_id and status = 'pending' and expires_at < now()
    returning id
  )
  update public.reservation_numbers set active = false
   where reservation_id in (select id from expired);
$$;

-- Cria reserva (RN01–RN04, RN13, RN16). Usada só pelo servidor.
create or replace function public.create_reservation(
  p_raffle_id uuid, p_numbers int[], p_first_name text, p_last_name text,
  p_phone text, p_ip_hash text
) returns table (out_reservation_id uuid, out_public_token uuid, out_code text,
                 out_total_cents int, out_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_raffle public.raffles%rowtype;
  v_numbers int[];
  v_count int;
  v_seq int;
  v_code text;
  v_total int;
  v_expires timestamptz;
  v_id uuid;
  v_token uuid;
begin
  select * into v_raffle from public.raffles where id = p_raffle_id;
  if not found then raise exception 'raffle_not_found'; end if;
  if v_raffle.status <> 'open'
     or (v_raffle.ends_at is not null and v_raffle.ends_at < now()) then
    raise exception 'raffle_closed';
  end if;

  select coalesce(array_agg(distinct n order by n), '{}'::int[]) into v_numbers
    from unnest(p_numbers) as n;
  v_count := coalesce(array_length(v_numbers, 1), 0);
  if v_count < 1 or v_count > 50 then raise exception 'invalid_quantity'; end if;
  if v_numbers[1] < 1 or v_numbers[v_count] > v_raffle.total_numbers then
    raise exception 'invalid_number';
  end if;

  perform public.expire_stale_reservations(p_raffle_id);

  if p_ip_hash is not null and (
       select count(*) from public.reservations r
        where r.raffle_id = p_raffle_id and r.status = 'pending' and r.ip_hash = p_ip_hash
     ) >= 5 then
    raise exception 'too_many_pending';
  end if;

  update public.raffles set reservation_seq = reservation_seq + 1
   where id = p_raffle_id returning reservation_seq into v_seq;

  v_code := 'R' || lpad(v_seq::text, 4, '0');
  v_total := v_count * v_raffle.price_cents;
  v_expires := now() + make_interval(hours => v_raffle.reservation_hours);

  insert into public.reservations
    (raffle_id, code, first_name, last_name, phone, total_cents, ip_hash, expires_at)
  values
    (p_raffle_id, v_code, btrim(p_first_name), btrim(p_last_name),
     nullif(btrim(p_phone), ''), v_total, p_ip_hash, v_expires)
  returning id, public_token into v_id, v_token;

  -- Se algum número já estiver ativo em outra reserva, o índice único dispara
  -- unique_violation (SQLSTATE 23505) e TUDO é desfeito.
  insert into public.reservation_numbers (reservation_id, raffle_id, number)
  select v_id, p_raffle_id, n from unnest(v_numbers) as n;

  return query select v_id, v_token, v_code, v_total, v_expires;
end $$;

-- Números ocupados para pintar a grade pública (RN10). Usada só pelo servidor.
create or replace function public.get_taken_numbers(p_raffle_id uuid)
returns table (taken_number int, taken_status text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.expire_stale_reservations(p_raffle_id);
  return query
    select rn.number,
           case when r.status = 'confirmed' then 'paid' else 'reserved' end
      from public.reservation_numbers rn
      join public.reservations r on r.id = rn.reservation_id
     where rn.raffle_id = p_raffle_id and rn.active
     order by rn.number;
end $$;

-- Botão "Já paguei" (RN05, RN07). Usada só pelo servidor. Idempotente.
create or replace function public.declare_paid(p_token uuid)
returns table (out_status text, out_conflicts int)
language plpgsql security definer set search_path = public as $$
declare
  v_res public.reservations%rowtype;
  v_conflicts int := 0;
  v_row record;
begin
  select * into v_res from public.reservations where public_token = p_token for update;
  if not found then raise exception 'reservation_not_found'; end if;

  if v_res.status in ('confirmed', 'declared_paid') then
    return query select v_res.status, 0;
    return;
  end if;
  if v_res.status = 'released' then raise exception 'reservation_released'; end if;

  -- pending ou expired
  if v_res.status = 'expired' then
    for v_row in
      select id from public.reservation_numbers
       where reservation_id = v_res.id and not active
    loop
      begin
        update public.reservation_numbers set active = true where id = v_row.id;
      exception when unique_violation then
        v_conflicts := v_conflicts + 1;
      end;
    end loop;
  end if;

  update public.reservations
     set status = 'declared_paid', declared_paid_at = now()
   where id = v_res.id;

  return query select 'declared_paid'::text, v_conflicts;
end $$;

-- Confirmar pagamento (organizador) — RN08.
create or replace function public.owner_confirm_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res public.reservations%rowtype;
begin
  select r.* into v_res
    from public.reservations r
    join public.raffles f on f.id = r.raffle_id
   where r.id = p_reservation_id and f.owner_id = auth.uid()
   for update of r;
  if not found then raise exception 'forbidden'; end if;
  if v_res.status not in ('pending', 'declared_paid', 'expired') then
    raise exception 'invalid_status';
  end if;

  -- Pode disparar unique_violation (23505) se algum número já foi tomado por outra reserva.
  update public.reservation_numbers set active = true
   where reservation_id = v_res.id and not active;

  update public.reservations
     set status = 'confirmed', confirmed_at = now()
   where id = v_res.id;
end $$;

-- Liberar reserva (organizador) — RN09.
create or replace function public.owner_release_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res public.reservations%rowtype;
begin
  select r.* into v_res
    from public.reservations r
    join public.raffles f on f.id = r.raffle_id
   where r.id = p_reservation_id and f.owner_id = auth.uid()
   for update of r;
  if not found then raise exception 'forbidden'; end if;
  if v_res.status = 'released' then raise exception 'invalid_status'; end if;

  update public.reservation_numbers set active = false where reservation_id = v_res.id;
  update public.reservations
     set status = 'released', released_at = now()
   where id = v_res.id;
end $$;

-- Sorteio (organizador) — RN14. Se p_number for nulo, sorteia entre números confirmados.
create or replace function public.owner_draw(p_raffle_id uuid, p_number int default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_raffle public.raffles%rowtype;
  v_winner int;
begin
  select * into v_raffle from public.raffles
   where id = p_raffle_id and owner_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if v_raffle.status = 'drawn' then raise exception 'already_drawn'; end if;

  if p_number is not null then
    if p_number < 1 or p_number > v_raffle.total_numbers then
      raise exception 'invalid_number';
    end if;
    v_winner := p_number;
  else
    select rn.number into v_winner
      from public.reservation_numbers rn
      join public.reservations r on r.id = rn.reservation_id
     where rn.raffle_id = p_raffle_id and rn.active and r.status = 'confirmed'
     order by random() limit 1;
    if v_winner is null then raise exception 'no_paid_numbers'; end if;
  end if;

  update public.raffles
     set status = 'drawn', winner_number = v_winner, drawn_at = now()
   where id = p_raffle_id;
  return v_winner;
end $$;

-- ============ PERMISSÕES DAS FUNÇÕES ============
-- Funções do comprador: SOMENTE service_role (servidor).
revoke all on function public.create_reservation(uuid, int[], text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.get_taken_numbers(uuid) from public, anon, authenticated;
revoke all on function public.declare_paid(uuid) from public, anon, authenticated;
grant execute on function public.create_reservation(uuid, int[], text, text, text, text) to service_role;
grant execute on function public.get_taken_numbers(uuid) to service_role;
grant execute on function public.declare_paid(uuid) to service_role;

-- Expirar reservas é inofensivo: liberado para o painel e para o servidor.
revoke all on function public.expire_stale_reservations(uuid) from public, anon;
grant execute on function public.expire_stale_reservations(uuid) to authenticated, service_role;

-- Funções do organizador: usuários autenticados (a função confere o dono).
revoke all on function public.owner_confirm_reservation(uuid) from public, anon;
revoke all on function public.owner_release_reservation(uuid) from public, anon;
revoke all on function public.owner_draw(uuid, int) from public, anon;
grant execute on function public.owner_confirm_reservation(uuid) to authenticated;
grant execute on function public.owner_release_reservation(uuid) to authenticated;
grant execute on function public.owner_draw(uuid, int) to authenticated;
```

**Erros das funções** (mensagem em `error.message`; violação de unicidade tem `error.code === '23505'`):
`raffle_not_found`, `raffle_closed`, `invalid_quantity`, `invalid_number`, `too_many_pending`, `reservation_not_found`, `reservation_released`, `forbidden`, `invalid_status`, `already_drawn`, `no_paid_numbers`, `locked_fields`.

---

## 3. Storage de imagens

Bucket público `raffle-images`; cada organizador só envia/altera/apaga arquivos dentro da pasta com o próprio `auth.uid()`.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('raffle-images', 'raffle-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy raffle_images_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'raffle-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy raffle_images_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'raffle-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy raffle_images_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'raffle-images' and (storage.foldername(name))[1] = auth.uid()::text);
```

Upload: caminho `{user_id}/{uuid}.{ext}`; salvar em `raffles.image_url` a URL pública (`getPublicUrl`). No formulário, validar tipo e tamanho (≤ 2 MB) antes de enviar. Recomendar na interface imagem horizontal (proporção 1,91:1, ex.: 1200×630) e **abaixo de 300 KB** para a prévia aparecer bem no WhatsApp.

---

## 4. Clientes Supabase (`src/lib/supabase/`)

- `server.ts`: cliente com `@supabase/ssr` e cookies (Server Components, Server Actions, Route Handlers do organizador). Usa a chave anon + sessão do usuário (RLS vale).
- `client.ts`: cliente de navegador (`createBrowserClient`) para o login.
- `admin.ts`: cliente com **service role**, só no servidor:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- `middleware.ts`: atualiza a sessão e redireciona para `/entrar` quem acessar `/painel/*` sem login.

**Leitura pública da rifa** (função `getPublicRaffle(slug)` em `src/lib/raffles.ts`, com `supabaseAdmin()`): selecionar **somente**
`id, slug, title, description, image_url, organizer_name, total_numbers, price_cents, status, ends_at, winner_number, drawn_at`.
Nunca `pix_*`. Se `status = 'open'` e `ends_at < now()`, tratar como encerrada na exibição.

---

## 5. Pix (`src/lib/pix.ts`)

Usamos **Pix estático** (BR Code do Banco Central) com valor fixo. Não há API de banco.

### Estrutura do payload
Cada campo é `ID` (2 dígitos) + `TAMANHO` (2 dígitos, decimal, com zeros à esquerda) + `VALOR`. Campos, nesta ordem:

| ID | Conteúdo | Valor |
|----|----------|-------|
| 00 | Payload Format Indicator | `01` |
| 01 | Point of Initiation Method | `11` |
| 26 | Merchant Account Information | subcampos `00` = `br.gov.bcb.pix`, `01` = chave Pix |
| 52 | Merchant Category Code | `0000` |
| 53 | Moeda | `986` |
| 54 | Valor | ex.: `20.00` (ponto decimal, 2 casas) |
| 58 | País | `BR` |
| 59 | Nome do recebedor | até 25 caracteres, maiúsculas, sem acento |
| 60 | Cidade | até 15 caracteres, maiúsculas, sem acento |
| 62 | Additional Data Field | subcampo `05` = txid (1 a 25 letras/números) |
| 63 | CRC16 | `6304` + 4 dígitos hexadecimais maiúsculos |

O CRC16 é **CRC-16/CCITT-FALSE** (polinômio `0x1021`, valor inicial `0xFFFF`, sem inversão, sem XOR final), calculado sobre todo o texto **incluindo** `6304`.

### Implementação

```ts
export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e símbolos, deixa maiúsculo e corta no tamanho máximo. */
export function sanitizeText(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

export function formatAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function normalizePixKey(raw: string): { type: PixKeyType; key: string } | null {
  const v = raw.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return { type: "random", key: v.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77)
    return { type: "email", key: v.toLowerCase() };
  const compact = v.replace(/[\s().-]/g, "");
  if (/^\+55\d{10,11}$/.test(compact)) return { type: "phone", key: compact };
  const digits = v.replace(/[.\-/\s]/g, "");
  if (/^\d{11}$/.test(digits)) return { type: "cpf", key: digits };
  if (/^\d{14}$/.test(digits)) return { type: "cnpj", key: digits };
  return null;
}

export type PixInput = {
  key: string;          // já normalizada
  name: string;         // nome do recebedor
  city: string;
  amountCents: number;  // inteiro > 0
  txid: string;         // 1 a 25 caracteres [A-Za-z0-9]
};

export function buildPixPayload({ key, name, city, amountCents, txid }: PixInput): string {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("invalid_amount");
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error("invalid_txid");
  const merchantName = sanitizeText(name, 25);
  const merchantCity = sanitizeText(city, 15);
  if (!merchantName || !merchantCity) throw new Error("invalid_receiver");

  const account = field("00", "br.gov.bcb.pix") + field("01", key);
  const withoutCrc =
    field("00", "01") +
    field("01", "11") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    field("54", formatAmount(amountCents)) +
    field("58", "BR") +
    field("59", merchantName) +
    field("60", merchantCity) +
    field("62", field("05", txid)) +
    "6304";
  return withoutCrc + crc16(withoutCrc);
}
```

### Vetores de teste (verificados)

- `crc16("123456789")` deve retornar `29B1`.
- Entrada: chave `123e4567-e89b-12d3-a456-426614174000`, nome `Rifa Solidária`, cidade `São Paulo`, valor `2000` centavos, txid `R0042`. Saída esperada:
  `00020101021126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540520.005802BR5914RIFA SOLIDARIA6009SAO PAULO62090505R00426304C1B7`
- Entrada: chave `+5583999990000`, nome `Maria da Silva`, cidade `João Pessoa`, valor `3050` centavos, txid `R0007`. Saída esperada:
  `00020101021126360014br.gov.bcb.pix0114+5583999990000520400005303986540530.505802BR5914MARIA DA SILVA6011JOAO PESSOA62090505R00076304CF8B`

### QR Code
Na página de pagamento (Server Component), gerar com a biblioteca `qrcode`:

```ts
import QRCode from "qrcode";
const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 320 });
```
Mostrar em `<img src={qrDataUrl} alt="QR Code Pix no valor de R$ 20,00" width={320} height={320} />`. O texto do `payload` é o **Pix copia e cola**.

**Teste manual obrigatório** (tarefa T03): gerar um payload com a chave real do organizador e conferir que o app do banco lê o QR Code e mostra nome, cidade e valor corretos.

---

## 6. Rotas de API (Route Handlers, com `supabaseAdmin()`)

Todas respondem JSON. Em erro: `{ "error": "<codigo>" }`. Nunca devolver detalhes internos.

### `GET /api/raffles/[slug]/numbers`
Resposta `200`: `{ "taken": [{ "number": 7, "status": "reserved" }, { "number": 12, "status": "paid" }] }`.
Busca a rifa pelo `slug` (404 se não existir) e chama a função `get_taken_numbers`. Cabeçalho `Cache-Control: no-store`.

### `POST /api/raffles/[slug]/reservations`
Corpo:
```json
{ "numbers": [7, 12], "firstName": "Maria", "lastName": "Silva", "phone": "83999990000", "website": "" }
```
Passos:
1. Se `website` (campo isca, escondido no formulário) vier preenchido → `400 { "error": "invalid" }`.
2. Validar com zod (ver abaixo).
3. Calcular `ipHash = sha256(ip + IP_HASH_SALT)` em hexadecimal, com `ip` = primeiro valor de `x-forwarded-for` (ou `"unknown"`).
4. Chamar a função `create_reservation(p_raffle_id, p_numbers, p_first_name, p_last_name, p_phone, p_ip_hash)`.
5. Respostas: `201 { "token": "<uuid>", "code": "R0042", "totalCents": 2000, "expiresAt": "..." }`.

Mapeamento de erros: `23505` ou `number_taken` → `409 number_taken`; `raffle_closed` → `409 raffle_closed`; `too_many_pending` → `429 too_many_pending`; `raffle_not_found` → `404`; `invalid_quantity`/`invalid_number`/validação → `400 invalid`; qualquer outro → `500 server_error`.

Schema zod (`src/lib/validation.ts`):
```ts
import { z } from "zod";

export const createReservationSchema = z.object({
  numbers: z.array(z.number().int().min(1)).min(1).max(50),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(1, "Informe o WhatsApp.")
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^\d{10,11}$/.test(v), "WhatsApp inválido"),
});
```

### `POST /api/reservations/[token]/declare-paid`
Valida que `token` é UUID. Chama `declare_paid(p_token)`.
Resposta `200`: `{ "status": "declared_paid", "conflicts": 0 }`. Erros: `reservation_not_found` → `404`; `reservation_released` → `409 reservation_released`.

---

## 7. Páginas e componentes

### Rotas
| Rota | Tipo | Observação |
|------|------|-----------|
| `/` | Server | Página simples explicando o produto + botões "Entrar" e "Criar minha rifa" |
| `/entrar` | Client | Login (contas criadas pelo administrador no Supabase) |
| `/painel` | Server | Lista de rifas do organizador |
| `/painel/rifas/nova` | Server + Client | Formulário |
| `/painel/rifas/[id]` | Server + Client | Detalhe, reservas, sorteio |
| `/painel/rifas/[id]/editar` | Server + Client | Edição |
| `/r/[slug]` | Server + Client | Página pública |
| `/r/[slug]/reserva/[token]` | Server + Client | Pagamento |
| `/privacidade` | Server | Política de privacidade simples |

### Componentes principais (`src/components/`)
- `NumberGrid` (client): recebe `total`, `taken` e `price`; controla a seleção; botão por número; polling a cada 15 s e ao evento `visibilitychange`.
- `SelectionBar` (client): barra fixa no rodapé com quantidade e total em R$; botão "Continuar".
- `BuyerForm` (client): nome, sobrenome e WhatsApp obrigatório (usado apenas para contato do organizador), campo isca `website` (escondido com CSS e `tabIndex={-1}`, `autoComplete="off"`); envia para `POST /api/raffles/[slug]/reservations`; em sucesso grava o token em `localStorage` (`rifa:{slug}:last`) e navega para a página de pagamento. Em `409 number_taken`, atualiza a grade e mostra a mensagem do PRD.
- `ShareButtons` (client): ver seção 8.
- `PixPayment` (client): botão copiar (`navigator.clipboard.writeText`; se falhar, selecionar o texto), botão "Já paguei".
- `ReservationsTable` (client, painel): abas, busca, seleção múltipla, ações.
- `ProgressBar`, `StatusBadge`, `Money` (formatação BRL).

### Grade de números
- Largura de cada célula suficiente para o maior número (`padStart` com a quantidade de dígitos de `total_numbers`).
- Estados e aparência (nunca só cor):
  - **Livre**: fundo claro, borda.
  - **Selecionado**: fundo da cor principal + ícone de check.
  - **Reservado**: cinza com listras diagonais, `disabled`, `aria-label="Número 007, reservado"`.
  - **Pago**: cinza escuro + ícone de check, `disabled`, `aria-label="Número 007, pago"`.
- Legenda visível acima da grade com os quatro estados.
- Contêiner da grade com `role="group"` e `aria-label="Números da rifa"`.

### Formatação (`src/lib/format.ts`)
```ts
export const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
```

### Slug (`src/lib/slug.ts`)
`slugify(title)`: minúsculas, remove acentos, troca espaços/símbolos por `-`, corta em 50 caracteres e acrescenta `-` + 4 caracteres aleatórios `[a-z0-9]`. Em caso de colisão (erro `23505` em `slug`), gerar outro sufixo e tentar de novo (até 5 vezes).

---

## 8. Prévia ao compartilhar e botões de compartilhar

### Metadados da página pública (`/r/[slug]/page.tsx`)
```ts
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const raffle = await getPublicRaffle(slug);
  if (!raffle) return { title: "Rifa não encontrada" };

  const title = raffle.title;
  const description = raffle.description.replace(/\s+/g, " ").slice(0, 160);
  const images = raffle.image_url ? [{ url: raffle.image_url, width: 1200, height: 630 }] : [];

  return {
    title,
    description,
    openGraph: { title, description, url: `/r/${slug}`, type: "website", locale: "pt_BR", images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}
```
No `src/app/layout.tsx`: `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!)` (necessário para URLs absolutas nas tags).

### Botões de compartilhar (`src/lib/share.ts`)
```ts
export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
  };
}
```
`ShareButtons`: se `navigator.share` existir (celulares), mostrar primeiro o botão **"Compartilhar"** que chama `navigator.share({ title, text, url })`; sempre mostrar WhatsApp, Facebook, X, Telegram e **"Copiar link"**. Links externos com `target="_blank"` e `rel="noopener noreferrer"`. Texto padrão: `"Participe da rifa: {título}"`.

---

## 9. Painel do organizador (ações)

Use **Server Actions** (arquivo `src/app/painel/actions.ts`) com o cliente de `server.ts` (sessão do usuário). Antes de listar reservas, chamar `rpc("expire_stale_reservations", { p_raffle_id })`.

- **Criar rifa**: validar com zod (mesmos limites do banco), normalizar a chave Pix com `normalizePixKey` (rejeitar se for `null`), gerar `slug`, inserir com `owner_id = auth.uid()`.
- **Editar rifa**: atualizar título, descrição, imagem, organizador, Pix, prazo de reserva, data limite. Se vier `total_numbers` ou `price_cents` diferentes e já existirem reservas, devolver erro amigável (o trigger também bloqueia).
- **Encerrar rifa**: `update raffles set status = 'closed'` (somente se `status = 'open'`).
- **Listar reservas**: `from("reservations").select("*, reservation_numbers(number, active)").eq("raffle_id", id).order("created_at")`. Agrupar por aba:
  - "Já paguei": `declared_paid`, ordenadas por `declared_paid_at` crescente.
  - "Aguardando pagamento": `pending`.
  - "Confirmadas": `confirmed`.
  - "Expiradas e liberadas": `expired` e `released`.
  - **Conflito**: reserva `declared_paid` com algum número `active = false`.
- **Confirmar**: `rpc("owner_confirm_reservation", { p_reservation_id })`. Se `error.code === "23505"`, mostrar "Algum número desta reserva já foi tomado por outra pessoa. Libere esta reserva."
- **Confirmar em lote**: chamar a função para cada id em sequência; ao final, informar quantas foram confirmadas e quais falharam.
- **Liberar**: `rpc("owner_release_reservation", { p_reservation_id })` (com confirmação "Tem certeza?").
- **Sorteio**: `rpc("owner_draw", { p_raffle_id, p_number })` com `p_number` nulo (aleatório) ou informado. Mostrar o vencedor (nome completo, telefone e código da reserva) ao organizador.
- **Resumo**: calcular a partir das reservas: números pagos (`confirmed`), reservados (`pending` + `declared_paid`), livres (`total − pagos − reservados`), arrecadação confirmada (soma de `total_cents` das `confirmed`), a conferir (soma das `declared_paid`).

**Vencedor público** (`getPublicWinner(raffleId, number)`, com `supabaseAdmin()`): buscar a reserva `confirmed` com aquele número ativo e devolver `"{firstName} {lastName[0]}."`; se não houver, `null` (a página mostra "Número X — sem comprador confirmado", RN15).

---

## 10. Segurança

1. A `SUPABASE_SERVICE_ROLE_KEY` nunca vai ao navegador (`server-only`).
2. RLS ligada em todas as tabelas; sem políticas para `anon`.
3. Funções do comprador liberadas apenas para `service_role`; funções do organizador conferem `auth.uid()` internamente.
4. Valor da compra sempre calculado no banco (RN02).
5. Zod em todas as rotas; `token` validado como UUID.
6. Token da reserva (`public_token`) é um UUID aleatório: é a "senha" para ver o QR Code e declarar pagamento. Não exibir em listas públicas.
7. Anti-abuso: campo isca, limite de 5 reservas pendentes por origem (RN16).
8. Cabeçalhos: `Cache-Control: no-store` nas rotas que devolvem estado de números ou de reservas.
9. Não registrar em log dados pessoais (nome, telefone, chave Pix).
10. Não renderizar HTML vindo do usuário: descrição exibida como texto (preservando quebras de linha com CSS `white-space: pre-line`).

---

## 11. Testes (vitest)

Arquivo `src/lib/pix.test.ts`: testar `crc16`, `sanitizeText`, `formatAmount` (`5` → `0.05`, `1999` → `19.99`, `2000` → `20.00`), `normalizePixKey` (CPF com pontos, CNPJ com barra, e-mail em maiúsculas, telefone com formatação, UUID, valor inválido → `null`) e `buildPixPayload` com os dois vetores da seção 5. Também testar que `buildPixPayload` lança erro para valor `0` e `txid` inválido.

Arquivo `src/lib/validation.test.ts`: testar `createReservationSchema` (nome curto, telefone inválido, lista vazia, mais de 50 números).

Testes do banco (manuais, no SQL Editor do Supabase, descritos na tarefa T02).
