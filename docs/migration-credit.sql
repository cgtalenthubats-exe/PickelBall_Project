-- ============================================================
-- MIGRATION: store credit (refund wallet) + credit-at-checkout
-- Requires migration-roles.sql. Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Refunds become wallet credit (แต้ม) instead of money moving back —
-- no top-up path exists by design, so this is not e-money.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  change numeric(10,2) not null,      -- + refund grant / - spend
  reason text not null,               -- 'refund_booking' | 'refund_order' | 'spend_booking' | 'spend_order' | 'manual'
  ref_id uuid,                        -- booking/order id
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_ledger_user on public.credit_ledger(user_id);

alter table public.credit_ledger enable row level security;

-- Users see their own wallet; staff see wallets (for CRM/refund screens).
drop policy if exists credit_read on public.credit_ledger;
create policy credit_read on public.credit_ledger
  for select using (user_id = auth.uid() or public.is_staff());
-- Grants/spends are written by manager+ (refund actions) — checkout spends
-- go through the service role and bypass RLS.
drop policy if exists credit_write on public.credit_ledger;
create policy credit_write on public.credit_ledger
  for insert with check (public.user_role() in ('venue_manager','super_admin'));

-- Credit applied to a charge is recorded on the row itself and only ledgered
-- once payment actually completes (webhook), so an abandoned checkout never
-- burns credit.
alter table public.bookings add column if not exists credit_applied numeric(10,2) not null default 0;
alter table public.orders   add column if not exists credit_applied numeric(10,2) not null default 0;
