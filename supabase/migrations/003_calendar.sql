-- Calendar events table
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  event_date  date not null,
  start_time  time,
  end_time    time,
  all_day     boolean not null default true,
  color       text not null default 'pink',
  created_at  timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "Users can view their own events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own events"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on public.calendar_events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

create index if not exists calendar_events_user_date_idx
  on public.calendar_events (user_id, event_date);
