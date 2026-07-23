# Roadmap — Ecosystem ของเราเอง (ไม่ใช้ POS2U)

> ตัดสินใจแล้ว: ไม่ใช้ POS2U — ทำ POS + ERP เป็น module ของเราเอง ทุกอย่างอยู่ใต้ branch management, รับเงินผ่าน Stripe/2C2P ทางเดียว (ไม่มีเงินสด, ไม่มี postpaid)
>
> Flow diagrams (FigJam): https://www.figma.com/board/LejYdaM4gT7iDi9EenzaJ9

## หลักการจัดลำดับ

เรียงตาม "อะไรบล็อกอะไร" — ของที่อยู่เฟสแรกคือรากฐานที่เฟสถัดไปต้องยืนบน ถ้าสลับลำดับจะต้องรื้อกลับมาแก้

```
Roles/RLS ──▶ ทุก module หลังจากนี้ (POS, ERP ต้อง scope ตามสาขา+role)
Payment จริง ──▶ POS (ขายของต้องเก็บเงินจริง), เครดิต (refund ต้องมีเงินจริงก่อน)
Products/ERP ──▶ POS (จะขายต้องมีของ+สต็อกก่อน)
POS ──▶ Reports รวมยอดขาย, ใบกำกับภาษี
```

---

## Phase 1 — รากฐาน: Roles ต่อสาขา + Payment จริง

| # | งาน | ทำไมต้องก่อน |
|---|---|---|
| 1.1 | **Role 3 ระดับ + scope ตามสาขา** — RLS ใหม่: `super_admin` เห็นหมด / `venue_manager` เฉพาะสาขาตัวเอง ทำได้ทุกอย่าง / `staff` เฉพาะสาขา เฉพาะงานหน้างาน + ซ่อนเมนู admin ตาม role | ทุก module ใหม่ต้อง scope ตามนี้ ทำทีหลัง = รื้อ RLS ทุกตาราง |
| 1.2 | **Stripe/2C2P จ่ายจริง** — booking เปลี่ยนจาก auto-confirm เป็น `pending` → จ่าย → webhook → `confirmed` | POS, เครดิต, hold ทั้งหมดรอตัวนี้ |
| 1.3 | **Hold-expiry cron** — `pending` เกิน X นาที auto-cancel + คืน slot (ใช้ `hold_expires_at` ที่มีในตารางแต่ยังไม่เคยถูกใช้) | มาคู่กับ 1.2 ไม่งั้น slot ถูกจองค้างโดยคนไม่จ่าย |
| 1.4 | **จัดการบัญชีทีมงาน** — เพิ่ม/ระงับ/เปลี่ยน role ในหน้า staff (มีโครงแล้ว ต้องเพิ่ม reset password ให้ลูกทีม + หน้า "ลืมรหัสผ่าน" สำหรับทีมงาน ผ่าน flow สำเร็จรูปของ Supabase) | ก่อนมี operation หลายคนใช้ระบบจริง |

## Phase 2 — สินค้า + สต็อก (ERP)

| # | งาน |
|---|---|
| 2.1 | Schema: `products` (ต่อสาขา, ราคา, VAT), `stock_ledger` (ทุกการเคลื่อนไหว: รับเข้า/ขาย/คืน/ปรับมือ), จุดสั่งซื้อ + แจ้งเตือนของใกล้หมด |
| 2.2 | หน้า admin จัดการเมนู/สินค้า (branch manager ตั้งเอง — ขายอะไรก็ได้ เรื่องครัวเป็นเรื่องของเขา) |
| 2.3 | หน้ารับของเข้า / เช็คสต็อก / ปรับสต็อก (operation ทำได้) |

## Phase 3 — POS ขายของ

| # | งาน |
|---|---|
| 3.1 | QR token สุ่มผูก booking (มีอายุตามช่วงเวลา session) — พนักงานปริ้น หรือคนจองเปิด/แชร์ให้ก๊วน |
| 3.2 | หน้าเมนูลูกค้า (สแกนแล้วเปิด ไม่ต้อง login) → ตะกร้า → จ่ายทันทีผ่าน Stripe/2C2P |
| 3.3 | แจ้งเตือน operator: ใครสั่ง สนามไหน รายการอะไร → เสิร์ฟ |
| 3.4 | ขายแล้วตัดสต็อกอัตโนมัติ (ผูกกับ 2.1) |
| 3.5 | หน้า POS ฝั่งพนักงาน (สั่งแทน/ปิดรายการที่หน้าเคาน์เตอร์) |

## Phase 4 — เครดิต + ใบกำกับภาษี + รายงาน

| # | งาน |
|---|---|
| 4.1 | **Credit ledger** — refund (สนาม/อาหาร) เข้า wallet เป็นแต้ม ไม่มีเติมเงิน → ใช้หักตอนจ่ายครั้งถัดไป (ทั้ง booking และ POS) + คืนสต็อกถ้าเป็นสินค้า |
| 4.2 | **ใบเสร็จ/ใบกำกับภาษี** — ปริ้นได้ทั้ง booking และ POS, ลูกค้าแก้ชื่อ/ที่อยู่/เลขผู้เสียภาษีเองได้ (คอลัมน์ tax_id/tax_name/tax_address มีในตาราง profiles แล้ว ยังไม่มีหน้าจอ) |
| 4.3 | **Reports รวมทุกรายได้** — แยกประเภท ค่าสนาม/อุปกรณ์/อาหาร-เครื่องดื่ม + VAT + แยกสาขา + export CSV (ขยายจากหน้า Reports เดิม) |

