create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 5000),
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date date,
  all_day boolean not null default false,
  timezone text not null default 'Europe/Sofia' check (char_length(timezone) between 1 and 80),
  location text check (location is null or char_length(location) <= 240),
  category text not null default 'personal' check (char_length(category) between 1 and 40),
  color text not null default 'violet' check (color in ('violet','indigo','rose','amber','emerald','slate')),
  recurrence_kind text not null default 'none' check (recurrence_kind in ('none','daily','weekly','monthly','yearly')),
  recurrence_interval smallint not null default 1 check (recurrence_interval between 1 and 365),
  recurrence_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_time_shape check (
    (all_day and start_date is not null and end_date is not null and starts_at is null and ends_at is null and end_date >= start_date)
    or
    (not all_day and starts_at is not null and ends_at is not null and start_date is null and end_date is null and ends_at > starts_at)
  )
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  due_date date,
  due_time time,
  timezone text not null default 'Europe/Sofia' check (char_length(timezone) between 1 and 80),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  category text check (category is null or char_length(category) <= 40),
  completed boolean not null default false,
  completed_at timestamptz,
  recurrence_kind text not null default 'none' check (recurrence_kind in ('none','daily','weekly','monthly','yearly')),
  recurrence_interval smallint not null default 1 check (recurrence_interval between 1 and 365),
  recurrence_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_completion_shape check ((completed and completed_at is not null) or (not completed and completed_at is null)),
  constraint task_time_requires_date check (due_time is null or due_date is not null)
);

create table if not exists public.birthdays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null check (char_length(person_name) between 1 and 160),
  birth_date date not null,
  birth_year_known boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_owner_starts_idx on public.calendar_events(owner_id, starts_at);
create index if not exists calendar_events_owner_dates_idx on public.calendar_events(owner_id, start_date, end_date);
create index if not exists calendar_events_owner_recurrence_idx on public.calendar_events(owner_id, recurrence_kind, recurrence_end);
create index if not exists tasks_owner_due_idx on public.tasks(owner_id, due_date, completed);
create index if not exists tasks_owner_recurrence_idx on public.tasks(owner_id, recurrence_kind, recurrence_end);
create index if not exists birthdays_owner_date_idx on public.birthdays(owner_id, birth_date);

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
drop trigger if exists birthdays_set_updated_at on public.birthdays;
create trigger birthdays_set_updated_at before update on public.birthdays
for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;
alter table public.tasks enable row level security;
alter table public.birthdays enable row level security;

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.birthdays to authenticated;

create policy "Owners manage calendar events" on public.calendar_events for all
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage tasks" on public.tasks for all
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners manage birthdays" on public.birthdays for all
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
