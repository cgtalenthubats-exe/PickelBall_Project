-- ============================================================
-- DEMO: Fully-booked Open Play + waitlist
-- Central Pickleball · ลาดพร้าว — 7 / 8 / 9 July 2026, 18:00–20:00
-- ============================================================
-- Purpose: give the Open Play "full session + waitlist" UI something real
-- to show — 12/12 seats booked and paid, plus a few people waiting.
--
-- Run AFTER: schema.sql, seed.sql, seed-demo.sql, migration-courts.sql,
-- migration-waitlist.sql. Safe to re-run (idempotent).
-- ============================================================

-- 1) Extra demo accounts — people who tried to book but the session was
--    already full, so they're on the waitlist instead.
insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111106','authenticated','authenticated','demo.arm@example.com', now(),'{"provider":"email","providers":["email"]}','{"name":"อาร์ม ธนกร (demo)","phone":"080-111-2222"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111107','authenticated','authenticated','demo.fah@example.com',  now(),'{"provider":"email","providers":["email"]}','{"name":"ฟ้า ปิยะดา (demo)","phone":"081-222-3333"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111108','authenticated','authenticated','demo.beam@example.com', now(),'{"provider":"email","providers":["email"]}','{"name":"บีม ศุภกร (demo)","phone":"082-333-4444"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.profiles (id, role, name, phone)
values
  ('11111111-1111-1111-1111-111111111106','customer','อาร์ม ธนกร (demo)','080-111-2222'),
  ('11111111-1111-1111-1111-111111111107','customer','ฟ้า ปิยะดา (demo)','081-222-3333'),
  ('11111111-1111-1111-1111-111111111108','customer','บีม ศุภกร (demo)','082-333-4444')
on conflict (id) do update set name = excluded.name, phone = excluded.phone;

-- 2) The 3 sessions — reuse an existing session at that exact time if the
--    rolling seed.sql schedule already created one; otherwise create it.
--    Prefers a court whose purpose = 'open_play', falls back to any court.
do $$
declare
  v_id uuid;
  c_id uuid;
  s_id uuid;
  d date;
  st timestamptz;
  et timestamptz;
begin
  select id into v_id from public.venues where slug = 'ladprao';
  if v_id is null then
    raise notice 'ladprao venue not found — run seed.sql first';
    return;
  end if;

  select id into c_id from public.courts
    where venue_id = v_id and purpose = 'open_play'
    order by name limit 1;
  if c_id is null then
    select id into c_id from public.courts where venue_id = v_id order by name limit 1;
  end if;

  foreach d in array array['2026-07-07'::date, '2026-07-08'::date, '2026-07-09'::date]
  loop
    st := (d + time '18:00') at time zone 'Asia/Bangkok';
    et := (d + time '20:00') at time zone 'Asia/Bangkok';

    select id into s_id from public.open_play_sessions
      where venue_id = v_id and start_time = st
      limit 1;

    if s_id is null then
      insert into public.open_play_sessions
        (venue_id, court_id, start_time, end_time, capacity, price_per_person, skill_level, status)
      values (v_id, c_id, st, et, 12, 180, 'All Level', 'full');
    else
      update public.open_play_sessions
        set capacity = 12, status = 'full'
        where id = s_id;
    end if;
  end loop;
end $$;

-- 3) Fill each session to capacity (12/12) with the 5 existing demo
--    customers, seats varying per day so it always sums to exactly 12.
insert into public.bookings
  (user_id, venue_id, court_id, booking_type, open_play_session_id, seats,
   start_time, end_time, status, price_line_items, subtotal, total)
select
  b.user_id, s.venue_id, s.court_id, 'open_play'::booking_type, s.id, b.seats,
  s.start_time, s.end_time, 'confirmed'::booking_status,
  jsonb_build_array(jsonb_build_object(
    'label', 'ค่าเข้ารอบ × ' || b.seats,
    'amount', b.seats * s.price_per_person
  )),
  b.seats * s.price_per_person, b.seats * s.price_per_person
from (values
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111101'::uuid, 3),
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111102'::uuid, 2),
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111103'::uuid, 3),
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111104'::uuid, 2),
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111105'::uuid, 2),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111101'::uuid, 2),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111102'::uuid, 3),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111103'::uuid, 2),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111104'::uuid, 3),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111105'::uuid, 2),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111101'::uuid, 2),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111102'::uuid, 2),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111103'::uuid, 3),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111104'::uuid, 2),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111105'::uuid, 3)
) as b(session_date, user_id, seats)
join public.venues v on v.slug = 'ladprao'
join public.open_play_sessions s
  on s.venue_id = v.id
  and s.start_time = (b.session_date + time '18:00') at time zone 'Asia/Bangkok'
where not exists (
  select 1 from public.bookings bk
  where bk.open_play_session_id = s.id and bk.user_id = b.user_id
);

-- 4) Payments — everyone above has already paid (mix of card / PromptPay).
insert into public.payments (booking_id, method, amount, status, paid_at)
select
  bk.id,
  case when (row_number() over (order by bk.created_at, bk.id)) % 2 = 0
       then 'card' else 'promptpay' end,
  bk.total, 'succeeded'::payment_status, bk.created_at
from public.bookings bk
join public.open_play_sessions s on s.id = bk.open_play_session_id
join public.venues v on v.id = s.venue_id and v.slug = 'ladprao'
where bk.booking_type = 'open_play'
  and s.start_time in (
    (date '2026-07-07' + time '18:00') at time zone 'Asia/Bangkok',
    (date '2026-07-08' + time '18:00') at time zone 'Asia/Bangkok',
    (date '2026-07-09' + time '18:00') at time zone 'Asia/Bangkok'
  )
  and not exists (select 1 from public.payments p where p.booking_id = bk.id);

-- 5) Waitlist — a few people who tried after the session filled up.
--    Staggered created_at so "waiting since" looks realistic in Admin.
insert into public.waitlist (session_id, user_id, status, created_at)
select s.id, w.user_id, 'waiting', now() - w.waited_for
from (values
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111106'::uuid, interval '3 hours'),
  ('2026-07-07'::date, '11111111-1111-1111-1111-111111111107'::uuid, interval '45 minutes'),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111106'::uuid, interval '1 day'),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111107'::uuid, interval '5 hours'),
  ('2026-07-08'::date, '11111111-1111-1111-1111-111111111108'::uuid, interval '20 minutes'),
  ('2026-07-09'::date, '11111111-1111-1111-1111-111111111108'::uuid, interval '2 hours')
) as w(session_date, user_id, waited_for)
join public.venues v on v.slug = 'ladprao'
join public.open_play_sessions s
  on s.venue_id = v.id
  and s.start_time = (w.session_date + time '18:00') at time zone 'Asia/Bangkok'
on conflict (session_id, user_id) do nothing;
