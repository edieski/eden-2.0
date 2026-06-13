-- Eden 2.0 — Memory System Migration
-- Run this in your Supabase SQL editor after schema.sql

-- ────────────────────────────────────────────────
-- USER MEMORIES
-- Extracted facts/patterns Eden learns about you over time.
-- Auto-populated by the AI after each conversation turn.
-- ────────────────────────────────────────────────
create table public.user_memories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null check (category in (
    'personal',    -- facts: name, age, location, job, relationships
    'emotional',   -- emotional patterns, triggers, needs
    'preference',  -- likes, dislikes, communication style
    'struggle',    -- ongoing challenges, recurring difficulties
    'pattern',     -- behavioral patterns Eden has noticed
    'goal',        -- aspirations, things they want to work toward
    'win',         -- victories, breakthroughs, moments of growth
    'relationship' -- people in their life, dynamics
  )),
  memory text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_memories enable row level security;
create policy "Users manage own memories" on public.user_memories for all using (auth.uid() = user_id);
create index user_memories_user_id_idx on public.user_memories(user_id, created_at desc);

-- ────────────────────────────────────────────────
-- CHAT SUMMARIES
-- Compressed summaries of older conversation chunks.
-- Used when message history exceeds the context window.
-- ────────────────────────────────────────────────
create table public.chat_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  summary text not null,
  message_count integer not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.chat_summaries enable row level security;
create policy "Users manage own summaries" on public.chat_summaries for all using (auth.uid() = user_id);
create index chat_summaries_user_id_idx on public.chat_summaries(user_id, created_at desc);
