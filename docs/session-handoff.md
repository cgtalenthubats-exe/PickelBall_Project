# Session Handoff — สรุปงาน 30+ PR ล่าสุด (สำหรับ session ใหม่/local)

> เขียนไว้ ณ 2026-07-28 จาก remote session ที่ทำงานต่อเนื่องมาตลอด — session local ไม่ได้ pull มานาน เอกสารนี้สรุปให้ตามทัน แล้วชี้ว่าต้องทำอะไรต่อ

## ทำอย่างแรกก่อนอ่านต่อ

```bash
git fetch origin main
git checkout main
git pull origin main
```

ตอนนี้ `main` มี commit ล่าสุดคือการ merge PR #33 (ถ้าเลขไม่ตรง แปลว่ามีของใหม่กว่านี้อีก เช็ค `git log --oneline -20`)

ถ้าจะทำงานต่อ ให้สร้าง branch ใหม่จาก `main` (อย่าพัฒนาบน `main` ตรงๆ) — branch เดิมที่ใช้ตลอดคือ `main-73cl5c` แต่ merge หมดแล้วทุกตัว จะรีสตาร์ทชื่อเดิมจาก `main` ใหม่หรือใช้ชื่อใหม่ก็ได้

---

## Big picture: มีการเปลี่ยนทิศทางใหญ่ระหว่างทาง

**เดิม:** วางแผนต่อ POS2U (ระบบ POS ของ vendor ไทย) เป็นตัวรับชำระเงินหน้าร้าน + ให้พนักงานจองแทนลูกค้า walk-in

**เปลี่ยนเป็น:** **ตัดสินใจไม่ใช้ POS2U แล้ว — สร้าง ecosystem ของเราเองทั้งหมด** (Booking + Payment ผ่าน Stripe/2C2P เอง + POS ขายของ + ERP สต็อก) เหตุผลคือมี Stripe/2C2P อยู่แล้ว ไม่มีนโยบายรับเงินสด และคุมทุกอย่างเองได้มากกว่า

เอกสารเก่าเรื่อง POS2U (`docs/pos2u-integration.md`, `docs/pos2u-api-doc.md`) **ถูกติดป้าย DEPRECATED แล้ว** เก็บไว้เป็นประวัติเฉยๆ — endpoint `/api/pos/*` ที่เคยสร้างไว้ตอนนั้นก็ยังอยู่ในโค้ดแต่ไม่ได้ใช้งานจริงแล้ว (ควร refactor/ลบทีหลัง)

แผนทั้งหมดของ ecosystem ใหม่อยู่ที่ **`docs/roadmap.md`** — อ่านไฟล์นี้เพื่อความเข้าใจสถาปัตยกรรมเต็มๆ

Flow diagram ทั้งหมด (ภาพรวมระบบ, booking end-to-end, POS end-to-end, ERP end-to-end) อยู่ใน FigJam: **https://www.figma.com/board/LejYdaM4gT7iDi9EenzaJ9**

---

## สิ่งที่สร้างเสร็จแล้ว (PR #26 – #33 + follow-up)

### Phase 1 — รากฐาน: Role ต่อสาขา + Payment จริง (PR #26)
- **Role 3 ระดับ**: `super_admin` (ทุกสาขา) / `venue_manager` (เฉพาะสาขาตัวเอง ทำได้ทุกอย่าง) / `staff` (เฉพาะสาขา งานหน้างานเท่านั้น)
- `src/lib/authz.ts` — helper เช็คสิทธิ์ (`requireAdminPage`, `requireActionRole`, `canAccessVenue`)
- ทุก data fetcher ใน `src/lib/data/admin.ts` scope ตามสาขาแล้ว, ทุก action ใน `src/lib/admin-actions.ts` เช็ค role+สาขาแล้ว
- เมนู admin ซ่อนตาม role (`src/components/admin/admin-shell.tsx`)
- `docs/migration-roles.sql` — RLS ใหม่ (function `manages_venue`, `works_at_venue`)
- **Stripe payment แบบ gated**: `src/lib/payments.ts` — ถ้าไม่มี `STRIPE_SECRET_KEY` ระบบยัง auto-confirm booking แบบเดิม (beta) พอใส่ key จะเปลี่ยนเป็น pending+hold 15 นาที → checkout → webhook ยืนยัน
- Webhook: `src/app/api/payments/stripe-webhook/route.ts` (verify signature เอง ไม่ใช้ Stripe SDK)
- Cron ปล่อย hold: `src/app/api/cron/release-holds/route.ts` + `vercel.json` (ทุก 5 นาที)
- หน้า ลืมรหัสผ่าน/ตั้งรหัสใหม่ สำหรับทีมงาน (`/forgot-password`, `/reset-password`)

