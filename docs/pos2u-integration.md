# POS2U Integration — สถานะและแผน

> สถานะ: **หยุดสร้าง endpoint เพิ่ม — วาง flow ทั้งระบบให้ครบก่อน** (hold/reserve, race condition, refund) แล้วค่อยสร้างของที่เหลือ
>
> Flow diagram (FigJam): https://www.figma.com/board/LejYdaM4gT7iDi9EenzaJ9

## สถาปัตยกรรมที่ยืนยันแล้ว

ระบบมี 2 ทางเข้าที่ใช้ **DB เดียวกัน** (Supabase อันเดียว ไม่ใช่ sync คนละฐาน):

1. **Webapp ของเรา** — ลูกค้าจองออนไลน์เอง (ทางเดิม)
2. **POS2U หน้าร้าน** — พนักงานดูคิว/จองแทนลูกค้า walk-in หรือลูกค้าโทรมาจอง + รับชำระเงิน

**POS2U เป็นฝ่าย "เรียกเข้ามา" หาเรา** (client) ผ่าน REST API ที่เราเปิดให้ — เราคุม endpoint/auth/logic ทั้งหมด สิ่งที่ยังไม่รู้คือ POS2U (หรือซอฟต์แวร์หน้าร้าน) เรียก external API ได้จริงไหม — ยังต้องถาม Central Group/POS2U

---

## คำถามที่ 1: ดูคิวเสร็จแล้ว ต้อง "จอง/hold" ก่อนจ่ายไหม?

**ตอบ: ต้อง hold ก่อนเสมอ** — จองแบบ `pending` ทันทีที่พนักงานเลือกช่องให้ลูกค้า **ก่อน**ไปรับเงินที่เครื่อง ไม่ใช่รอจ่ายเสร็จแล้วค่อยสร้าง booking

**เหตุผล:** ถ้าไม่ hold ก่อน จะมีช่องว่างระหว่าง "ลูกค้าเลือกเวลา" กับ "จ่ายเงินเสร็จ" ที่คนอื่น (ทั้งจากเว็บ หรือ POS2U อีกเครื่อง) จองเวลาเดียวกันแทรกได้ — นี่คือ race condition ที่ถามในข้อ 2

**กลไก:** ใช้คอลัมน์ `bookings.hold_expires_at` ที่**มีอยู่ใน schema อยู่แล้วแต่ไม่เคยถูกใช้เลย** (เช็คโค้ดแล้ว — เขียนไว้ตั้งแต่ต้นแบบแต่ไม่มีที่ไหนอ่าน/เขียนค่านี้จริง) — ต้อง:
- ตอนสร้าง booking แบบ pending จาก POS2U → set `hold_expires_at = now() + 10-15 นาที` (สั้นกว่าจองออนไลน์ เพราะพนักงาน+ลูกค้ายืนอยู่หน้าเครื่องอยู่แล้ว)
- มี scheduled job (เช่น Vercel Cron ทุก 1-2 นาที) ปล่อยคืน slot ที่ hold หมดเวลาแล้วไม่จ่าย → `status = cancelled`

---

## คำถามที่ 2: ป้องกัน race condition ยังไง

แยกตามประเภทเพราะกลไกต่างกัน:

### จองเหมาคอร์ท (private) — **มีการป้องกันอยู่แล้ว ✅**
Schema มี PostgreSQL EXCLUDE constraint (`bookings_no_private_overlap`) ล็อกที่ระดับ database — กันคอร์ท+ช่วงเวลาเดียวกันถูกจองซ้ำแบบ atomic ไม่ว่าจะยิงมาจากเว็บ, POS2U, หรือที่ไหนก็ตาม ถ้าชนกัน Postgres จะ reject การ insert ที่สองเองทันที ไม่ต้องเขียน lock เพิ่ม

### Open Play (นับที่นั่งตาม capacity) — **⚠️ ยังไม่มีการป้องกันเลย (ช่องโหว่จริงที่ใช้งานอยู่ตอนนี้)**
เช็คโค้ด `createBooking` (ที่เว็บใช้อยู่ปัจจุบัน) แล้ว **ไม่มีการเช็ค capacity ก่อน insert เลย** — insert ตรงๆ โดยไม่ล็อกแถว session ก่อน หมายความว่า **ถ้ามี 2 คนกดจองรอบ Open Play ที่เหลือที่นั่งสุดท้ายพร้อมกัน ระบบจะปล่อยให้จองเกิน capacity ได้จริงในตอนนี้** — ไม่ใช่แค่เรื่องใหม่ที่เกี่ยวกับ POS2U แต่เป็นบั๊กที่มีอยู่แล้วในเว็บด้วย

