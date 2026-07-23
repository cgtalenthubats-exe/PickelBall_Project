-- ============================================================
-- MIGRATION: role-per-branch RLS
-- super_admin  = every venue, every action
-- venue_manager = own venue only (managed_venue_id), full control there
-- staff        = own venue only, floor operations
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Which venue the caller manages (null for super_admin / customers).
create or replace function public.user_venue()
returns uuid language sql stable security definer set search_path = public as $$
  select managed_venue_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable set search_path = public as $$
  select public.user_role() = 'super_admin'
$$;

-- Manager-or-above for a SPECIFIC venue.
create or replace function public.manages_venue(v uuid)
returns boolean language sql stable set search_path = public as $$
  select public.is_super_admin()
      or (public.user_role() = 'venue_manager' and public.user_venue() = v)
$$;

-- Any staff level assigned to a SPECIFIC venue (for floor-ops writes).
create or replace function public.works_at_venue(v uuid)
returns boolean language sql stable set search_path = public as $$
  select public.is_super_admin()
      or (public.is_staff() and public.user_venue() = v)
$$;

-- ---------- venue-scoped catalog tables ----------
-- Reads stay public (catalog is what customers browse). Writes tighten from
-- blanket is_staff() to venue-scoped manager rights.

drop policy if exists venues_write on public.venues;
create policy venues_write on public.venues
  for all using (public.manages_venue(id)) with check (public.manages_venue(id));

drop policy if exists courts_write on public.courts;
create policy courts_write on public.courts
  for all using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

drop policy if exists pricing_rules_write on public.pricing_rules;
create policy pricing_rules_write on public.pricing_rules
  for all using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

-- equipment.venue_id can be null (= all venues) — only super_admin touches those.
drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment
  for all
  using (case when venue_id is null then public.is_super_admin() else public.manages_venue(venue_id) end)
  with check (case when venue_id is null then public.is_super_admin() else public.manages_venue(venue_id) end);

-- Open Play sessions + blackouts + tasks are floor operations: staff of the
-- venue may manage them too.
drop policy if exists open_play_sessions_write on public.open_play_sessions;
create policy open_play_sessions_write on public.open_play_sessions
  for all using (public.works_at_venue(venue_id)) with check (public.works_at_venue(venue_id));

drop policy if exists blackouts_write on public.blackouts;
create policy blackouts_write on public.blackouts
  for all
  using (exists (select 1 from public.courts c where c.id = court_id and public.works_at_venue(c.venue_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.works_at_venue(c.venue_id)));

-- staff_tasks (from migration-tasks.sql) — venue-scoped for all staff levels.
drop policy if exists staff_tasks_rw on public.staff_tasks;
drop policy if exists staff_tasks_write on public.staff_tasks;
create policy staff_tasks_write on public.staff_tasks
  for all using (public.works_at_venue(venue_id)) with check (public.works_at_venue(venue_id));

-- ---------- bookings ----------
-- Customers keep their own-row rights (bookings_own / bookings_insert_own /
-- bookings_update from schema.sql). Staff read/update tightens to own venue.
drop policy if exists bookings_own on public.bookings;
create policy bookings_own on public.bookings
  for select using (user_id = auth.uid() or public.works_at_venue(venue_id));
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (user_id = auth.uid() or public.works_at_venue(venue_id));

-- ---------- profiles ----------
-- Staff read stays global (CRM lookup by phone crosses branches);
-- editing other profiles becomes manager+.
drop policy if exists profiles_update_staff on public.profiles;
create policy profiles_update_staff on public.profiles
  for update
  using (public.user_role() in ('venue_manager','super_admin'))
  with check (public.user_role() in ('venue_manager','super_admin'));

-- ---------- payments / addons: staff side scoped via parent booking ----------
drop policy if exists addons_access on public.booking_addons;
create policy addons_access on public.booking_addons
  for all using (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.user_id = auth.uid() or public.works_at_venue(b.venue_id))
  ));
drop policy if exists payments_access on public.payments;
create policy payments_access on public.payments
  for all using (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.user_id = auth.uid() or public.works_at_venue(b.venue_id))
  ));
