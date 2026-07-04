# Supabase setup — สิ่งที่คุณต้องทำ

> Claude จะไม่แตะ Supabase connector ที่ต่ออยู่ (เป็นของอีกโปรเจค) — สร้าง project ของเราเองตามนี้

## 1. สร้าง project
- ไปที่ https://supabase.com → New project
- **Region:** `Southeast Asia (Singapore) ap-southeast-1` (ใกล้ไทยสุด latency ต่ำ)
- ตั้ง **Database password** เก็บไว้เอง (ไม่ต้องส่งให้ Claude)

## 2. รัน schema
- เมนู **SQL Editor** → New query → วางทั้งไฟล์ [`docs/schema.sql`](schema.sql) → **Run**
- ถ้าไม่มี error = ตาราง+ RLS พร้อม

## 3. เปิด Auth
- **Authentication → Providers → Email** เปิดไว้ (MVP)
- Google / LINE ค่อยเพิ่มทีหลังตอนทำ social login

## 4. ส่งให้ Claude 2 อย่าง (Project Settings → API)
- ✅ **Project URL** — `https://xxxx.supabase.co`
- ✅ **anon / publishable key**

⛔ **ห้ามส่ง `service_role` key** (secret ฝั่ง server) — ถ้าต้องใช้ทีหลัง ตั้งเป็น env var ใน Vercel เอง

## 5. Claude ทำต่อ
- ใส่ค่าใน `.env.local` → สลับหน้า venue/booking/admin จาก mock ไปดึงข้อมูลจริง
- ทำ auth: login/register จริง + gate `/admin` ตาม role
- ต่อ session refresh ใน `proxy.ts` (รวมกับ next-intl)
