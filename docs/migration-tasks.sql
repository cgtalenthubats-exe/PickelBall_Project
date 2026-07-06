-- ============================================================
-- MIGRATION: staff task / checklist board
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================
create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  court_id uuid references public.courts(id) on delete set null,
  title text not null,
  scheduled_time text,                       -- e.g. "07:30"
  category text not null default 'cleaning', -- cleaning | prep | check
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.staff_tasks enable row level security;

do $$ begin
  create policy staff_tasks_rw on public.staff_tasks
    for all using (public.is_staff()) with check (public.is_staff());
exception when duplicate_object then null; end $$;
