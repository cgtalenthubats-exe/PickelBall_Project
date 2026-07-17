-- ============================================================
-- MIGRATION: POS2U integration — payment source, booking channel,
-- phone-based walk-in identity, Open Play capacity race-condition fix
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- 1) Track which channel created a booking / confirmed a payment.
--    'webapp' stays the default so existing rows don't need backfilling.
alter table public.bookings
  add column if not exists channel text not null default 'webapp';
alter table public.bookings
  drop constraint if exists bookings_channel_check;
alter table public.bookings
  add constraint bookings_channel_check check (channel in ('webapp', 'pos2u'));

alter table public.payments
  add column if not exists source text;
alter table public.payments
  drop constraint if exists payments_source_check;
alter table public.payments
  add constraint payments_source_check
  check (source is null or source in ('pos2u', 'stripe', '2c2p', 'manual_admin'));

-- 2) Phone becomes the lookup key for walk-in shadow accounts —
--    needs to be unique (ignoring rows where it's still null).
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

-- 3) Open Play capacity check — this is the real, currently-shipped gap:
--    createBooking() never checked capacity before inserting, so two
--    concurrent bookings for the last open seat could both succeed.
--    Mirrors the private-court EXCLUDE constraint, but Open Play capacity
--    isn't a single overlapping range — it's a running seat count — so it
--    needs a trigger with an explicit row lock instead of an EXCLUDE index.
create or replace function public.check_open_play_capacity()
returns trigger language plpgsql as $$
declare
  cap int;
  taken int;
begin
  if new.booking_type <> 'open_play' or new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  if new.open_play_session_id is null then
    raise exception 'open_play_session_id_required';
  end if;

  -- Lock the session row so concurrent inserts for the same session
  -- serialize here instead of both reading a stale seat count.
  select capacity into cap
    from public.open_play_sessions
    where id = new.open_play_session_id
    for update;

  if cap is null then
    raise exception 'open_play_session_not_found';
  end if;

  select coalesce(sum(seats), 0) into taken
    from public.bookings
    where open_play_session_id = new.open_play_session_id
      and status in ('pending', 'confirmed')
      and id <> new.id;

  if taken + new.seats > cap then
    raise exception 'open_play_session_full';
  end if;

  return new;
end $$;

drop trigger if exists trg_open_play_capacity on public.bookings;
create trigger trg_open_play_capacity
  before insert or update on public.bookings
  for each row execute function public.check_open_play_capacity();
