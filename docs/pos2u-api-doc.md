# POS2U API — เอกสารสำหรับผู้พัฒนา (ฉบับส่งให้ POS2U/Central Group)

> ภาพรวม/เหตุผลการออกแบบอยู่ที่ `docs/pos2u-integration.md` — เอกสารนี้คือ spec ที่ใช้ implement จริง

Base URL: `https://<โดเมนจริงตอน deploy>` (จะยืนยันตอนตั้งค่า production)

## Auth

ทุก endpoint ต้องแนบ header:

```
Authorization: Bearer <POS_API_KEY>
```

คีย์นี้เป็นความลับร่วมกัน (shared secret) — ทีมเราจะส่งให้แยกต่างหาก ไม่ใส่ไว้ในเอกสารนี้ ถ้าคีย์ผิดหรือไม่ใส่ → ตอบ `401 { "error": "unauthorized" }` ทุก endpoint

ทุก endpoint คุยกัน DB เดียวกับเว็บแอปของเรา — ไม่มี sync/batch job ระหว่างระบบ อ่าน/เขียนแล้วเห็นผลทันที

---

## 1. GET /api/pos/availability

ดูคิว/ที่ว่างของสาขา ณ วันที่กำหนด (ก่อนจะจองให้ลูกค้า)

**Query params**
| ชื่อ | จำเป็น | รายละเอียด |
|---|---|---|
| `venueId` | ใช่ | UUID ของสาขา |
| `date` | ไม่ | `YYYY-MM-DD` (ไม่ใส่ = วันนี้ ตามเวลา Asia/Bangkok) |

**ตัวอย่าง request**
```
GET /api/pos/availability?venueId=11111111-1111-1111-1111-111111111111&date=2026-07-20
Authorization: Bearer <POS_API_KEY>
```

**ตัวอย่าง response 200**
```json
{
  "venue": { "id": "...", "slug": "ladprao", "name": "Central Pickleball · ลาดพร้าว" },
  "date": "2026-07-20",
  "courts": [{ "id": "...", "name": "คอร์ท 1", "purpose": "private", "status": "active" }],
  "privateBookings": [
    { "id": "...", "courtId": "...", "startTime": "2026-07-20T18:00:00+07:00", "endTime": "2026-07-20T19:00:00+07:00", "status": "confirmed" }
  ],
  "openPlaySessions": [
    { "id": "...", "courtId": "...", "startTime": "...", "endTime": "...", "capacity": 12, "taken": 9, "pricePerPerson": 150, "skillLevel": "all", "status": "open" }
  ]
}
```

**Errors**: `400 missing_venueId` / `400 invalid_date` / `404 venue_not_found`

---

## 2. POST /api/pos/bookings

สร้างการจองแทนลูกค้า walk-in หรือลูกค้าโทรจอง ใช้ทั้งกรณี "จองไว้ก่อน จ่ายทีหลัง" และ "จ่ายเสร็จเรียบร้อยแล้ว"

**Body**
| ฟิลด์ | ชนิด | จำเป็น | รายละเอียด |
|---|---|---|---|
| `venueId` | string (UUID) | ใช่ | |
| `type` | `"private"` \| `"open_play"` | ใช่ | |
| `courtId` | string (UUID) | เฉพาะ private | |
| `date` | `YYYY-MM-DD` | เฉพาะ private | |
| `start` | `HH:mm` | เฉพาะ private | |
| `end` | `HH:mm` | เฉพาะ private | |
| `price` | number | เฉพาะ private | ราคารวมที่ POS2U แจ้งลูกค้า (ระบบเรายังไม่มี pricing engine กลาง ณ ตอนนี้ — ใช้ราคาที่ POS2U คำนวณ/แสดงให้ลูกค้าเห็น) |
| `sessionId` | string (UUID) | เฉพาะ open_play | ได้จาก `GET /api/pos/availability` |
| `seats` | number | ไม่ (default 1) | เฉพาะ open_play |
| `customerPhone` | string | ใช่ | เบอร์โทรลูกค้า (ไทย เช่น `081-234-5678` หรือ `+66812345678` ก็ได้ ระบบ normalize ให้) — ใช้เป็น key ผูกประวัติลูกค้า |
| `customerName` | string | ไม่ | |
| `status` | `"reserved"` \| `"paid"` | ใช่ | `reserved` = จองไว้ยังไม่จ่าย, `paid` = จ่ายที่เครื่อง POS2U แล้ว |
| `transactionRef` | string | ใช่ เมื่อ `status="paid"` | เลขอ้างอิงการจ่ายจาก POS2U |
| `method` | string | ไม่ | เช่น `"card"` / `"promptpay"` / `"cash"` |

**ตัวอย่าง request — จองไว้ก่อน (event ล่วงหน้า ยังไม่จ่าย)**
```json
{
  "venueId": "11111111-1111-1111-1111-111111111111",
  "type": "private",
  "courtId": "22222222-2222-2222-2222-222222222222",
  "date": "2026-07-20",
  "start": "18:00",
  "end": "19:00",
  "price": 600,
  "customerPhone": "0812345678",
  "customerName": "สมชาย ใจดี",
  "status": "reserved"
}
```
**Response 201**: `{ "ok": true, "bookingId": "...", "status": "pending" }`

