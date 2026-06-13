-- Eden 2.0 — Schema Additions
-- Run this after schema.sql in your Supabase SQL editor

-- ────────────────────────────────────────────────
-- USER MEMORIES
-- Facts Eden learns about the person over time.
-- Populated by onboarding + background memory extraction after each chat turn.
-- ────────────────────────────────────────────────
create table public.user_memories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null check (category in (
    'personal', 'emotional', 'preference', 'struggle', 'pattern', 'goal', 'win', 'relationship'
  )),
  memory text not null,
  source text not null default 'conversation' check (source in ('onboarding', 'conversation')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_memories enable row level security;
create policy "Users manage own memories" on public.user_memories for all using (auth.uid() = user_id);

create index user_memories_user_id_idx on public.user_memories (user_id);
create index user_memories_updated_at_idx on public.user_memories (updated_at desc);

-- ────────────────────────────────────────────────
-- CHAT SUMMARIES
-- Rolling narrative summaries of older conversation history.
-- Generated when chat_messages exceeds the context window.
-- ────────────────────────────────────────────────
create table public.chat_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  summary text not null,
  message_count integer not null default 0,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.chat_summaries enable row level security;
create policy "Users manage own summaries" on public.chat_summaries for all using (auth.uid() = user_id);

create index chat_summaries_user_id_idx on public.chat_summaries (user_id);