## Phase 5 — Login ลูกค้า + แจ้งเตือน

| # | งาน |
|---|---|
| 5.1 | Google OAuth + LINE Login + เบอร์โทร OTP (ลูกค้าไม่มีรหัสผ่าน — ไม่ต้องมี forget password ฝั่งลูกค้า; SMS OTP มีค่าส่งต่อข้อความ ต้องเลือก provider) |
| 5.2 | Waitlist auto-notify — slot ว่าง (ยกเลิก/refund/hold หมด) แจ้งคิวถัดไปอัตโนมัติ (ตอนนี้เป็น MVP กดเข้าคิวเฉยๆ ไม่มีแจ้งเตือน) |
| 5.3 | LINE OA Rich Menu / แจ้งเตือนนัดหมาย (แผนเดิมใน docs/line-integration.md) |

---

# ผลตรวจของเดิม — อะไรใช้ได้ต่อ / อะไรต้องปรับ

## ✅ ใช้ได้ต่อเลย ไม่ต้องแก้

- **Booking engine** — private (EXCLUDE constraint กันจองซ้ำ) + open play + อุปกรณ์เช่า + waitlist
- **DB trigger กัน open play เกิน capacity** (`docs/migration-pos2u.sql`) — ยังจำเป็นเหมือนเดิมไม่เกี่ยวกับ POS2U **แต่ยังไม่ได้รันบน Supabase จริง**
- **Shadow account จากเบอร์โทร** (`pos-customer.ts`) — ยังใช้กับ staff portal จองแทน walk-in ได้เลย
- **Admin CRUD ทั้งหมด** (venues, equipment, pricing, sessions, CRM, tasks) — โครงถูกแล้ว รอแค่ scope ตาม role
- **คอลัมน์ใหม่จาก migration ล่าสุด** — `payments.source`, `bookings.channel`, unique phone — ใช้ต่อได้หมด (`channel='pos2u'` เปลี่ยนความหมายเป็น "จองโดยพนักงานหน้าร้าน" หรือ rename ทีหลังได้)

## 🔧 ต้องปรับ

| ของเดิม | ปัญหา | ปรับเป็น | เฟส |
|---|---|---|---|
| `/api/pos/*` + `/api/payments/pos-*` (Bearer key) | ออกแบบไว้ให้ **ระบบภายนอก** (POS2U) เรียกเข้ามา แต่ตอนนี้พนักงานคือ user ในระบบเราเอง login อยู่แล้ว | เปลี่ยนเป็น server actions ผูกกับ session + role (แบบเดียวกับ admin actions ทุกตัว) — ปลอดภัยกว่า static key และรู้ตัวตนคนทำรายการ / จะเก็บ REST ไว้เผื่ออนาคตก็ได้แต่ไม่ใช่ทางหลัก | 1 |
| `createBooking` auto-confirm (`status: "confirmed"` ทันที ไม่มีจ่ายเงิน) | โหมด beta ไม่มี payment จริง | `pending` + hold → จ่าย Stripe/2C2P → webhook ยืนยัน | 1.2 |
| `hold_expires_at` ไม่มีใครใช้ | ไม่มี cron ปล่อยคืน slot — เดิมคิดว่า POS2U จะบอก ตอนนี้ต้องทำเอง | Cron ทุก 1-2 นาที auto-cancel | 1.3 |
| RLS `is_staff()` เห็นทุกสาขา | staff สาขาไหนก็เห็น/แก้ข้อมูลทุกสาขา | เช็ค role + `managed_venue_id` ต่อแถว | 1.1 |
| Refund แค่เปลี่ยน status | เงินหายไปเฉยๆ ไม่กลายเป็นเครดิต | เข้า credit ledger + คืนสต็อก/slot | 4.1 |
| Login email/password อย่างเดียว | ลูกค้าต้องการ Google/LINE/OTP | เพิ่ม 3 ช่องทาง + ลืมรหัสผ่านสำหรับทีมงาน | 5.1 / 1.4 |
| Reports นับแต่รายได้จอง | ไม่มียอดขาย POS, ไม่แยก VAT | รวมทุกแหล่ง แยกประเภท/สาขา | 4.3 |
| Dashboard subtitle วันที่ hardcode ("ศุกร์ 4 กรกฎาคม 2026") | แสดงวันผิดตลอด | ใช้วันที่จริง (แก้เล็กน้อย) | แทรกได้เลย |
| เอกสาร `pos2u-integration.md` / `pos2u-api-doc.md` | อิงสถาปัตยกรรมที่ยกเลิกแล้ว | ติดป้าย deprecated ชี้มาที่ roadmap นี้ | 1 |

## ยังไม่ตัดสินใจ / รอคุย

- ตัวเลือก payment ที่จะเปิดจริง: Stripe หรือ 2C2P ตัวเดียวก่อน หรือทั้งคู่ (แนะนำเริ่มตัวเดียวก่อน — 2C2P ถ้าลูกค้าหลักเป็นคนไทย/PromptPay, Stripe ถ้าอยากได้ dev experience ที่ง่ายกว่า)
- SMS OTP provider + งบค่า SMS ต่อเดือน
- เครื่องปริ้นใบเสร็จหน้าร้าน (browser print ธรรมดา หรือ thermal printer — กระทบวิธี implement 4.2)
