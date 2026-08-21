create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  instructions text not null default '' check (char_length(instructions) <= 10000),
  servings numeric(8,2) not null default 1 check (servings > 0 and servings <= 1000),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  product_id text not null,
  quantity numeric(10,2) not null check (quantity > 0 and quantity <= 100000),
  unit text not null default 'g' check (char_length(unit) between 1 and 30),
  grams numeric(10,2) not null check (grams > 0 and grams <= 100000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete cascade,
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete restrict
);

create index if not exists recipes_owner_updated_idx on public.recipes(owner_id, updated_at desc);
create index if not exists recipe_ingredients_recipe_position_idx on public.recipe_ingredients(owner_id, recipe_id, position);
create index if not exists recipe_ingredients_product_idx on public.recipe_ingredients(owner_id, product_id);

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at before update on public.recipes for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;

create policy "Owners manage recipes" on public.recipes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage recipe ingredients" on public.recipe_ingredients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);


