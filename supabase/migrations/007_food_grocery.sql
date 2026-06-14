-- Meal ingredients and grocery list for photo-based menu planning

alter table public.meal_plans
  add column if not exists source text not null default 'manual',
  add column if not exists image_url text;

create table public.meal_ingredients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  meal_plan_id uuid references public.meal_plans on delete cascade not null,
  name text not null,
  quantity text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.meal_ingredients enable row level security;
create policy "Users manage own meal ingredients" on public.meal_ingredients for all using (auth.uid() = user_id);

create table public.grocery_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_start date not null,
  name text not null,
  quantity text,
  category text not null default 'other',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.grocery_items enable row level security;
create policy "Users manage own grocery items" on public.grocery_items for all using (auth.uid() = user_id);
