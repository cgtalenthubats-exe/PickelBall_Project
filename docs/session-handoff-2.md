# Session Handoff #2 — สรุปสำหรับไปทำต่อที่ Claude Code Desktop (local)

วันที่: 29 กรกฎาคม 2569
Branch งาน: `main-73cl5c` (ทุกอย่าง merge เข้า `main` แล้ว ณ ตอนเขียนเอกสารนี้ที่ commit `b41237c`)

**สิ่งแรกที่ต้องทำก่อนลงมือใดๆ ที่เครื่อง local:**

```bash
git fetch origin main
git checkout -B main-73cl5c origin/main
```

(สาเหตุ: ทุก PR ที่ merge จาก session คลาวด์นี้ ถูก squash-merge เข้า `main` แล้ว sync `main-73cl5c` กลับมาเสมอ — local ที่ไม่ได้ pull มานาน จะไม่มีของใหม่พวกนี้เลย ถ้าไม่ pull ก่อน อาจจะไปแก้บนโค้ดเก่าที่ conflict กับของที่ merge ไปแล้ว)

---

## 1. ทำไปถึงไหนแล้ว (สถานะปัจจุบัน)

ระบบเป็น Pickleball Court Booking + CRM + POS + ERP แบบ in-house เต็มรูปแบบ (ไม่ใช้ POS2U แล้ว — เคยพิจารณาแล้วตัดสินใจสร้างเองแทน) ครบทั้ง 5 phase หลัก บวก follow-up หลายรอบ ล่าสุดคือ PR #34–#42 ที่ทำในรอบนี้:

| PR | สรุป |
|----|------|
| #37 | แดชบอร์ดรวมรายได้ POS, credit chip ที่ header, สร้างสินค้าหลายสาขาพร้อมกัน, ช่องเอกสาร/ผู้ส่งตอนรับสต็อก, timestamp ธุรกรรม, ระบบ POS หน้าเคาน์เตอร์ (staff สร้างออเดอร์ + QR ชำระเงิน) |
| #38 | รวมตาราง "ธุรกรรมล่าสุด" (จอง+ออเดอร์) ในแดชบอร์ด, log การคืนเงินพร้อมผู้ดำเนินการ, custom date-range สำหรับรายงาน, เพิ่ม audit columns (`orders.created_by/confirmed_by`, `payments.created_by`) |
| #39 | ระบบเช็คอินลูกค้าด้วย QR (ลูกค้าโชว์ QR ให้พนักงานสแกน → ยืนยันเช็คอิน → ต่อยอดสร้างออเดอร์ POS ได้เลย), เอา label "POS2U" ที่ล้าสมัยออกจากช่องทางในแดชบอร์ด |
| #40 | แก้บั๊ก: จองส่วนตัวล็อกไปคอร์ทแรกเสมอ (คอร์ท B/C จองไม่ได้เลย) → เพิ่ม court picker ให้ลูกค้าเลือกเอง, แก้ resolveCheckinToken พังง่าย, แก้กราฟรายได้ 6 เดือนไม่รวมยอด POS, เปลี่ยนชื่อหน้า "ออเดอร์หน้าร้าน" เป็น "POS" |
| #41 | **แก้บั๊กใหญ่**: การเพิ่มคอลัมน์ `checked_in_by`/`created_by`/`confirmed_by` ทำให้ตาราง bookings/orders มีความสัมพันธ์กับ profiles มากกว่า 1 เส้นทาง ทำให้ query ที่ embed `profiles(...)` แบบไม่ระบุ FK พังเงียบๆ (คืนค่าว่างแทน error) — กระทบแดชบอร์ด, รายงาน, หน้า POS, เช็คอิน ทั้งหมด แก้โดยระบุชื่อ FK ในทุก embed ที่เกี่ยวข้อง + เพิ่ม date picker ที่ใช้งานได้จริงในแดชบอร์ด (เดิมเป็นปุ่มตกแต่งเฉยๆ) |
| #42 | แก้ layout มือถือหน้า "สินค้า & สต็อก" (หัวข้อบีบตัวจนอ่านไม่ได้), แก้ฟอร์มแก้ไข/ปรับสต็อกที่แสดงข้อมูลสินค้า/สาขาหายไปตอนกดเปิด |

