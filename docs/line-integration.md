# LINE OA Integration — แผนการเชื่อมต่อ

> เป้าหมาย: ให้ลูกค้าจองสนามผ่าน **LINE Official Account** (เลือกสาขา/วัน/เวลา/อุปกรณ์ + จ่ายเงิน) โดยบันทึกข้อมูลเข้า Supabase เดิมของเรา และส่งใบยืนยันกลับเข้าแชท LINE
>
> หลักการ: **reuse web app เดิมเกือบทั้งหมด** ผ่าน LIFF — ไม่เขียน UI จองใหม่

---

## 1. สถาปัตยกรรมโดยรวม

```
┌─────────────── LINE App (มือถือลูกค้า) ───────────────┐
│  แชท OA → Rich Menu                                    │
│     │ กดปุ่ม "จองสนาม"                                  │
│     ▼                                                  │
│  LIFF (เปิด Next.js web app ของเราในเบราว์เซอร์ LINE)  │
│     • liff.init() → รู้ว่าใครเป็นคนเปิด (LINE profile)  │
│     • เลือก สาขา → วัน → เวลา → อุปกรณ์  (UI เดิม)      │
│     • จ่ายเงิน (Stripe PromptPay/บัตร) ในหน้า LIFF      │
└────────────────────────┬───────────────────────────────┘
                         │ (server actions / API เดิม)
                         ▼
              ┌──────────────────────┐
              │  Next.js (Vercel)    │
              │  + LINE auth bridge  │  ← ของใหม่
              │  + webhook รับ event │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  Supabase (DB/Auth)  │  ← bookings/payments เดิม
              └──────────┬───────────┘
                         │ push ใบยืนยัน
                         ▼
              LINE Messaging API → แชทลูกค้า
```

**ตัวเลือกที่เลือก:** Rich Menu → **LIFF app** (ไม่ใช่ bot ตอบแชท)
- LIFF = เอา web app เดิมมารันใน LINE ได้เลย → ใช้ปฏิทิน/อุปกรณ์/จ่ายเงินที่ทำไว้แล้ว
- Bot ตอบแชท (Flex Message) ทำได้แต่จัดการ state ยาก + UI จำกัด → ไม่เหมาะกับ flow นี้

---

## 2. องค์ประกอบฝั่ง LINE (ลูกค้าต้องเตรียม)

| สิ่งที่ต้องมี | สร้างที่ไหน | ได้อะไรมา |
|---|---|---|
| LINE Official Account | LINE OA Manager (ฟรี) | ตัว OA + แชท |
| Messaging API channel | LINE Developers Console | Channel ID/Secret, **Channel access token** |
| LINE Login channel + **LIFF app** | LINE Developers Console | **LIFF ID**, Channel ID/Secret |
| Rich Menu | OA Manager หรือ Messaging API | เมนูปุ่มด้านล่างแชท |
| (ถ้าใช้) LINE Pay merchant | LINE Pay | Merchant ID/Secret (มี approval แยก) |

> ทั้งหมดนี้ต้องสร้างด้วย **บัญชีของลูกค้า** (เจ้าของ OA) — สอดคล้องกับแผน ownership ที่คุยกันไว้ (ลูกค้าเป็นเจ้าของ asset ทั้งหมด)

---

## 3. งานที่ต้องเขียนใหม่

### 3.1 LINE ↔ Supabase Auth Bridge ⭐ (ยากสุด)
Supabase **ไม่มี LINE เป็น provider ในตัว** → ต้องทำ bridge เอง:

1. LIFF ยืนยันตัวตนกับ LINE อัตโนมัติ → ได้ `id_token` (JWT ของ LINE)
2. ส่ง `id_token` มาที่ route `/api/auth/line` ฝั่ง server
3. Server verify token กับ LINE (`https://api.line.me/oauth2/v2.1/verify`)
4. ดึง `line_user_id` + profile → หา/สร้าง user ใน Supabase (ใช้ **service_role**)
5. ออก Supabase session ให้ (set cookie) → หลังจากนี้ใช้ RLS เดิมได้หมด

**เพิ่ม schema:**
```sql
alter table public.profiles add column if not exists line_user_id text unique;
-- (ใช้ผูกบัญชี LINE กับลูกค้า + กันสร้างซ้ำ)
```

> ทางเลือกที่ง่ายกว่า (แต่ผูกกับ vendor): ใช้ Supabase **Auth Hooks / third-party** ถ้าอนาคต Supabase รองรับ LINE — ตอนนี้ทำ bridge เองชัวร์สุด

### 3.2 Rich Menu
- ออกแบบรูป (2500×1686 หรือ 2500×843) + กำหนด tappable areas
- ปุ่มหลัก: **จองสนาม** (เปิด LIFF), **การจองของฉัน** (เปิด LIFF /bookings), **สาขา/แผนที่**, **ติดต่อ**
- ตั้งผ่าน Messaging API (`richmenu` endpoints) หรือ OA Manager

### 3.3 Push / Notification (Messaging API)
- ส่งใบยืนยันหลังจ่ายเงินสำเร็จ (ตรงกับที่ออกแบบไว้ว่า "รับสลิปใน LINE")
- reminder ก่อนถึงเวลาเล่น, แจ้ง waitlist ว่าง (Phase 2)
- ต้องเก็บ log: ตาราง `notifications` (มีในเอกสาร data-model แล้ว ยังไม่ได้สร้างจริง)

