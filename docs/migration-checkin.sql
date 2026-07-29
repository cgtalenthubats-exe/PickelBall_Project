-- ============================================================
-- MIGRATION: court check-in — customer shows their booking QR (the same
-- order_token already used for merchandise ordering) to staff, staff scans
-- it with their own phone, and the system marks the booking as arrived.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

alter table public.bookings add column if not exists checked_in_at timestamptz;
alter table public.bookings add column if not exists checked_in_by uuid references public.profiles(id);
