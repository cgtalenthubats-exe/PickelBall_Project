-- ============================================================
-- DEMO / TEST DATA — customers, bookings, payments
-- ============================================================
-- Purpose: give the Admin dashboard/customers/reports something real to show.
-- Run AFTER schema.sql + seed.sql, in the Supabase SQL Editor.
-- Safe to re-run (idempotent via not-exists guards / on conflict).
--
-- ⚠️  This inserts rows into auth.users directly (demo accounts that cannot
--     password-login — encrypted_password is null, like an OAuth user). This is
--     the standard Supabase seeding trick. If your Supabase version rejects the
--     auth.users insert, tell me and I'll switch these to reference real
--     signed-up accounts instead.
-- ============================================================

-- 1) Demo customer accounts -----------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111101','authenticated','authenticated','demo.natt@example.com',   now(),'{"provider":"email","providers":["email"]}','{"name":"ณัฐพงษ์ สุขสมบูรณ์ (demo)","phone":"081-234-5678"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111102','authenticated','authenticated','demo.praewa@example.com', now(),'{"provider":"email","providers":["email"]}','{"name":"Praewa Thanawat (demo)","phone":"089-876-5432"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111103','authenticated','authenticated','demo.somchai@example.com',now(),'{"provider":"email","providers":["email"]}','{"name":"สมชาย กิตติชัย (demo)","phone":"082-345-6789"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111104','authenticated','authenticated','demo.mint@example.com',   now(),'{"provider":"email","providers":["email"]}','{"name":"Mint Wongsak (demo)","phone":"086-111-2233"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111105','authenticated','authenticated','demo.thanawat@example.com',now(),'{"provider":"email","providers":["email"]}','{"name":"ธนวัฒน์ ลิ้มเจริญ (demo)","phone":"084-555-6677"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Ensure profiles exist (handle_new_user trigger normally creates them) + tags.
insert into public.profiles (id, role, name, phone)
values
  ('11111111-1111-1111-1111-111111111101','customer','ณัฐพงษ์ สุขสมบูรณ์ (demo)','081-234-5678'),
  ('11111111-1111-1111-1111-111111111102','customer','Praewa Thanawat (demo)','089-876-5432'),
  ('11111111-1111-1111-1111-111111111103','customer','สมชาย กิตติชัย (demo)','082-345-6789'),
  ('11111111-1111-1111-1111-111111111104','customer','Mint Wongsak (demo)','086-111-2233'),
  ('11111111-1111-1111-1111-111111111105','customer','ธนวัฒน์ ลิ้มเจริญ (demo)','084-555-6677')
on conflict (id) do update set name = excluded.name, phone = excluded.phone;

update public.profiles set tags = '{VIP,ขาประจำ}'  where id = '11111111-1111-1111-1111-111111111101';
update public.profiles set tags = '{Open Play}'     where id = '11111111-1111-1111-1111-111111111102';
update public.profiles set tags = '{ใหม่}'          where id = '11111111-1111-1111-1111-111111111103';
update public.profiles set tags = '{เสี่ยงหาย}'     where id = '11111111-1111-1111-1111-111111111104';
update public.profiles set tags = '{เสี่ยงหาย}'     where id = '11111111-1111-1111-1111-111111111105';

-- 2) Bookings spread across the last ~6 months ----------------------------
-- d(user, venue slug, court, days_ago, start time, hours, type, status, total)
insert into public.bookings
  (user_id, venue_id, court_id, booking_type, seats, start_time, end_time, status, price_line_items, subtotal, total)
select d.user_id, v.id, c.id, d.btype::booking_type, 1,
       ((current_date - d.days_ago)::date + d.start_t) at time zone 'Asia/Bangkok',
       ((current_date - d.days_ago)::date + d.start_t + (d.hrs || ' hours')::interval) at time zone 'Asia/Bangkok',
       d.status::booking_status, '[]'::jsonb, d.total, d.total
from (values
  ('11111111-1111-1111-1111-111111111101'::uuid,'ladprao','A',  2, time '18:00', 2,'open_play','completed', 360),
  ('11111111-1111-1111-1111-111111111101'::uuid,'ladprao','A',  9, time '19:00', 1,'private',  'completed', 500),
  ('11111111-1111-1111-1111-111111111101'::uuid,'rama9',  'B', 40, time '10:00', 1,'private',  'completed', 400),
  ('11111111-1111-1111-1111-111111111101'::uuid,'ladprao','B', 72, time '08:00', 1,'private',  'completed', 350),
  ('11111111-1111-1111-1111-111111111101'::uuid,'ladprao','A',125, time '18:00', 2,'open_play','completed', 360),
  ('11111111-1111-1111-1111-111111111102'::uuid,'thonglor','B', 5, time '17:00', 2,'open_play','confirmed', 500),
  ('11111111-1111-1111-1111-111111111102'::uuid,'ladprao','B', 48, time '10:00', 2,'open_play','completed', 300),
  ('11111111-1111-1111-1111-111111111102'::uuid,'rama9',  'A', 95, time '19:00', 2,'open_play','completed', 400),
  ('11111111-1111-1111-1111-111111111103'::uuid,'rama9',  'A',  3, time '10:00', 1,'private',  'confirmed', 400),
  ('11111111-1111-1111-1111-111111111103'::uuid,'ladprao','A', 35, time '09:00', 1,'private',  'completed', 350),
  ('11111111-1111-1111-1111-111111111103'::uuid,'ladprao','B',135, time '11:00', 1,'private',  'completed', 350),
  ('11111111-1111-1111-1111-111111111104'::uuid,'ladprao','A', 12, time '20:00', 1,'private',  'cancelled', 500),
  ('11111111-1111-1111-1111-111111111104'::uuid,'thonglor','A',65, time '18:00', 1,'private',  'no_show',   700),
  ('11111111-1111-1111-1111-111111111104'::uuid,'rama9',  'B',105, time '17:00', 1,'private',  'completed', 550),
  ('11111111-1111-1111-1111-111111111104'::uuid,'ladprao','A',155, time '18:00', 2,'open_play','completed', 360),
  ('11111111-1111-1111-1111-111111111105'::uuid,'rama9',  'A', 19, time '19:00', 2,'open_play','no_show',   400),
  ('11111111-1111-1111-1111-111111111105'::uuid,'rama9',  'B', 80, time '17:00', 2,'open_play','refunded',  400)
) as d(user_id, slug, court, days_ago, start_t, hrs, btype, status, total)
join public.venues v on v.slug = d.slug
join public.courts c on c.venue_id = v.id and c.name = d.court
where not exists (
  select 1 from public.bookings b
  where b.user_id = d.user_id
    and b.start_time = ((current_date - d.days_ago)::date + d.start_t) at time zone 'Asia/Bangkok'
);

-- 3) Payments for every paid booking --------------------------------------
insert into public.payments (booking_id, method, amount, status, paid_at)
select b.id, 'promptpay', b.total, 'succeeded'::payment_status, b.created_at
from public.bookings b
where b.status in ('confirmed','completed')
  and not exists (select 1 from public.payments p where p.booking_id = b.id);
