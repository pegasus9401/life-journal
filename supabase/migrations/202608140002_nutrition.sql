create table if not exists public.nutrition_goals (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  calorie_goal integer not null default 2200 check (calorie_goal between 1 and 100000),
  protein_goal numeric(8,1) not null default 140 check (protein_goal >= 0),
  carbs_goal numeric(8,1) not null default 240 check (carbs_goal >= 0),
  fat_goal numeric(8,1) not null default 70 check (fat_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(name) between 1 and 160),
  quantity text check (quantity is null or char_length(quantity) <= 80),
  calories integer not null default 0 check (calories between 0 and 100000),
  protein_g numeric(8,1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(8,1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(8,1) not null default 0 check (fat_g >= 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_entries_owner_date_idx on public.nutrition_entries(owner_id, entry_date, meal_type);

drop trigger if exists nutrition_goals_set_updated_at on public.nutrition_goals;
create trigger nutrition_goals_set_updated_at before update on public.nutrition_goals for each row execute function public.set_updated_at();
drop trigger if exists nutrition_entries_set_updated_at on public.nutrition_entries;
create trigger nutrition_entries_set_updated_at before update on public.nutrition_entries for each row execute function public.set_updated_at();

alter table public.nutrition_goals enable row level security;
alter table public.nutrition_entries enable row level security;
grant select, insert, update, delete on public.nutrition_goals to authenticated;
grant select, insert, update, delete on public.nutrition_entries to authenticated;

create policy "Owners manage nutrition goals" on public.nutrition_goals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage nutrition entries" on public.nutrition_entries for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
