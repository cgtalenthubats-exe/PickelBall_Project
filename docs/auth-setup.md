# Auth setup — สิ่งที่ต้องตั้งใน Supabase

## 1. (สำหรับ beta) ปิด email confirmation ให้ login ได้ทันที
Authentication → Providers → **Email** → ปิด **"Confirm email"** → Save
> ถ้าเปิดไว้ ตอนสมัครจะยังไม่ได้ session (ต้องกดยืนยันในอีเมลก่อน) — ระบบรองรับทั้งสองแบบ แต่ตอนเทสต์ beta ปิดไว้ก่อนสะดวกสุด

## 2. URL Configuration
Authentication → **URL Configuration**
- **Site URL:** `http://localhost:3000` (ตอน deploy เปลี่ยนเป็น URL ของ Vercel)
- **Redirect URLs:** เพิ่ม
  - `http://localhost:3000/**`
  - (ตอน deploy) `https://YOUR-APP.vercel.app/**`

## 3. เลื่อนบัญชีตัวเองเป็นแอดมิน (หลังสมัครสมาชิกครั้งแรก)
สมัครผ่านหน้า /register ก่อน แล้วรันใน **SQL Editor**:
```sql
update public.profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'ใส่อีเมลคุณ');
```
เสร็จแล้วเข้า `/admin` ได้ (คนที่ role = customer จะถูกเด้งออก)

## 4. Google login (ถ้าจะเปิดใช้)
Authentication → Providers → **Google** → เปิด → ใส่ **Client ID / Secret** จาก Google Cloud Console
(สร้าง OAuth client, ใส่ Authorized redirect URI ตามที่ Supabase บอก) → ปุ่ม Google จะใช้งานได้ทันที

## 5. LINE login — ยังไม่ทำ (Phase 2)
Supabase **ไม่มี LINE เป็น provider ในตัว** ต้องทำ custom bridge:
- สร้าง **LINE Login channel** (LINE Developers) → ได้ Channel ID/Secret
- ทำ route `/auth/line` + `/auth/line/callback`: รับ code จาก LINE → แลก access token + id_token → ดึงโปรไฟล์
- ผูกกับ Supabase user (ต้องใช้ service_role ฝั่ง server เพื่อ create/link user + ออก session)
- ปุ่ม LINE ในหน้า login มีไว้แล้ว รอต่อ flow นี้

> โครงโค้ดฝั่ง client (ปุ่ม) พร้อมแล้ว เหลือ channel creds + server bridge
