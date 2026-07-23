-- ============================================================
-- MIGRATION: in-app notifications (waitlist auto-notify MVP)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general',   -- 'waitlist_slot' | 'general'
  title text not null,
  body text,
  link text,                              -- in-app path e.g. /venues/ladprao/book
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read);

alter table public.notifications enable row level security;

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid());
-- Inserts come from server-side code (service role) or staff actions.
drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff on public.notifications
  for insert with check (public.is_staff());

-- Track that a waitlist entry has been told about a free seat, so repeated
-- releases don't spam the same person.
alter table public.waitlist add column if not exists notified_at timestamptz;
