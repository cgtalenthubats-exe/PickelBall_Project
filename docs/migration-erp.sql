-- ============================================================
-- MIGRATION: ERP — products (per-branch menu) + stock ledger
-- Requires migration-roles.sql (manages_venue / works_at_venue helpers).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Each branch defines its own sellable menu (drinks, food, gear, whatever —
-- what they can actually make/serve is their business, not the system's).
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  category text not null default 'drink',      -- 'drink' | 'food' | 'gear' | 'other'
  price numeric(10,2) not null default 0,      -- VAT-inclusive selling price
  reorder_point int not null default 5,        -- alert when stock falls below
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_products_venue on public.products(venue_id);

-- Every stock movement is a ledger row; current stock = sum(change).
-- No mutable "quantity" column to drift out of sync.
create table if not exists public.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  venue_id uuid not null references public.venues(id),
  change int not null,                          -- + in / - out
  reason text not null,                         -- 'stock_in' | 'sale' | 'refund_return' | 'adjust'
  ref_id uuid,                                  -- order id for sale/refund rows
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_ledger_product on public.stock_ledger(product_id);
create index if not exists idx_stock_ledger_venue_time on public.stock_ledger(venue_id, created_at);

alter table public.products enable row level security;
alter table public.stock_ledger enable row level security;

-- Menu is public (customers browse it to order); managing it is manager+.
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

-- Stock: any staff of the venue can view and record movements (เติมของ/เช็ค/ปรับ).
drop policy if exists stock_ledger_read on public.stock_ledger;
create policy stock_ledger_read on public.stock_ledger
  for select using (public.works_at_venue(venue_id));
drop policy if exists stock_ledger_write on public.stock_ledger;
create policy stock_ledger_write on public.stock_ledger
  for insert with check (public.works_at_venue(venue_id));
