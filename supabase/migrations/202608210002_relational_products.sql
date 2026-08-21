create table if not exists public.products (
  id text not null check (char_length(id) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  brand text not null default '' check (char_length(brand) <= 120),
  barcode text not null default '' check (char_length(barcode) <= 14),
  package_size text not null default '' check (char_length(package_size) <= 80),
  serving_grams numeric(10,2) not null default 100 check (serving_grams between 0 and 100000),
  calories_100g numeric(10,2) not null default 0 check (calories_100g between 0 and 100000),
  protein_100g numeric(8,2) not null default 0 check (protein_100g between 0 and 1000),
  carbs_100g numeric(8,2) not null default 0 check (carbs_100g between 0 and 1000),
  fat_100g numeric(8,2) not null default 0 check (fat_100g between 0 and 1000),
  source text not null default 'Добавен ръчно' check (source in ('Open Food Facts', 'USDA', 'AI от снимка', 'Добавен ръчно')),
  image_url text not null default '' check (char_length(image_url) <= 1000),
  image_path text not null default '' check (char_length(image_path) <= 500),
  favorite boolean not null default false,
  legacy_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.product_prices (
  id text not null check (char_length(id) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  price numeric(12,2) not null check (price > 0 and price <= 100000),
  store text not null default '' check (char_length(store) <= 120),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, product_id) references public.products(owner_id, id) on delete cascade
);

create index if not exists products_owner_updated_idx on public.products(owner_id, updated_at desc);
create index if not exists products_owner_barcode_idx on public.products(owner_id, barcode) where barcode <> '';
create index if not exists product_prices_product_date_idx on public.product_prices(owner_id, product_id, recorded_at desc);

insert into public.products (
  id, owner_id, name, brand, barcode, package_size, serving_grams, calories_100g,
  protein_100g, carbs_100g, fat_100g, source, image_url, image_path, favorite,
  legacy_source, created_at, updated_at
)
select
  left(coalesce(nullif(item->>'id', ''), gen_random_uuid()::text), 80),
  users.id,
  left(item->>'name', 160),
  left(coalesce(item->>'brand', ''), 120),
  left(regexp_replace(coalesce(item->>'barcode', ''), '\D', '', 'g'), 14),
  left(coalesce(item->>'packageSize', ''), 80),
  case when coalesce(item->>'servingGrams', '') ~ '^\d+(\.\d+)?$' then least(100000, (item->>'servingGrams')::numeric) else 100 end,
  case when coalesce(item->>'calories100g', '') ~ '^\d+(\.\d+)?$' then least(100000, (item->>'calories100g')::numeric) else 0 end,
  case when coalesce(item->>'protein100g', '') ~ '^\d+(\.\d+)?$' then least(1000, (item->>'protein100g')::numeric) else 0 end,
  case when coalesce(item->>'carbs100g', '') ~ '^\d+(\.\d+)?$' then least(1000, (item->>'carbs100g')::numeric) else 0 end,
  case when coalesce(item->>'fat100g', '') ~ '^\d+(\.\d+)?$' then least(1000, (item->>'fat100g')::numeric) else 0 end,
  case when item->>'source' in ('Open Food Facts', 'USDA', 'AI от снимка', 'Добавен ръчно') then item->>'source' else 'Добавен ръчно' end,
  left(coalesce(item->>'imageUrl', ''), 1000),
  left(coalesce(item->>'imagePath', ''), 500),
  coalesce((item->>'favorite')::boolean, false),
  'auth.user_metadata.food_products',
  case when coalesce(item->>'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (item->>'createdAt')::timestamptz else now() end,
  case when coalesce(item->>'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (item->>'updatedAt')::timestamptz else now() end
from auth.users users
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(users.raw_user_meta_data->'food_products') = 'array' then users.raw_user_meta_data->'food_products' else '[]'::jsonb end
) item
where nullif(trim(item->>'name'), '') is not null
on conflict (owner_id, id) do nothing;

insert into public.product_prices (id, owner_id, product_id, price, store, recorded_at)
select
  left(coalesce(nullif(price_item->>'id', ''), gen_random_uuid()::text), 80),
  users.id,
  products.id,
  least(100000, (price_item->>'price')::numeric),
  left(coalesce(price_item->>'store', ''), 120),
  case when coalesce(price_item->>'recordedAt', '') ~ '^\d{4}-\d{2}-\d{2}$' then (price_item->>'recordedAt')::date else current_date end
from auth.users users
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(users.raw_user_meta_data->'food_products') = 'array' then users.raw_user_meta_data->'food_products' else '[]'::jsonb end
) product_item
join public.products products on products.owner_id = users.id and products.id = left(product_item->>'id', 80)
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(product_item->'priceHistory') = 'array' then product_item->'priceHistory' else '[]'::jsonb end
) price_item
where coalesce(price_item->>'price', '') ~ '^\d+(\.\d+)?$' and (price_item->>'price')::numeric > 0
on conflict (owner_id, id) do nothing;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_prices enable row level security;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_prices to authenticated;

create policy "Owners manage products" on public.products for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage product prices" on public.product_prices for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);