**ตัวอย่าง request — walk-in จ่ายเงินเสร็จที่เครื่องแล้ว**
```json
{
  "venueId": "11111111-1111-1111-1111-111111111111",
  "type": "open_play",
  "sessionId": "33333333-3333-3333-3333-333333333333",
  "seats": 2,
  "customerPhone": "0898765432",
  "status": "paid",
  "transactionRef": "POS2U-TXN-0001",
  "method": "card"
}
```
**Response 201**: `{ "ok": true, "bookingId": "...", "status": "confirmed" }`

**Errors**
| Code | เมื่อไหร่ |
|---|---|
| `400 missing_fields` / `invalid_type` / `invalid_status` / `missing_sessionId` / `session_venue_mismatch` | ข้อมูลไม่ครบ/ไม่ถูกต้อง |
| `422 status_paid_requires_transactionRef` | ส่ง `status:"paid"` แต่ไม่ส่ง `transactionRef` |
| `404 session_not_found` | `sessionId` ไม่มีจริง |
| `409 slot_taken` | คอร์ทเวลานั้นถูกจองไปแล้ว (private) |
| `409 session_full` | รอบ Open Play เต็มแล้ว (กันโดย DB ระดับ transaction ไม่ใช่แค่เช็คเฉยๆ — กันจองซ้อนแม้ยิงพร้อมกัน) |
| `500 customer_resolve_failed` | สร้าง/ค้นหาลูกค้าจากเบอร์โทรไม่สำเร็จ |

---

## 3. PATCH /api/pos/bookings/:id

ยกเลิกการจองที่ **ยังไม่จ่ายเงิน** (ลูกค้าเปลี่ยนใจ หรือพนักงานปล่อยคิวคืน) — ถ้าจ่ายไปแล้วต้องใช้ endpoint คืนเงิน (ข้อ 5) แทน เพราะมีเงินเคลื่อนไหวจริง

**Body**: `{ "reason"?: string }` (ไม่บังคับ ยังไม่ได้ใช้ทำอะไรฝั่งเรา ณ ตอนนี้ แต่ส่งมาได้เผื่ออนาคต)

**ตัวอย่าง**
```
PATCH /api/pos/bookings/44444444-4444-4444-4444-444444444444
Authorization: Bearer <POS_API_KEY>
```
**Response 200**: `{ "ok": true, "bookingId": "...", "status": "cancelled" }`

**Errors**: `404 booking_not_found` / `409 booking_not_cancellable` (จ่ายไปแล้ว หรือถูกยกเลิก/คืนเงินไปแล้ว — ดู `status` ที่ตอบกลับมาประกอบ)

---

## 4. POST หรือ PATCH /api/payments/pos-confirm

แจ้งว่าการจองที่ `reserved` ไว้ก่อนหน้านี้ จ่ายเงินสำเร็จแล้วที่เครื่อง POS2U (ใช้ verb ไหนก็ได้ ผลเหมือนกัน — endpoint นี้อัปเดตข้อมูลที่มีอยู่แล้วเสมอ)

**Body**
| ฟิลด์ | ชนิด | จำเป็น |
|---|---|---|
| `bookingId` | string (UUID) | ใช่ |
| `amount` | number | ใช่ — ต้องตรงกับยอดรวมของ booking เป๊ะ |
| `transactionRef` | string | ใช่ |
| `method` | string | ไม่ |
| `source` | string | ไม่ (default `"pos2u"`) |

**Response 200**: `{ "ok": true, "bookingId": "...", "status": "confirmed" }`

**Errors**: `400 missing_fields` / `404 booking_not_found` / `409 booking_not_pending` (จ่ายไปแล้วหรือถูกยกเลิกไปแล้ว) / `422 amount_mismatch` (ยอดไม่ตรงกับที่ระบบคำนวณไว้)

---

## 5. PATCH /api/payments/pos-refund

แจ้งว่าคืนเงินให้ลูกค้าแล้ว (reverse ที่เครื่อง POS2U เรียบร้อย) — ฝั่งเราแค่รับทราบและอัปเดตสถานะ ไม่ได้ประมวลผลการคืนเงินเอง

**Body**: `{ "bookingId": string, "reason"?: string }`

**Response 200**: `{ "ok": true, "bookingId": "...", "status": "refunded" }`

**Errors**: `400 missing_fields` / `404 booking_not_found` / `404 payment_not_found` / `409 booking_not_refundable` (ต้องเป็น booking ที่ `confirmed`/จ่ายแล้วเท่านั้น)

---

## สรุปสถานะ booking ที่เป็นไปได้

`pending` (จองไว้ ยังไม่จ่าย) → `confirmed` (จ่ายแล้ว) → `refunded` (คืนเงินแล้ว)
`pending` → `cancelled` (ยกเลิกก่อนจ่าย)

ไม่มีทางย้อนกลับ (เช่นจาก `refunded` กลับเป็น `confirmed`) — ถ้าจองใหม่ให้เรียก `POST /api/pos/bookings` ใหม่อีกครั้ง

## หมายเหตุสำหรับทีม POS2U

- ทุก field ที่เป็นเวลา (`startTime`, `endTime`) เป็น ISO8601 พร้อม timezone offset (`+07:00`)
- เบอร์โทรลูกค้าไม่ต้องกังวลเรื่องฟอร์แมต ระบบเรา normalize เป็น `+66...` ให้อัตโนมัติ
- ยังไม่ได้ยืนยันว่าซอฟต์แวร์หน้าร้าน POS2U เรียก external REST API แบบนี้ได้จริงหรือไม่ (ต้องถามทีม POS2U/Central Group โดยตรง) — เอกสารนี้คือ spec ฝั่งเราที่พร้อมใช้งานเมื่อคอนเฟิร์ม
