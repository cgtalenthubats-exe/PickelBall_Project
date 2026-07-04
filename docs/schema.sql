-- ============================================================
-- PickleBall Booking — Supabase schema v1 (Phase 1)
-- Run this in your OWN Supabase project → SQL Editor.
-- Safe to re-run pieces; review before running in production.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('customer','staff','venue_manager','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_type as enum ('private','open_play');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum
    ('pending','confirmed','completed','cancelled','no_show','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('open','full','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','succeeded','failed','refunded');
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
create or replace function public.updated_at_trigger()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
-- Note: user_role() / is_staff() are defined AFTER the profiles table below,
-- because a LANGUAGE SQL function validates referenced tables at creation time.

-- ---------- profiles (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  name text,
  phone text,
  -- CRM
  total_lifetime_spend numeric(12,2) not null default 0,
  last_visit_date date,
  no_show_count int not null default 0,
  tags text[] not null default '{}',
  -- tax / e-invoice
  tax_id text, tax_name text, tax_address text,
  -- future
  the1_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.updated_at_trigger();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (defined here — after profiles exists — for RLS below).
create or replace function public.user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable set search_path = public as $$
  select public.user_role() in ('staff','venue_manager','super_admin')
$$;

-- ---------- venues / courts ----------
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  area text,
  address text,
  lat double precision, lng double precision,
  amenities text[] not null default '{}',
  gallery text[] not null default '{}',
  terms_and_conditions text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  status text not null default 'active'
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  day_of_week int,               -- 0=Sun .. 6=Sat, null = any
  start_time time, end_time time,
  price_per_hour numeric(10,2) not null,
  label text                     -- 'peak' | 'off_peak'
);

create table if not exists public.blackouts (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text
);

create table if not exists public.open_play_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int not null,
  price_per_person numeric(10,2) not null,
  skill_level text,
  status session_status not null default 'open'
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  name text not null,
  rental_price numeric(10,2) not null default 0,
  stock_per_slot int not null default 0,
  is_included_free boolean not null default false,
  included_quantity int not null default 0,
  status text not null default 'active'
);

-- ---------- bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  venue_id uuid not null references public.venues(id),
  court_id uuid not null references public.courts(id),
  booking_type booking_type not null,
  open_play_session_id uuid references public.open_play_sessions(id),
  seats int not null default 1,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  hold_expires_at timestamptz,
  stripe_payment_intent_id text,
  price_line_items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.updated_at_trigger();

-- Prevent double-booking a private court for overlapping times.
-- (Only enforced for confirmed/pending private bookings.)
alter table public.bookings
  drop constraint if exists bookings_no_private_overlap;
alter table public.bookings
  add constraint bookings_no_private_overlap
  exclude using gist (
    court_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (booking_type = 'private' and status in ('pending','confirmed'));

create table if not exists public.booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id),
  quantity int not null default 1,
  price_at_booking numeric(10,2) not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stripe_payment_intent_id text,
  method text,                    -- 'card' | 'promptpay'
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  paid_at timestamptz
);

-- ---------- indexes ----------
create index if not exists idx_courts_venue on public.courts(venue_id);
create index if not exists idx_sessions_venue_time on public.open_play_sessions(venue_id, start_time);
create index if not exists idx_bookings_user on public.bookings(user_id);
create index if not exists idx_bookings_court_time on public.bookings(court_id, start_time);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.venues              enable row level security;
alter table public.courts              enable row level security;
alter table public.pricing_rules       enable row level security;
alter table public.blackouts           enable row level security;
alter table public.open_play_sessions  enable row level security;
alter table public.equipment           enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_addons      enable row level security;
alter table public.payments            enable row level security;

-- profiles: user sees/edits own; staff can read all
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- public catalog: anyone can read; only staff can write
do $$
declare t text;
begin
  foreach t in array array['venues','courts','pricing_rules','open_play_sessions','equipment','blackouts']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- bookings: user manages own; staff manage all
drop policy if exists bookings_own on public.bookings;
create policy bookings_own on public.bookings
  for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert with check (user_id = auth.uid());
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (user_id = auth.uid() or public.is_staff());

-- booking_addons + payments: follow parent booking ownership
drop policy if exists addons_access on public.booking_addons;
create policy addons_access on public.booking_addons
  for all using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and (b.user_id = auth.uid() or public.is_staff())
  ));
drop policy if exists payments_access on public.payments;
create policy payments_access on public.payments
  for all using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and (b.user_id = auth.uid() or public.is_staff())
  ));

-- ============================================================
-- Notes (Phase 2+): venue-scoped manager permissions via a
-- staff_venue_assignments table; consents (PDPA); invoices;
-- audit_log; reviews; waitlist. See docs/data-model.md.
-- ============================================================
