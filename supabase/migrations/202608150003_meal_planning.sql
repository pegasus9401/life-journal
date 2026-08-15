create table if not exists public.daily_meal_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date date not null,
  menu_name text not null,
  selections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, plan_date)
);

alter table public.daily_meal_plans enable row level security;
grant select, insert, update, delete on public.daily_meal_plans to authenticated;

drop policy if exists "Owners can view meal plans" on public.daily_meal_plans;
drop policy if exists "Owners can insert meal plans" on public.daily_meal_plans;
drop policy if exists "Owners can update meal plans" on public.daily_meal_plans;
drop policy if exists "Owners can delete meal plans" on public.daily_meal_plans;
create policy "Owners can view meal plans" on public.daily_meal_plans for select using (auth.uid() = owner_id);
create policy "Owners can insert meal plans" on public.daily_meal_plans for insert with check (auth.uid() = owner_id);
create policy "Owners can update meal plans" on public.daily_meal_plans for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners can delete meal plans" on public.daily_meal_plans for delete using (auth.uid() = owner_id);
create index if not exists daily_meal_plans_owner_date_idx on public.daily_meal_plans(owner_id, plan_date);