**Stripe:** ใส่ test key (`sk_test_...`) + webhook secret ใน Vercel env vars แล้ว, ตั้ง webhook endpoint แล้ว (`/api/payments/stripe-webhook`, event `checkout.session.completed`) — ยืนยันว่าทำงานถูกต้องในโหมด test แล้วจากการทดสอบจริง (จองสนาม + สั่งซื้อสินค้า เห็นออเดอร์ขึ้นในแดชบอร์ด/POS ถูกต้อง)

**Migration ทั้งหมดที่ต้องรันใน Supabase SQL Editor — รันครบแล้วทุกตัว ณ จุดนี้:**
`migration-product-images.sql`, `migration-stock-reserve.sql`, `migration-stock-doc.sql`, `migration-staff-orders.sql`, `migration-audit-trail.sql`, `migration-checkin.sql` (เรียงตามลำดับที่เพิ่มเข้ามา ไม่ต้องรันซ้ำถ้ารันแล้ว ทุกไฟล์เขียนแบบ `if not exists` ปลอดภัยถ้ารันซ้ำ)

**ค้างอยู่ / ยังไม่เสร็จ (ผู้ใช้ต้องทำเอง ไม่ใช่สิ่งที่ session ทำได้):**
- Revoke Supabase access token ที่เคยหลุดในแชทตอนต้น session ก่อนหน้า (token: `sbp_2952...`, project ref `weqejsgialrktlfyunvd`) — ยังไม่ยืนยันว่า revoke แล้วหรือยัง
- ลบ branch แปลกปลอม `claude/job-application-page-ccg9qt` ที่ไม่เกี่ยวกับโปรเจกต์นี้ (คนละโปรเจกต์ careers-portal) — session คลาวด์ไม่มีสิทธิ์ลบ ต้องลบเองผ่าน GitHub web UI หรือ `git push origin --delete claude/job-application-page-ccg9qt`
- เปิดใช้งาน Stripe **Live Mode** จริง — ต้องรอทีม Finance ยืนยันข้อมูลธุรกิจ/บัญชีธนาคารก่อน (ตอนนี้เป็น Test Mode)
- ปรับความถี่ cron คืน hold ที่ยังไม่ชำระ (ตอนนี้วันละครั้งเพราะ Vercel Hobby plan จำกัด cron แค่วันละครั้ง — ถ้าจะเปลี่ยนต้องอัปเกรด Vercel Pro หรือใช้ external scheduler)

---

## 2. งานที่กำลังจะทำต่อตอนนี้ (ที่เครื่อง local)

พรุ่งนี้มีพรีเซนต์กับทีม **Finance & Operations** ของลูกค้า (Central Group) เรื่องระบบการเงิน — ผมได้ทำสไลด์ pptx ไว้ให้แล้วจาก session คลาวด์ (ไฟล์ `PickleBall - ระบบการเงิน Finance Briefing.pptx`, 13 สไลด์ ส่งให้ในแชทของ session นั้นแล้ว — ต้องไปหาไฟล์จากที่ที่แชทนั้นบันทึกไว้ให้)

เนื้อหาสไลด์ครอบคลุม:
1. ภาพรวมระบบ & แหล่งรายได้ (จองสนาม / POS / เครดิต)
2. Flow การชำระเงิน — จองสนาม (Stripe Checkout + hold 15 นาที + webhook)
3. Flow การชำระเงิน — สั่งซื้อสินค้า POS (QR ลูกค้าเอง / พนักงานสร้างให้)
4. เปรียบเทียบ Stripe vs 2C2P + คำแนะนำ
5. ความปลอดภัยของระบบ (RLS, PCI scope, webhook signature, secrets)
6. เครดิต/แต้ม & การคืนเงิน — เน้นตรวจสอบย้อนหลังได้
7. รายงาน & Dashboard
8. การจัดเก็บข้อมูล
9. ขั้นตอนเชื่อมต่อบัญชี Stripe (สถานะ: Test Mode)
10. สถานะปัจจุบัน & แผนถัดไป

