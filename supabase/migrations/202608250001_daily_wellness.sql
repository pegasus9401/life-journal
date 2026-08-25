create table if not exists public.daily_wellness (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  sleep_hours numeric(4,2) not null default 0 check (sleep_hours between 0 and 24),
  sleep_quality integer not null default 3 check (sleep_quality between 1 and 5),
  energy integer not null default 3 check (energy between 1 and 5),
  soreness integer not null default 1 check (soreness between 1 and 5),
  stress integer not null default 2 check (stress between 1 and 5),
  resting_heart_rate integer check (resting_heart_rate between 25 and 220),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, entry_date)
);

alter table public.daily_wellness enable row level security;
drop policy if exists "Owners manage daily wellness" on public.daily_wellness;
create policy "Owners manage daily wellness" on public.daily_wellness for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create index if not exists daily_wellness_owner_date_idx on public.daily_wellness(owner_id, entry_date desc);

