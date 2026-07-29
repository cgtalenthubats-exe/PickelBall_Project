-- ============================================================
-- MIGRATION: audit trail — which staff operator created/confirmed a
-- transaction, so accounting can trace who did what and on which channel.
-- Requires migration-pos-orders.sql + migration-staff-orders.sql.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

alter table public.orders add column if not exists created_by uuid references public.profiles(id);
alter table public.orders add column if not exists confirmed_by uuid references public.profiles(id);
alter table public.payments add column if not exists created_by uuid references public.profiles(id);
