-- Add parent_id to cleaning_tasks for subtask grouping (from space scan feature)
alter table public.cleaning_tasks
  add column if not exists parent_id uuid references public.cleaning_tasks(id) on delete cascade;
