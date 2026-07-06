-- ============================================================
-- MIGRATION: court purpose (private vs reserved-for-open-play)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================
alter table public.courts
  add column if not exists purpose text not null default 'private';
-- purpose: 'private' = bookable as a private court
--          'open_play' = reserved for Open Play sessions

-- (optional) if a venue's existing court B was meant for Open Play, set it:
-- update public.courts set purpose = 'open_play' where name = 'B';
