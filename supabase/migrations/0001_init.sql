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
