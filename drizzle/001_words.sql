-- Word Ledger app table (run AFTER enabling Neon Auth so neon_auth.user exists)
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  term text not null,
  source_lang text not null check (source_lang in ('en', 'vi')),
  target_lang text not null check (target_lang in ('en', 'vi')),
  translation text not null,
  ipa text,
  audio_us_url text,
  audio_uk_url text,
  part_of_speech text,
  definition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists words_user_term_source_uidx
  on public.words (user_id, term, source_lang);

create index if not exists words_user_created_at_idx
  on public.words (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists words_set_updated_at on public.words;
create trigger words_set_updated_at
  before update on public.words
  for each row
  execute function public.set_updated_at();
