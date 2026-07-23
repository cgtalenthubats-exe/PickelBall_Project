-- ============================================================
-- MIGRATION: POS orders (QR ordering tied to a booking)
-- Requires migration-roles.sql + migration-erp.sql.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Random share token per booking: the QR encodes /order/<token>. Anyone in
-- the group can scan and order — the token (not a login) is the permission,
-- and it's only honored while the booking is active (checked in app code).
alter table public.bookings
  add column if not exists order_token uuid not null default gen_random_uuid();
create unique index if not exists bookings_order_token_unique
  on public.bookings(order_token);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  -- who ordered, IF they were logged in — friends scanning the QR may not be
  user_id uuid references public.profiles(id),
  orderer_name text,                                -- free-text "ใครสั่ง"
  status text not null default 'pending_payment',
    -- 'pending_payment' | 'paid' | 'served' | 'cancelled' | 'refunded'
  total numeric(10,2) not null default 0,
  note text,
  channel text not null default 'qr',               -- 'qr' | 'staff'
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  served_at timestamptz
);
create index if not exists idx_orders_venue_time on public.orders(venue_id, created_at);
create index if not exists idx_orders_booking on public.orders(booking_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name_at_order text not null,     -- snapshot: menu names/prices change later
  price_at_order numeric(10,2) not null,
  qty int not null default 1
);
create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Staff of the venue see + manage their orders. The public QR flow never
-- queries these tables directly — it goes through server code using the
-- service role after validating the booking token, so no anon policy needed.
drop policy if exists orders_staff on public.orders;
create policy orders_staff on public.orders
  for all using (public.works_at_venue(venue_id)) with check (public.works_at_venue(venue_id));
drop policy if exists orders_own on public.orders;
create policy orders_own on public.orders
  for select using (user_id = auth.uid());

drop policy if exists order_items_access on public.order_items;
create policy order_items_access on public.order_items
  for all using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.works_at_venue(o.venue_id))
  ));