**วิธีแก้ที่ถูกต้อง:** เพิ่ม **DB trigger** (`BEFORE INSERT` บน `bookings` เฉพาะแถว `booking_type = 'open_play'`) ที่ lock แถว session (`SELECT ... FOR UPDATE`) แล้วเช็ค `seats_taken + seats <= capacity` ก่อนอนุญาตให้ insert — ทำที่ระดับ database เหมือนกับ private เพื่อป้องกันไม่ว่า insert จะมาจากไหน (เว็บ, POS2U POST, admin) โดยไม่ต้องพึ่งให้ทุก endpoint จำไปเช็คเอง

---

## คำถามที่ 3: Refund

Schema มี `payments.status` และ `bookings.status` รองรับค่า `refunded` อยู่แล้ว (ไม่ต้อง migrate เพิ่ม) — ไม่มีตาราง `refunds` แยก (มีแค่ในเอกสารแผนเดิม ไม่เคยสร้างจริง) ใช้ field เดิมพอสำหรับ MVP

**Flow:** ลูกค้าขอยกเลิกหลังจ่ายแล้ว → พนักงาน reverse รายการที่เครื่อง POS2U → POS2U (หรือพนักงานเอง) แจ้งกลับเราผ่าน `PATCH /api/payments/pos-refund` (ยังไม่สร้าง) → เปลี่ยน `bookings.status = refunded`, `payments.status = refunded`

---

## Flow diagram

ดูภาพรวมทั้ง flow (hold → payment → confirm/cancel/timeout → refund) ที่: **https://www.figma.com/board/LejYdaM4gT7iDi9EenzaJ9**

---

## สรุป: GET / POST / PATCH ทั้งหมด

| # | Scenario | Verb | Endpoint | สถานะ |
|---|---|---|---|---|
| 1 | ดูคิว/ที่ว่างปัจจุบัน | **GET** | `/api/pos/availability` | ✅ สร้างแล้ว |
| 2 | จองใหม่ (hold ที่ไว้ก่อนจ่าย) | **POST** | `/api/pos/bookings` | ⏸️ รอตัดสินใจ walk-in identity |
| 3 | ยืนยันจ่ายสำเร็จ | **PATCH** | `/api/payments/pos-confirm` | ✅ สร้างแล้ว (รับ POST ด้วย) |
| 4 | พนักงานยกเลิก hold ก่อนจ่าย | **PATCH** | `/api/pos/bookings/:id` | ⏳ ยังไม่สร้าง |
| 5 | Hold หมดเวลาอัตโนมัติ | *(ไม่มี POS2U call — cron ภายใน)* | scheduled job | ⏳ ยังไม่สร้าง |
| 6 | คืนเงิน | **PATCH** | `/api/payments/pos-refund` | ⏳ ยังไม่สร้าง |

---

## งานที่ต้องทำก่อนสร้าง endpoint ที่เหลือ (เรียงตามลำดับ)

1. **DB trigger กันจองเกิน capacity ของ Open Play** — ควรทำก่อนสุด เพราะเป็นบั๊กที่ใช้งานอยู่จริงในเว็บตอนนี้ ไม่ใช่แค่เรื่อง POS2U
2. **ตัดสินใจ walk-in customer identity** (แบบ A shadow account / แบบ B nullable guest booking) — บล็อกการสร้าง `POST /api/pos/bookings`
3. สร้าง `POST /api/pos/bookings` (สร้าง pending + hold) พร้อม cron ปล่อย hold ที่หมดอายุ
4. สร้าง `PATCH /api/pos/bookings/:id` (ยกเลิก hold ด้วยมือ)
5. สร้าง `PATCH /api/payments/pos-refund`
6. ถามคำถามที่ค้างกับ Central Group/POS2U: เรียก external API ได้จริงไหม, auth model, refund ผ่าน API ได้ไหม
7. ตั้ง env vars ก่อนใช้งานจริง: `SUPABASE_SERVICE_ROLE_KEY`, `POS_API_KEY`
