-- ============================================================
-- MIGRATION: expense tracking (for a real P&L report) + stock-in unit cost
-- (for inventory valuation / COGS). Requires migration-erp.sql +
-- migration-roles.sql. Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  category text not null,        -- 'facility_rent' | 'utility' | 'wage' | 'other'
  amount numeric(10,2) not null,
  note text,
  doc_ref text,                  -- invoice/receipt number, if any
  supplier text,
  expense_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_venue_date on public.expenses(venue_id, expense_date);

alter table public.expenses enable row level security;

-- Expenses feed the P&L report (manager-level data), same bar as Reports.
drop policy if exists expenses_manage on public.expenses;
create policy expenses_manage on public.expenses
  for all using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

-- Cost per unit at the time stock came in — lets stock value / COGS be
-- computed from real purchase cost instead of guessing off the sale price.
-- Only meaningful on 'stock_in' rows; null everywhere else.
alter table public.stock_ledger add column if not exists unit_cost numeric(10,2);