### 3.4 LIFF wrapper
- เพิ่ม `@line/liff` SDK
- `liff.init({ liffId })` ที่หน้า entry ของ LIFF
- ตรวจ `liff.isInClient()` — ถ้าเปิดใน LINE ให้ทำ auto-login ผ่าน bridge; ถ้าเปิดใน web ปกติใช้ Google login เดิม
- endpoint LIFF = URL production (Vercel) ที่มีอยู่แล้ว (ต้องเป็น HTTPS — มีแล้ว ✅)

---

## 4. Payment

| ตัวเลือก | ข้อดี | ข้อควรรู้ |
|---|---|---|
| **Stripe** (PromptPay QR + บัตร) | วางแผนไว้แล้ว, ครอบคลุมคนไทย, ทำงานใน LIFF ได้ | ต้องทำ Stripe integration ก่อน (งานที่ค้างอยู่) |
| **LINE Pay** | จ่ายผ่าน LINE โดยตรง native | ต้องสมัคร merchant แยก + approval, เพิ่ม integration อีกชุด |

**แนะนำ:** เริ่มด้วย **Stripe PromptPay** (ทำครั้งเดียวใช้ได้ทั้ง web + LIFF) → เพิ่ม LINE Pay ทีหลังถ้าลูกค้าต้องการ

---

## 5. ลำดับงานที่แนะนำ (Phasing)

**Phase A — Payment engine (ทำก่อน)**
- Stripe บน web: PaymentIntent (PromptPay/บัตร) → หน้าจ่ายเงิน → webhook → booking = confirmed จริง
- *เหตุผล: LINE booking ใช้ engine จ่ายเงินตัวเดียวกัน ทำก่อนไม่ต้องทำซ้ำ*

**Phase B — LINE foundation**
- สร้าง OA + Messaging API + LIFF app (ฝั่งลูกค้า)
- เขียน LINE↔Supabase auth bridge + `profiles.line_user_id`
- ห่อ web app เป็น LIFF (auto-login เมื่อเปิดใน LINE)

**Phase C — Rich Menu + Booking ผ่าน LINE**
- ตั้ง Rich Menu ชี้เข้า LIFF
- ทดสอบ flow เต็ม: กดเมนู → จอง → จ่าย → บันทึก DB

**Phase D — Notification**
- Push ใบยืนยัน + reminder ผ่าน Messaging API
- ตาราง `notifications` เก็บ log

**Phase E (เผื่ออนาคต)**
- LINE Pay, waitlist auto-notify, ผูกบัญชี LINE กับลูกค้าเดิม (account linking)

---

## 6. Schema ที่ต้องเพิ่ม (สรุป)

```sql
-- ผูกบัญชี LINE
alter table public.profiles add column if not exists line_user_id text unique;

-- log การแจ้งเตือน (มีในเอกสาร data-model แล้ว)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  channel text not null default 'line',       -- line | email
  event text not null,                         -- confirm | reminder | cancel | waitlist_open
  status text not null default 'sent',
  sent_at timestamptz not null default now()
);
```

---

## 7. Environment variables ที่ต้องเพิ่ม

```
LINE_CHANNEL_ID=...            # Messaging API / Login channel
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...  # สำหรับ push message
NEXT_PUBLIC_LIFF_ID=...        # เปิด LIFF ฝั่ง client
SUPABASE_SERVICE_ROLE_KEY=...  # ฝั่ง server เท่านั้น (auth bridge) — ห้าม expose
```

---

## 8. ความเสี่ยง / ข้อควรระวัง

- **service_role key** ใช้ใน auth bridge เท่านั้น เก็บฝั่ง server ห้ามหลุดไป client (bypass RLS ได้ทั้งระบบ)
- **Account linking**: ลูกค้าที่เคย login ด้วย Google แล้วมาเปิดผ่าน LINE = คนละ user id → ต้องมี flow ผูกบัญชี (match ด้วยเบอร์/อีเมล) ไม่งั้นประวัติจองแยกกัน
- **LIFF ↔ Stripe**: การจ่ายเงินใน in-app browser ของ LINE ต้องเทสต์ว่า redirect/3DS/PromptPay ทำงานได้ (บางเคส LINE browser มีข้อจำกัด → อาจต้อง `liff.openWindow` external)
- **PDPA**: เก็บ `line_user_id` = ข้อมูลส่วนบุคคล ต้องมี consent (มีตาราง consents ในแผนแล้ว)

---

## 9. สรุป
- ✅ **ทำได้จริง** — จองผ่าน LINE OA → บันทึกเข้า Supabase เรา โดย reuse ระบบเดิมเกือบหมด (LIFF)
- 🔑 ต้องได้ creds LINE จากลูกค้า (OA + Messaging API + LIFF)
- ⭐ งานหลักที่ยาก = **LINE↔Supabase auth bridge**
- 📌 แนะนำทำ **Stripe ก่อน** แล้วต่อ LINE (payment engine ร่วมกัน)