### Phase 2 — ERP: สินค้า + สต็อก (PR #27)
- หน้า admin `/admin/products` — จัดการเมนูสินค้าต่อสาขา + สต็อกเป็น ledger (ทุกความเคลื่อนไหวมีบันทึก ไม่มี "จำนวนคงเหลือ" แบบแก้ตรงๆ)
- `docs/migration-erp.sql` — ตาราง `products`, `stock_ledger`

### Phase 3 — POS: สั่งของผ่าน QR (PR #28)
- ทุก booking มี `order_token` (สุ่ม ผูกกับ booking) — พนักงานปริ้น QR หรือลูกค้าแชร์ให้ก๊วนได้
- หน้าลูกค้าสั่งของไม่ต้อง login: `/order/[token]`
- หน้าคิว operator: `/admin/orders` (รอชำระ/จ่ายแล้วรอเสิร์ฟ/เสิร์ฟแล้ว)
- `docs/migration-pos-orders.sql` — ตาราง `orders`, `order_items`

### Phase 4 — เครดิต + ใบเสร็จ + รายงานรวม (PR #29)
- Refund กลายเป็น **เครดิตใน wallet** (ไม่มีเติมเงินเอง — เจตนา หลีกเลี่ยงประเด็น e-money) ใช้หักอัตโนมัติตอนจ่ายครั้งถัดไปทั้ง booking และ POS
- ใบเสร็จ/ใบกำกับภาษีอย่างย่อ: `/receipt/[b|o]/[id]` — ลูกค้าแก้ชื่อ/เลขผู้เสียภาษีเองได้
- รายงาน (`/admin/reports`) รวมยอดขาย POS เข้าไปด้วยแล้ว แยก VAT
- `docs/migration-credit.sql` — ตาราง `credit_ledger`

### Phase 5 — แจ้งเตือน waitlist + Login OTP (PR #30)
- ที่ว่าง Open Play หลุด (ยกเลิก/refund/hold หมด) → แจ้งเตือนคิว waitlist อัตโนมัติ
- Login ด้วยเบอร์โทร (OTP ผ่าน SMS) — **ยังไม่ได้เปิดใช้งานจริง รอตั้งค่า SMS provider** (คุยกันแล้วว่าไม่รีบ)
- `docs/migration-notify.sql` — ตาราง `notifications`

### Follow-up 1 — รูปสินค้า + หมวดหมู่ (PR #31)
- อัปโหลดรูปสินค้าได้ (PNG/JPG/WebP ≤4MB) โชว์ทั้งแอดมินและเมนูลูกค้า
- หมวดหมู่สินค้า **ให้ผู้จัดการพิมพ์เองได้อิสระ** (ไม่ fixed) มี datalist ช่วยแนะนำหมวดที่เคยใช้
- `docs/migration-product-images.sql` — Supabase Storage bucket `products`

### Follow-up 2 — Cart reservation + safety stock (PR #32)
- แก้บั๊กจริง: เดิมสั่งของเกินสต็อกได้ (ไม่เช็คเลย)
- ตอนนี้เป็นแบบ **cart/picked**: เลือกของ = จองสต็อกทันที (atomic, กันจองพร้อมกันเกิน) → จ่ายสำเร็จค่อยตัดจริง → ไม่จ่ายใน 30 นาทีคืนสต็อกอัตโนมัติ
- **Safety stock**: ตั้ง buffer กันชนต่อสินค้าได้ (เผื่อ "ของไม่ตรง") ขายได้จริง = คงเหลือ − กันชน
- `docs/migration-stock-reserve.sql`

### Follow-up 3 — กระดิ่งแจ้งเตือนพนักงาน + เสียง (PR #33)
- กระดิ่งที่ header หลังบ้าน (badge unread + dropdown) เช็คทุก 20 วิ
- เสียงเตือน (WebAudio สร้างเอง ไม่มีไฟล์เสียง) เปิด/ปิดได้ ปุ่มข้างกระดิ่ง
- ยิงแจ้งเตือน: มีออเดอร์ POS เข้า (ทุก staff ในสาขา) + ของใกล้หมด (เฉพาะ manager)
- ไม่มี LINE — ตามที่คุยกันว่า in-app พอ

---

## สถานะ DB — ต้องรัน migration ตามลำดับนี้

> ผู้ใช้ (Sumeth) แจ้งว่ารันครบถึง `migration-notify.sql` แล้ว — **2 ไฟล์ล่าสุดยังไม่ยืนยันว่ารันหรือยัง**: `migration-product-images.sql`, `migration-stock-reserve.sql`

