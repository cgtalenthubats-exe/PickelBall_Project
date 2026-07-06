-- ============================================================
-- MIGRATION: CRM tag editing + staff management fields
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- 1) profiles: email (for staff lookup), staff assignment + active flag
alter table public.profiles add column if not exists email text;
alter table public.profiles
  add column if not exists managed_venue_id uuid references public.venues(id);
alter table public.profiles
  add column if not exists active boolean not null default true;

-- Backfill email from auth.users for existing profiles
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

-- Keep email in sync when new users sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

-- 2) Let staff update any profile (needed for CRM tags + staff roles).
--    (Existing profiles_update_self stays for normal users.)
do $$ begin
  create policy profiles_update_staff on public.profiles
    for update using (public.is_staff()) with check (public.is_staff());
exception when duplicate_object then null; end $$;
