-- Campos de prêmio e data prevista do sorteio (decisão de produto).
-- A data é somente data (sem horário); o resultado real continua em `drawn_at`.
alter table public.raffles
  add column prize_image_url text,
  add column prize_description text not null default '' check (char_length(prize_description) <= 4000),
  add column draw_date date;
