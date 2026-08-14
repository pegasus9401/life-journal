create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  title text not null check (char_length(title) between 1 and 160),
  workout_type text not null default 'strength' check (workout_type in ('strength','cardio','mobility','sport','other')),
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440),
  calories_burned integer not null default 0 check (calories_burned between 0 and 100000),
  notes text check (notes is null or char_length(notes) <= 3000),
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_owner_date_idx on public.workout_sessions(owner_id, workout_date);
drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at before update on public.workout_sessions for each row execute function public.set_updated_at();
alter table public.workout_sessions enable row level security;
grant select, insert, update, delete on public.workout_sessions to authenticated;
create policy "Owners manage workout sessions" on public.workout_sessions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
