# ระบบจองสนาม Pickleball — Project Brief v2

> เวอร์ชันนี้ต่อยอดจาก brief เดิม (`~/Downloads/pickleball-booking-project-brief.md`) โดยเพิ่ม decision ที่ตัดสินใจร่วมกันแล้ว และปิดช่องโหว่ที่พบตอนรีวิว ใช้เป็น **source of truth** ก่อนออกแบบ UI

## ภาพรวม
เว็บแอปจองสนาม Pickleball แบบ end-to-end + CRM/customer-data-platform ฝังในตัว ลูกค้าคือ **Central Group** → ทุก booking คือ data point ของพฤติกรรมลูกค้า schema ต้องเผื่อ The 1 Card ไว้ตั้งแต่ต้น (ช่อง `the1_member_id` ใน `users`, `payments`) โดยไม่ต้อง migrate ทีหลัง

---

## Decisions ที่ล็อกแล้ว (v2)

| # | เรื่อง | ข้อสรุป | เหตุผล |
|---|--------|---------|--------|
| D1 | Guest vs Member | **Browse แบบ guest ได้ แต่ต้อง login ก่อนจอง** (login-gated booking) | ยืนยันจาก customer journey diagram |
| D2 | Payment | **Stripe เท่านั้น** (บัตร + PromptPay QR, webhook-driven auto-confirm) — **ตัด manual transfer + แนบสลิปทิ้ง** | ตัดความเสี่ยงสลิปปลอม + ภาระ admin ตรวจ + error ตอนเช็คพลาด; Stripe PromptPay = ประสบการณ์ "โอนผ่านแอปธนาคาร" แต่ยืนยันอัตโนมัติ |
| D3 | Booking types | **รองรับทั้ง Private (เหมาคอร์ท) + Open-play (รอบรวม จ่ายรายหัว)** ในระบบเดียว, แสดงใน**ปฏิทินรวมหน้าเดียว** | ตลาดจริง (Dink A Lot + Reclub) แยกคนละระบบ → รวมในที่เดียวคือ differentiator |
| D4 | Org roles | **3 ชั้น: `super-admin` (ทุกสาขา) / `venue-manager` (เฉพาะสาขา) / `staff` (หน้างาน)** + ตาราง `staff_venue_assignments` | ฝังลึกใน RLS ทุก query — ทำ 2 role แบนแล้วเพิ่มทีหลัง = rewrite policy ทั้งระบบ |
| D5 | Corporate/invoice billing | **เลื่อนไป Phase 2/3** (จองแบบวางบิล/credit term ขององค์กร) | ไม่ใช่ retail flow, ไม่ควรแบก manual payment เข้า MVP เพราะเหตุนี้ |

---

## Booking Types — รายละเอียด

Private กับ Open-play **กันกันเองบนคอร์ท+เวลาเดียวกัน** (คอร์ทหนึ่งช่วงเวลาหนึ่ง เป็นได้อย่างใดอย่างหนึ่ง)

### Private (จองเหมาคอร์ท)
- 1 booking = เหมาทั้งคอร์ทในช่วงเวลานั้น
- ราคาต่อคอร์ท/ชั่วโมง (อิง pricing rules: peak/off-peak)
- เลือก add-on อุปกรณ์ได้
- อ้างอิง UX: Dink A Lot booking flow

### Open-play (รอบรวม จ่ายรายหัว)
- **admin / venue-manager ตั้งรอบล่วงหน้า**: คอร์ท + เวลา + จำนวนที่รับ (capacity) + ราคา/คน + ระดับฝีมือ
- ลูกค้า **"ซื้อสิทธิ์เข้ารอบ"** (ไม่เลือกที่นั่ง) — จองได้หลายที่ในรอบเดียว (พาเพื่อนมา)
- ที่ว่างลดลงตามคนจอง เต็มแล้ว → waitlist (schema เผื่อไว้, ทำเต็ม Phase 2)
- อ้างอิง UX: Reclub (เช่น รอบ 18:00–20:00, max 12 คน, ฿120–180/คน, ระดับ All Level / Legend 50+)
- Court rotation = เรื่อง operation หน้างาน ไม่ใช่ booking-time ไม่กระทบ schema MVP

### ปฏิทินรวม (จุดที่ต้องออกแบบเอง — ไม่มี ref ลอกตรงๆ)
ในหน้าปฏิทินของ venue/court ต้องแสดงทั้งสองแบบในมุมมองเดียว เช่น:
- `18:00 · ว่าง — จองเหมา ฿400/ชม.`
- `18:00 · Open Play (All Level) · เหลือ 3/12 ที่ · ฿150/คน`

---

## Payment Flow (Stripe-only)

