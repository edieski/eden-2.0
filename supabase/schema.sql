-- Eden 2.0 Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────
-- USER PROFILES
-- ────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default 'Beautiful Soul',
  avatar_url text,
  chibi_name text not null default 'Eden',
  chibi_outfit text not null default 'default',
  chibi_level integer not null default 1,
  chibi_xp integer not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Beautiful Soul'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────
-- MILESTONES
-- ────────────────────────────────────────────────
create table public.milestones (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  pillar text not null default 'health',
  phase integer not null default 1,
  target_date date,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.milestones enable row level security;
create policy "Users manage own milestones" on public.milestones for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- HABITS
-- ────────────────────────────────────────────────
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  milestone_id uuid references public.milestones on delete set null,
  title text not null,
  pillar text not null default 'health',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekdays', 'weekends', 'custom')),
  custom_days integer[],
  color text not null default '#F2C4CE',
  icon text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;
create policy "Users manage own habits" on public.habits for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- HABIT LOGS
-- ────────────────────────────────────────────────
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique(habit_id, date)
);

alter table public.habit_logs enable row level security;
create policy "Users manage own habit logs" on public.habit_logs for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- ROUTINES
-- ────────────────────────────────────────────────
create table public.routines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default 'morning' check (type in ('morning', 'evening', 'custom')),
  items jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.routines enable row level security;
create policy "Users manage own routines" on public.routines for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- ROUTINE LOGS
-- ────────────────────────────────────────────────
create table public.routine_logs (
  id uuid default uuid_generate_v4() primary key,
  routine_id uuid references public.routines on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  completed_items text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(routine_id, date)
);

alter table public.routine_logs enable row level security;
create policy "Users manage own routine logs" on public.routine_logs for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- FOOD LOGS
-- ────────────────────────────────────────────────
create table public.food_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  meal_type text not null default 'snack' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  hunger_before integer check (hunger_before between 1 and 10),
  hunger_after integer check (hunger_after between 1 and 10),
  mood text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.food_logs enable row level security;
create policy "Users manage own food logs" on public.food_logs for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- MEAL PLANS
-- ────────────────────────────────────────────────
create table public.meal_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_start date not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null,
  description text,
  recipe_url text,
  created_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;
create policy "Users manage own meal plans" on public.meal_plans for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- NOTES
-- ────────────────────────────────────────────────
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'Untitled',
  content text not null default '',
  pillar text,
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- CHAT MESSAGES
-- ────────────────────────────────────────────────
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create policy "Users manage own messages" on public.chat_messages for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- VISION BOARD
-- ────────────────────────────────────────────────
create table public.vision_board_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('image', 'text', 'affirmation')),
  content text not null default '',
  url text,
  position_x float not null default 0,
  position_y float not null default 0,
  width float not null default 200,
  height float not null default 200,
  rotation float not null default 0,
  z_index integer not null default 0,
  bg_color text,
  text_color text,
  created_at timestamptz not null default now()
);

alter table public.vision_board_items enable row level security;
create policy "Users manage own vision board" on public.vision_board_items for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- CLEANING TASKS
-- ────────────────────────────────────────────────
create table public.cleaning_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  room text not null,
  title text not null,
  description text,
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly', 'biweekly', 'monthly')),
  duration_minutes integer not null default 15,
  is_minimum_viable boolean not null default false,
  order_index integer not null default 0,
  parent_id uuid references public.cleaning_tasks(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.cleaning_tasks enable row level security;
create policy "Users manage own cleaning tasks" on public.cleaning_tasks for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- CLEANING LOGS
-- ────────────────────────────────────────────────
create table public.cleaning_logs (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.cleaning_tasks on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.cleaning_logs enable row level security;
create policy "Users manage own cleaning logs" on public.cleaning_logs for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- DISCIPLINE REVIEWS (Weekly)
-- ────────────────────────────────────────────────
create table public.discipline_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_start date not null,
  wins text not null default '',
  struggles text not null default '',
  intentions text not null default '',
  pillar_ratings jsonb not null default '{}',
  overall_mood integer check (overall_mood between 1 and 5),
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.discipline_reviews enable row level security;
create policy "Users manage own reviews" on public.discipline_reviews for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- TODOS
-- ────────────────────────────────────────────────
create table public.todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  text text not null,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  parent_id uuid references public.todos(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Migration (run if table already exists):
-- alter table public.todos add column if not exists parent_id uuid references public.todos(id) on delete cascade;

alter table public.todos enable row level security;
create policy "Users manage own todos" on public.todos for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- USER MEMORIES (AI Long-term Memory)
-- Extracted by Eden after each conversation turn.
-- See supabase/migrations/001_memory.sql
-- ────────────────────────────────────────────────
-- create table public.user_memories ( ... ) — defined in migrations/001_memory.sql

-- ────────────────────────────────────────────────
-- CHAT SUMMARIES (Conversation Compression)
-- Summaries of older messages beyond the context window.
-- See supabase/migrations/001_memory.sql
-- ────────────────────────────────────────────────
-- create table public.chat_summaries ( ... ) — defined in migrations/001_memory.sql

-- ────────────────────────────────────────────────
-- STORAGE BUCKET
-- ────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('vision-board', 'vision-board', true);
create policy "Authenticated users can upload" on storage.objects for insert with check (bucket_id = 'vision-board' and auth.role() = 'authenticated');
create policy "Public can read vision board" on storage.objects for select using (bucket_id = 'vision-board');
create policy "Users can delete own files" on storage.objects for delete using (bucket_id = 'vision-board' and auth.uid()::text = (storage.foldername(name))[1]);
