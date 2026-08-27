create table if not exists public.ai_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  persona text not null default 'friend' check (persona in ('friend', 'guardian', 'data_nerd', 'commander')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Нов разговор' check (char_length(title) between 1 and 160),
  persona text not null default 'friend' check (persona in ('friend', 'guardian', 'data_nerd', 'commander')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('goal', 'preference', 'training', 'nutrition', 'routine', 'communication')),
  content text not null check (char_length(content) between 1 and 1000),
  keywords text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  tool_name text not null check (char_length(tool_name) between 1 and 100),
  arguments jsonb not null default '{}'::jsonb,
  preview jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'failed', 'cancelled')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_owner_updated_idx on public.ai_conversations(owner_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_memories_owner_enabled_idx on public.ai_memories(owner_id, enabled, updated_at desc);
create index if not exists ai_memories_keywords_idx on public.ai_memories using gin(keywords);
create index if not exists ai_actions_owner_created_idx on public.ai_actions(owner_id, created_at desc);

drop trigger if exists ai_preferences_set_updated_at on public.ai_preferences;
create trigger ai_preferences_set_updated_at before update on public.ai_preferences for each row execute function public.set_updated_at();
drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
drop trigger if exists ai_memories_set_updated_at on public.ai_memories;
create trigger ai_memories_set_updated_at before update on public.ai_memories for each row execute function public.set_updated_at();
drop trigger if exists ai_actions_set_updated_at on public.ai_actions;
create trigger ai_actions_set_updated_at before update on public.ai_actions for each row execute function public.set_updated_at();

alter table public.ai_preferences enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_memories enable row level security;
alter table public.ai_actions enable row level security;

grant select, insert, update, delete on public.ai_preferences, public.ai_conversations, public.ai_messages, public.ai_memories, public.ai_actions to authenticated;

create policy "Owners manage AI preferences" on public.ai_preferences for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage AI conversations" on public.ai_conversations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage AI messages" on public.ai_messages for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage AI memories" on public.ai_memories for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage AI actions" on public.ai_actions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

insert into public.ai_preferences (owner_id)
select id from auth.users
on conflict (owner_id) do nothing;
