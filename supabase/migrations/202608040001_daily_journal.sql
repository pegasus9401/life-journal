create extension if not exists pgcrypto;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text not null check (char_length(title) between 1 and 140),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  mood text check (mood is null or mood in ('joyful','peaceful','excited','reflective','tired','challenging')),
  weather text check (weather is null or char_length(weather) <= 80),
  location_name text check (location_name is null or char_length(location_name) <= 160),
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_entry_has_timestamp check (
    (status = 'draft' and published_at is null) or
    (status = 'published' and published_at is not null)
  )
);

create table if not exists public.journal_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type like 'image/%'),
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  width integer,
  height integer,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_owner_date_idx
  on public.journal_entries(owner_id, entry_date desc, created_at desc);
create index if not exists journal_entries_owner_status_idx
  on public.journal_entries(owner_id, status);
create index if not exists journal_entries_tags_idx
  on public.journal_entries using gin(tags);
create index if not exists journal_photos_entry_position_idx
  on public.journal_photos(entry_id, position);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;
alter table public.journal_photos enable row level security;

create policy "Users read their journal entries" on public.journal_entries
for select using (auth.uid() = owner_id);
create policy "Users create their journal entries" on public.journal_entries
for insert with check (auth.uid() = owner_id);
create policy "Users update their journal entries" on public.journal_entries
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users delete their journal entries" on public.journal_entries
for delete using (auth.uid() = owner_id);

create policy "Users read their journal photos" on public.journal_photos
for select using (auth.uid() = owner_id);
create policy "Users create their journal photos" on public.journal_photos
for insert with check (
  auth.uid() = owner_id and exists (
    select 1 from public.journal_entries
    where journal_entries.id = entry_id and journal_entries.owner_id = auth.uid()
  )
);
create policy "Users update their journal photos" on public.journal_photos
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users delete their journal photos" on public.journal_photos
for delete using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-photos',
  'journal-photos',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their journal photo objects" on storage.objects
for select using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload their journal photo objects" on storage.objects
for insert with check (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update their journal photo objects" on storage.objects
for update using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their journal photo objects" on storage.objects
for delete using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
