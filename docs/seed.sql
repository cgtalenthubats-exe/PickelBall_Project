-- ============================================================
-- PickleBall Booking — seed data (run AFTER schema.sql)
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- Venues
insert into public.venues (slug, name, area, address, lat, lng, amenities, gallery, status)
values
  ('ladprao', 'Central Pickleball · ลาดพร้าว', 'ลาดพร้าว, กรุงเทพฯ',
   '1691 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กทม. 10900', 13.8177, 100.5602,
   array['ที่จอดรถ','WiFi','ห้องเปลี่ยนเสื้อผ้า','แอร์','คาเฟ่'],
   array[
     'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1100&q=80',
     'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1100&q=80',
     'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?auto=format&fit=crop&w=1100&q=80'
   ], 'active'),
  ('rama9', 'The Court · พระราม 9', 'ห้วยขวาง, กรุงเทพฯ',
   '9 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กทม. 10310', 13.7583, 100.5655,
   array['ที่จอดรถ','WiFi','คาเฟ่'],
   array['https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1100&q=80'],
   'active'),
  ('thonglor', 'Dink House · ทองหล่อ', 'วัฒนา, กรุงเทพฯ',
   '55 ซ.ทองหล่อ 10 แขวงคลองตันเหนือ เขตวัฒนา กทม. 10110', 13.7376, 100.5836,
   array['ที่จอดรถ','แอร์','โปรช็อป'],
   array['https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=1100&q=80'],
   'active')
on conflict (slug) do nothing;

-- Courts (2 per venue)
insert into public.courts (venue_id, name)
select v.id, c.name
from public.venues v
cross join (values ('A'),('B')) as c(name)
where not exists (
  select 1 from public.courts x where x.venue_id = v.id and x.name = c.name
);

-- Equipment (venue_id null = ทุกสาขา)
insert into public.equipment (venue_id, name, rental_price, stock_per_slot, is_included_free, included_quantity, status)
values
  (null, 'ไม้แร็กเกต (มาตรฐาน)', 100, 8, false, 0, 'active'),
  (null, 'ลูกพิกเกิลบอล', 0, 20, true, 2, 'active'),
  (null, 'ตะกร้าลูก (Ball Basket)', 300, 2, false, 0, 'active')
on conflict do nothing;

-- Open-play sessions (today, tied to each venue's court A/B)
insert into public.open_play_sessions
  (venue_id, court_id, start_time, end_time, capacity, price_per_person, skill_level, status)
select v.id, c.id,
       (current_date + time '18:00') at time zone 'Asia/Bangkok',
       (current_date + time '20:00') at time zone 'Asia/Bangkok',
       12, 180, 'Legend 50+', 'open'
from public.venues v
join public.courts c on c.venue_id = v.id and c.name = 'A'
where v.slug = 'ladprao'
  and not exists (select 1 from public.open_play_sessions s where s.venue_id = v.id);

insert into public.open_play_sessions
  (venue_id, court_id, start_time, end_time, capacity, price_per_person, skill_level, status)
select v.id, c.id,
       (current_date + time '10:00') at time zone 'Asia/Bangkok',
       (current_date + time '12:00') at time zone 'Asia/Bangkok',
       12, 150, 'All Level', 'open'
from public.venues v
join public.courts c on c.venue_id = v.id and c.name = 'B'
where v.slug = 'ladprao';
