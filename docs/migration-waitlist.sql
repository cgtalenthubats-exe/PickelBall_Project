-- ============================================================
-- MIGRATION: Open Play waitlist (MVP — no auto-notify/expiry yet)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.open_play_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting', -- waiting | contacted | cancelled
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.waitlist enable row level security;

do $$ begin
  create policy waitlist_select on public.waitlist
    for select using (user_id = auth.uid() or public.is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy waitlist_insert_own on public.waitlist
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy waitlist_staff_manage on public.waitlist
    for delete using (public.is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy waitlist_staff_update on public.waitlist
    for update using (public.is_staff()) with check (public.is_staff());
exception when duplicate_object then null; end $$;

-- NOTE (MVP scope): no automatic promotion/expiry/notification when a spot
-- opens up. Staff see who's waiting in Admin -> Sessions and contact them
-- manually. Auto-notify (LINE push + time-limited hold) is a Phase 2 item —
-- see docs/line-integration.md.
