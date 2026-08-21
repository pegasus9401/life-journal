create table if not exists public.day_meals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  name text not null check (char_length(name) between 1 and 100),
  planned_time time,
  position integer not null default 0 check (position >= 0),
  legacy_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  day_meal_id uuid not null,
  item_type text not null check (item_type in ('product', 'recipe')),
  product_id text,
  recipe_id uuid,
  label text not null check (char_length(label) between 1 and 200),
  quantity numeric(10,2) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (char_length(unit) between 1 and 30),
  calories numeric(12,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  foreign key (owner_id, day_meal_id) references public.day_meals(owner_id, id) on delete cascade,
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete restrict,
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete restrict,
  check ((item_type = 'product' and product_id is not null and recipe_id is null) or (item_type = 'recipe' and recipe_id is not null and product_id is null))
);

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, name)
);

create table if not exists public.template_meals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  planned_time time,
  position integer not null default 0 check (position >= 0),
  foreign key (owner_id, template_id) references public.meal_templates(owner_id, id) on delete cascade,
  unique (owner_id, id)
);

create table if not exists public.template_meal_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_meal_id uuid not null,
  item_type text not null check (item_type in ('product', 'recipe')),
  product_id text,
  recipe_id uuid,
  label text not null check (char_length(label) between 1 and 200),
  quantity numeric(10,2) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (char_length(unit) between 1 and 30),
  calories numeric(12,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  position integer not null default 0 check (position >= 0),
  foreign key (owner_id, template_meal_id) references public.template_meals(owner_id, id) on delete cascade,
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete restrict,
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete restrict,
  check ((item_type = 'product' and product_id is not null and recipe_id is null) or (item_type = 'recipe' and recipe_id is not null and product_id is null))
);

create index if not exists day_meals_owner_date_position_idx on public.day_meals(owner_id, meal_date, position);
create index if not exists meal_items_meal_position_idx on public.meal_items(owner_id, day_meal_id, position);
create index if not exists template_meals_template_position_idx on public.template_meals(owner_id, template_id, position);
create index if not exists template_meal_items_meal_position_idx on public.template_meal_items(owner_id, template_meal_id, position);

insert into public.day_meals (owner_id, meal_date, name, position, legacy_payload)
select plans.owner_id, plans.plan_date, left(plans.menu_name, 100), 0,
  jsonb_build_object(
    'source', 'daily_meal_plans', 'legacy_id', plans.id, 'menu_name', plans.menu_name, 'selections', plans.selections,
    'custom_menu', users.raw_user_meta_data->'custom_meal_menus'->plans.menu_name,
    'nutrition', users.raw_user_meta_data->'meal_menu_nutrition'->plans.menu_name
  )
from public.daily_meal_plans plans
join auth.users users on users.id = plans.owner_id
where not exists (
  select 1 from public.day_meals meals
  where meals.owner_id = plans.owner_id and meals.legacy_payload->>'legacy_id' = plans.id::text
);

drop trigger if exists day_meals_set_updated_at on public.day_meals;
create trigger day_meals_set_updated_at before update on public.day_meals for each row execute function public.set_updated_at();
drop trigger if exists meal_templates_set_updated_at on public.meal_templates;
create trigger meal_templates_set_updated_at before update on public.meal_templates for each row execute function public.set_updated_at();

alter table public.day_meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_templates enable row level security;
alter table public.template_meals enable row level security;
alter table public.template_meal_items enable row level security;
grant select, insert, update, delete on public.day_meals, public.meal_items, public.meal_templates, public.template_meals, public.template_meal_items to authenticated;

create policy "Owners manage day meals" on public.day_meals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage meal items" on public.meal_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage meal templates" on public.meal_templates for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage template meals" on public.template_meals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage template meal items" on public.template_meal_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);