**สิ่งที่ยังขาด (ต้องทำที่เครื่อง local เพราะที่นั่นมีเบราว์เซอร์เข้าเว็บจริง):**

Session คลาวด์ที่ทำสไลด์ไม่มีเบราว์เซอร์เข้าเว็บจริง + ไม่มี credential ต่อ Supabase จริง เลยแคปหน้าจอ Desktop จริงให้ไม่ได้ — ในสไลด์ที่ 9 (รายงาน/Dashboard) เว้นกรอบ placeholder ไว้ให้แล้ว (ข้อความ "📸 แนะนำแนบภาพหน้าจอ...") ให้ไปแคปแล้ววางแทนกรอบนั้น

**หน้าที่ควรแคป (เปิดจากเบราว์เซอร์ desktop จริง, กว้างพอ ไม่ใช่ mobile view):**
1. `/admin` — แดชบอร์ด (ธุรกรรมล่าสุด รวมจอง+ออเดอร์, กราฟรายได้ 6 เดือน) — ถ้ามีข้อมูลจริงสวยๆ ให้เลือกวันที่ (date picker ใหม่) ที่มีข้อมูลเยอะหน่อย
2. `/admin/reports` — หน้ารายงาน พร้อมส่วน "รายการคืนเงินล่าสุด" (ถ้ามีข้อมูลคืนเงินจริงจะดีมาก จะได้โชว์ audit trail ให้ทีม Finance เห็นชัดๆ)
3. `/admin/orders` — หน้า POS (คิวออเดอร์ + ตาราง QR สั่งของ/เช็คอิน)
4. ตอนจองสนามจริงแล้วเจอหน้า Stripe Checkout (test mode) — แคปตอนอยู่หน้า Stripe เพื่อโชว์ว่าไม่มีข้อมูลบัตรผ่านระบบเราเลย
5. (ถ้าอยากได้เพิ่ม) หน้า `/checkin/[token]` และ `/admin/checkin/[token]` โชว์ flow เช็คอิน

วางภาพแทนกรอบ placeholder ในสไลด์ 9 ก่อน แล้วถ้าอยากเพิ่มสไลด์ภาคผนวกโชว์ภาพเพิ่มเติม (ข้อ 3-5) ก็เพิ่มได้เลย ไม่จำเป็นต้องยัดทุกภาพในสไลด์เดียว

---

## 3. ข้อควรระวังตอนทำต่อ

- **อย่าลืม pull ก่อนเริ่ม** (ดูคำสั่งด้านบนสุด) — ไม่งั้นจะไปแก้บนโค้ดที่ล้าสมัยกว่า 6 PR
- ถ้าจะรัน dev server local เพื่อแคปหน้าจอ ต้องมี `.env.local` ชี้ไปที่ Supabase project จริง (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) — หรือจะแคปจากเว็บ production จริงบน Vercel ก็ได้ (ง่ายกว่า ข้อมูลจริงพร้อมอยู่แล้ว)
- ไฟล์ pptx อยู่ในแชทของ session คลาวด์ (ไม่ได้อยู่ใน repo นี้) — ต้อง export/save จากที่นั่นมาแก้ที่เครื่อง local เอง (PowerPoint หรือ Google Slides เปิดได้ปกติ)
- งานทุกอย่างในเอกสารนี้ shipped ผ่าน commit → push → PR → merge → sync `main-73cl5c` กลับมาแล้วทั้งหมด — ไม่มีอะไรค้างอยู่ใน branch ที่ยังไม่ merge
