-- Extends the existing workout_sessions life event without replacing legacy data.
alter table public.workout_sessions add column if not exists status text;
alter table public.workout_sessions add column if not exists scheduled_at timestamptz;
alter table public.workout_sessions add column if not exists started_at timestamptz;
alter table public.workout_sessions add column if not exists completed_at timestamptz;
alter table public.workout_sessions add column if not exists skipped_at timestamptz;
alter table public.workout_sessions add column if not exists source text not null default 'pegasos';

update public.workout_sessions
set status = case when completed then 'completed' else 'planned' end
where status is null;

alter table public.workout_sessions alter column status set default 'planned';
alter table public.workout_sessions alter column status set not null;
alter table public.workout_sessions drop constraint if exists workout_sessions_status_check;
alter table public.workout_sessions add constraint workout_sessions_status_check
  check (status in ('planned', 'in_progress', 'completed', 'skipped', 'cancelled'));

update public.workout_sessions
set completed_at = updated_at
where status = 'completed' and completed_at is null;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  workout_type text not null default 'strength' check (workout_type in ('strength','cardio','mobility','sport','other')),
  estimated_minutes integer not null default 0 check (estimated_minutes between 0 and 1440),
  default_rest_seconds integer not null default 60 check (default_rest_seconds between 0 and 3600),
  notes text check (notes is null or char_length(notes) <= 3000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_key text not null,
  name text not null check (char_length(name) between 1 and 160),
  muscle_group text not null default 'other',
  position integer not null default 0,
  target_sets integer not null default 3 check (target_sets between 1 and 100),
  target_reps_min integer check (target_reps_min between 1 and 1000),
  target_reps_max integer check (target_reps_max between 1 and 1000),
  rest_seconds integer not null default 60 check (rest_seconds between 0 and 3600),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, position)
);

alter table public.workout_sessions add column if not exists workout_template_id uuid references public.workout_templates(id) on delete set null;

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  template_exercise_id uuid references public.workout_template_exercises(id) on delete set null,
  exercise_key text not null,
  exercise_name text not null check (char_length(exercise_name) between 1 and 160),
  muscle_group text not null default 'other',
  set_number integer not null check (set_number between 1 and 100),
  weight_kg numeric(10,3) not null default 0 check (weight_kg >= 0),
  reps integer not null default 0 check (reps >= 0),
  distance_km numeric(10,3) check (distance_km is null or distance_km >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_session_id, exercise_key, set_number)
);

create index if not exists workout_sessions_owner_status_date_idx on public.workout_sessions(owner_id, status, workout_date desc);
create index if not exists workout_sessions_owner_scheduled_idx on public.workout_sessions(owner_id, scheduled_at) where scheduled_at is not null;
create index if not exists workout_sets_owner_session_idx on public.workout_sets(owner_id, workout_session_id);
create index if not exists workout_sets_owner_exercise_idx on public.workout_sets(owner_id, exercise_key, completed_at desc);
create index if not exists workout_template_exercises_template_position_idx on public.workout_template_exercises(template_id, position);

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at before update on public.workout_templates for each row execute function public.set_updated_at();
drop trigger if exists workout_template_exercises_set_updated_at on public.workout_template_exercises;
create trigger workout_template_exercises_set_updated_at before update on public.workout_template_exercises for each row execute function public.set_updated_at();
drop trigger if exists workout_sets_set_updated_at on public.workout_sets;
create trigger workout_sets_set_updated_at before update on public.workout_sets for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_sets enable row level security;
grant select, insert, update, delete on public.workout_templates, public.workout_template_exercises, public.workout_sets to authenticated;
drop policy if exists "Owners manage workout templates" on public.workout_templates;
create policy "Owners manage workout templates" on public.workout_templates for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners manage workout template exercises" on public.workout_template_exercises;
create policy "Owners manage workout template exercises" on public.workout_template_exercises for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners manage workout sets" on public.workout_sets;
create policy "Owners manage workout sets" on public.workout_sets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