ลำดับเต็ม:
1. `migration-pos2u.sql` (ชื่อเก่า แต่ยังจำเป็น — มี capacity trigger กัน Open Play จองเกิน)
2. `migration-roles.sql`
3. `migration-erp.sql`
4. `migration-pos-orders.sql`
5. `migration-credit.sql`
6. `migration-notify.sql`
7. `migration-product-images.sql` ⚠️ เช็คว่ารันหรือยัง
8. `migration-stock-reserve.sql` ⚠️ เช็คว่ารันหรือยัง

**มีสคริปต์ตรวจสอบให้แล้ว: `docs/verify-db.sql`** — copy ไปรันใน Supabase SQL Editor จะขึ้นตาราง ✅/❌ ครบทุกตาราง/คอลัมน์/ฟังก์ชัน/trigger/bucket บอกด้วยว่าขาดไฟล์ไหน

---

## กำลังทำอะไรอยู่ตอนนี้ (ล่าสุดก่อน handoff)

ผู้ใช้ต้องการ **ต่อ Supabase MCP** เพื่อเช็ค DB สะดวกขึ้น (ไม่ต้อง copy SQL ไปรันเอง) — คุยกันจนพบว่า session ที่กำลังคุยอยู่ (remote) ทำไม่ได้เพราะ:
1. Sandbox ของ remote session บล็อกเน็ตเวิร์กไปหา `api.supabase.com`
2. MCP ต้องตั้งค่าฝั่ง client บนเครื่องจริง ไม่ใช่ remote session

**ผู้ใช้เพิ่งเปิดเผยว่ามี local session อยู่แล้วที่ `C:\Pickleball`** (ไม่ได้อัปเดตนาน) — นี่คือ session ที่ควรใช้ตั้ง MCP ต่อจากนี้

### ขั้นตอนที่ยังค้างอยู่ (ทำต่อได้เลยใน session นี้ หลัง pull):

1. **Revoke Supabase access token เก่า** — มีการแปะ token ในแชท remote session ไปแล้ว (`sbp_2952...`) ต้อง revoke ทิ้งด่วนที่ https://supabase.com/dashboard/account/tokens แล้วสร้างใหม่
2. **ตั้ง Supabase MCP** ด้วย token ใหม่:
   ```bash
   claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=sbp_<token-ใหม่> -- npx -y @supabase/mcp-server-supabase --project-ref=weqejsgialrktlfyunvd --read-only
   ```
   (`--project-ref` ล็อกไว้แค่ project นี้ / `--read-only` กันพลาดแก้ข้อมูล)
3. เช็คด้วย `claude mcp list`
4. Restart session แล้วลองสั่งให้เช็ค DB ผ่าน MCP ได้เลย (แทนการรัน `verify-db.sql` เอง)

---

## ค้างคาไว้ / ยังไม่ตัดสินใจ (ไม่รีบ)

- **Stripe vs 2C2P**: คุยเปรียบเทียบกันละเอียดแล้ว (ราคา, dev experience, enterprise tier) — สรุปแนะนำ **เริ่ม Stripe (Standard/flat rate + เปิด PromptPay) ก่อน** เพราะสมัครเองได้ทันที โค้ดต่อเสร็จแล้ว ส่วน 2C2P ค่อยพิจารณาตอนยอดสูงพอจะต่อรองเรตได้ ยังไม่ได้ใส่ Stripe key จริงบน Vercel
- **SMS OTP**: คาไว้ก่อน ยังไม่รีบ (มีค่าใช้จ่ายต่อข้อความ ต้องหา provider เช่น Twilio)
- **LINE Login**: ยังเป็น placeholder เท่านั้น (Supabase ไม่มี LINE provider ในตัว ต้อง custom)
- **Vercel production branch**: มีคำถามค้างว่าทำไม commit ขึ้น preview ไม่ใช่ production — แนะนำให้เช็ค Vercel → Settings → Git → Production Branch ต้องเป็น `main`

---

## Reference ไฟล์สำคัญ

| ไฟล์ | คืออะไร |
|---|---|
| `docs/roadmap.md` | แผนสถาปัตยกรรมเต็ม 5 เฟส + audit ของเก่า |
| `docs/verify-db.sql` | สคริปต์เช็คว่า migration ครบมั้ย |
| `docs/migration-*.sql` | migration ทั้งหมด (รันตามลำดับด้านบน) |
| `src/lib/authz.ts` | ระบบสิทธิ์/role |
| `src/lib/payments.ts` | Stripe integration (gated) |
| `src/lib/pos-order.ts` | logic สั่งของ + reserve/release สต็อก |
| `src/lib/credit.ts` | เครดิต wallet |
| `src/lib/notify.ts` | แจ้งเตือน (waitlist + staff) |
