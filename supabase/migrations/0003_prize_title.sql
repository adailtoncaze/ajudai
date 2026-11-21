-- Título do prêmio exibido na página de divulgação da rifa.
alter table public.raffles
  add column prize_title text check (char_length(prize_title) <= 120);
