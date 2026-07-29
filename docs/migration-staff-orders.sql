-- ============================================================
-- MIGRATION: staff-initiated POS orders (walk-in, optionally not tied to
-- any court/booking — e.g. a customer just buying a drink at the counter).
-- Requires migration-pos-orders.sql. Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

alter table public.orders alter column booking_id drop not null;
