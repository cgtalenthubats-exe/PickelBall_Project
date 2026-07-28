-- ============================================================
-- VERIFY DB — เช็คว่า migration ครบทุกไฟล์แล้วหรือยัง
-- รันใน Supabase SQL Editor แล้วดูคอลัมน์ status: ต้องเป็น ✅ ทุกแถว
-- ถ้าเจอ ❌ = ยังไม่ได้รัน migration ที่เกี่ยวข้อง (ดูคอลัมน์ migration)
-- ============================================================

-- ---------- ตาราง ----------
select 'table' as kind, name, migration,
       case when to_regclass('public.' || name) is not null then '✅' else '❌ MISSING' end as status
from (values
  ('profiles','schema.sql'),
  ('venues','schema.sql'),
  ('courts','schema.sql'),
  ('pricing_rules','schema.sql'),
  ('open_play_sessions','schema.sql'),
  ('equipment','schema.sql'),
  ('bookings','schema.sql'),
  ('payments','schema.sql'),
  ('waitlist','migration-waitlist.sql'),
  ('staff_tasks','migration-tasks.sql'),
  ('products','migration-erp.sql'),
  ('stock_ledger','migration-erp.sql'),
  ('orders','migration-pos-orders.sql'),
  ('order_items','migration-pos-orders.sql'),
  ('credit_ledger','migration-credit.sql'),
  ('notifications','migration-notify.sql')
) as t(name, migration)

union all

-- ---------- คอลัมน์สำคัญที่เพิ่มทีหลัง ----------
select 'column', tbl || '.' || col, migration,
       case when exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name=tbl and column_name=col
       ) then '✅' else '❌ MISSING' end
from (values
  ('profiles','email','migration-admin2.sql'),
  ('profiles','managed_venue_id','migration-admin2.sql'),
  ('payments','source','migration-pos2u.sql'),
  ('bookings','channel','migration-pos2u.sql'),
  ('bookings','order_token','migration-pos-orders.sql'),
  ('bookings','credit_applied','migration-credit.sql'),
  ('orders','credit_applied','migration-credit.sql'),
  ('orders','reserve_expires_at','migration-stock-reserve.sql'),
  ('products','image_url','migration-erp.sql'),
  ('products','safety_stock','migration-stock-reserve.sql'),
  ('waitlist','notified_at','migration-notify.sql')
) as c(tbl, col, migration)

union all

-- ---------- ฟังก์ชัน ----------
select 'function', name || '()', migration,
       case when to_regproc('public.' || name) is not null then '✅' else '❌ MISSING' end
from (values
  ('is_staff','schema.sql'),
  ('user_venue','migration-roles.sql'),
  ('manages_venue','migration-roles.sql'),
  ('works_at_venue','migration-roles.sql'),
  ('check_open_play_capacity','migration-pos2u.sql'),
  ('reserve_order_stock','migration-stock-reserve.sql')
) as f(name, migration)

union all

-- ---------- trigger ----------
select 'trigger', 'trg_open_play_capacity', 'migration-pos2u.sql',
       case when exists (
         select 1 from pg_trigger where tgname='trg_open_play_capacity'
       ) then '✅' else '❌ MISSING' end

union all

-- ---------- storage bucket สำหรับรูปสินค้า ----------
select 'bucket', 'products', 'migration-product-images.sql',
       case when exists (
         select 1 from storage.buckets where id='products'
       ) then '✅' else '❌ MISSING' end

order by status desc, kind, name;