1. ลูกค้ายืนยันรายการจอง → สร้าง Stripe `PaymentIntent` → booking = `pending` + `hold_expires_at` ผูกกับ intent
2. ลูกค้าจ่าย (บัตร หรือสแกน PromptPay QR ด้วยแอปธนาคาร)
3. Stripe webhook:
   - `payment_intent.succeeded` → booking = `confirmed` → แจ้งเตือน LINE
   - `payment_intent.payment_failed` / QR หมดอายุ / timeout → ปล่อย slot/seat คืน
- **ไม่มีมนุษย์อยู่ใน loop** — `PaymentIntent` คือกลไก hold+timeout ในตัว
- ตัด admin screen "ตรวจสอบ/อนุมัติสลิป" ทิ้งทั้งหมด
- ต้อง verify webhook signature เสมอ

---

## Feature Scope (ปรับจากเดิม)

### Customer
- สมัคร/Login (email, Google, LINE) — เก็บข้อมูลฐาน CRM ตั้งแต่ register
- ปฏิทินรวม: เห็นทั้ง private slot ว่าง และ open-play sessions ในหน้าเดียว
- จอง Private (เหมาคอร์ท) หรือ Open-play (ซื้อที่ในรอบ)
- เลือก add-on อุปกรณ์ (ไม้, ลูก, ball machine) — แยกของแถมฟรีในตัวจอง กับของเช่าเพิ่ม
- ตรวจสอบสรุป → จ่ายผ่าน Stripe
- My Bookings (private + open-play), ยกเลิก/เลื่อนตาม policy
- แผนที่/รายละเอียด venue, แจ้งเตือน LINE
- (Phase 2) Waitlist, Review/rating

### Admin (แยกสิทธิ์ 3 ชั้น)
- Dashboard สรุป booking/รายได้ (super-admin เห็นทุกสาขา, venue-manager เห็นเฉพาะสาขา)
- CRUD venue (gallery, floor map, amenities, T&C เฉพาะ venue, Google Maps embed, ราคา), เปิด-ปิดสนาม
- CRUD court (active/inactive)
- **จัดตาราง Open-play sessions** (คอร์ท+เวลา+capacity+ราคา/คน+ระดับ)
- CRUD equipment (ราคา, สต็อกต่อรอบ, is_included_free + included_quantity)
- ตั้ง pricing rules (peak/off-peak), operating hours, blackout/maintenance
- Customer Profile View (ประวัติ, lifetime spend, ความถี่, no-show count)
- Filter/segment ลูกค้า (re-engagement)
- Staff Checklist Template (display ต่อ booking, ยังไม่มี completion tracking)
- รายงานรายได้ + export
- Audit log (ใครแก้ราคา/ปิดสนาม/ออก refund)

### สิ่งที่ **ตัดออก** จาก brief เดิม
- ~~ตรวจสอบ/อนุมัติการชำระเงินจากสลิป~~ (ไม่มีแล้ว เพราะ Stripe-only)

---

## Non-functional
- Mobile-first (จองผ่านมือถือเป็นหลัก), Timezone **Asia/Bangkok**
- กันจองซ้อนที่ระดับ DB (unique/exclude constraint บน court+time สำหรับ private; seat-count transaction สำหรับ open-play) — **ไม่พึ่ง realtime อย่างเดียว**
- Realtime = อัปเดต UI ให้เห็น slot/seat เปลี่ยนสด
- Security: RLS แยก 3 role + scope ตาม venue, verify Stripe webhook signature
- **PDPA**: consent ตอน register, data retention, สิทธิ์ลบข้อมูล (Central ต้องการ)
- **e-Tax Invoice / ใบกำกับภาษี**: เก็บ tax info + ออกใบเสร็จได้ (Central ต้องการ)

---

## Phasing
- **Phase 1 (MVP):** Auth + ปฏิทินรวม + Private booking + Open-play booking + Stripe payment + Admin (venue/court/session/equipment/pricing) + LINE notify + Checklist display + 3-role RLS + PDPA consent + e-tax
- **Phase 2:** Waitlist (เน้น open-play), Review/rating, Membership/package, Promotion/coupon, TH/EN, Corporate invoice billing
- **Phase 3:** The 1 Card integration (เริ่มจาก "ใช้แต้มแลกส่วนลด" one-way — รอ API doc จาก Central)

## Stack (คงเดิม, ปรับ payment)
Next.js 14+ (App Router) · Tailwind + shadcn/ui · TanStack Query · Zustand · Supabase (Postgres/Auth/Storage/Realtime/RLS) · **Stripe** (แทน Omise/2C2P) · LINE Messaging API · Vercel

## Reference
- **BEAT Discovery** — ระดับความละเอียดหน้า venue (gallery, floor map, amenities, T&C, Google Map)
- **Dink A Lot** — private booking flow, add-on แยกฟรี/เช่าเพิ่ม, court schedule
- **Reclub** — open-play session format (เวลา+capacity+ราคา/คน+ระดับ, ซื้อสิทธิ์เข้ารอบ)
- **Book & Go** — ยืนยันว่าโมเดลรวม private+open-play ในระบบเดียวทำได้จริง
