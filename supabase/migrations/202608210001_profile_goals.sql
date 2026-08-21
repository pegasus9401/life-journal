create table if not exists public.profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 100),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 500),
  birth_date date,
  sex text check (sex is null or sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 50 and 300),
  current_weight_kg numeric(6,2) check (current_weight_kg is null or current_weight_kg between 20 and 500),
  starting_weight_kg numeric(6,2) check (starting_weight_kg is null or starting_weight_kg between 20 and 500),
  target_weight_kg numeric(6,2) check (target_weight_kg is null or target_weight_kg between 20 and 500),
  activity_level text check (activity_level is null or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  fitness_goal text check (fitness_goal is null or fitness_goal in ('lose_weight', 'maintain', 'gain_muscle', 'improve_fitness')),
  timezone text not null default 'Europe/Sofia' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_goals (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  calorie_goal integer not null default 2200 check (calorie_goal between 1 and 100000),
  protein_goal_g numeric(8,1) not null default 140 check (protein_goal_g >= 0),
  carbs_goal_g numeric(8,1) not null default 240 check (carbs_goal_g >= 0),
  fat_goal_g numeric(8,1) not null default 70 check (fat_goal_g >= 0),
  water_goal_ml integer not null default 2000 check (water_goal_ml between 0 and 20000),
  steps_goal integer not null default 8000 check (steps_goal between 0 and 200000),
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (owner_id)
select id from auth.users
on conflict (owner_id) do nothing;

insert into public.user_goals (owner_id, calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, source)
select owner_id, calorie_goal, protein_goal, carbs_goal, fat_goal, 'manual'
from public.nutrition_goals
on conflict (owner_id) do nothing;

insert into public.user_goals (owner_id)
select id from auth.users
on conflict (owner_id) do nothing;

create or replace function public.bootstrap_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (owner_id) values (new.id) on conflict do nothing;
  insert into public.user_goals (owner_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_bootstrap_profile on auth.users;
create trigger auth_user_bootstrap_profile
after insert on auth.users
for each row execute function public.bootstrap_user_profile();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists user_goals_set_updated_at on public.user_goals;
create trigger user_goals_set_updated_at before update on public.user_goals for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_goals to authenticated;

create policy "Owners manage profile" on public.profiles for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage user goals" on public.user_goals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

