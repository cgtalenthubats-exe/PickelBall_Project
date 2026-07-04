# Data Model — ระบบจองสนาม Pickleball

> ระดับ entity + คอลัมน์หลัก ยังไม่ใช่ migration จริง ใช้เป็นแผนก่อนออกแบบ schema Supabase
> หลักการ: เผื่อ CRM + The 1 + PDPA + e-tax ตั้งแต่แรก, freeze ราคาเป็น snapshot ตอนจอง

## Core entities

### `users`
customer / admin / staff — `id`, `email`, `name`, `phone`, `role` (super_admin|venue_manager|staff|customer)
- CRM: `play_frequency`, `favorite_venue_id`, `total_lifetime_spend`, `last_visit_date`, `no_show_count`, `tags/segment`
- เผื่ออนาคต: `the1_member_id` (nullable)
- Tax (e-invoice): `tax_id`, `tax_name`, `tax_address` (nullable)

### `staff_venue_assignments`
`user_id` × `venue_id` — staff/venue_manager สังกัด venue ไหน (คุม RLS scope)

### `venues`
`id`, `name`, `address`, `google_map_embed`, `gallery[]`, `floor_map`, `amenities[]` (multi-select), `terms_and_conditions` (rich text), `status`

### `courts`
`id`, `venue_id`, `name`, `status` (active|inactive)

### `operating_hours`
`venue_id`/`court_id`, `day_of_week`, `open_time`, `close_time` — ฐานคำนวณ availability

### `pricing_rules`
`venue_id`/`court_id`, `day_of_week`/`date_range`, `time_range`, `price_per_hour`, `label` (peak|off-peak) — ราคา private ต่อช่วงเวลา

### `blackouts`
`court_id`, `start_time`, `end_time`, `reason` (maintenance ฯลฯ) — ทำให้ช่วงนั้นจองไม่ได้ (เป็น entity ไม่ใช่ status ใน slot)

### `open_play_sessions`
`id`, `venue_id`, `court_id`, `start_time`, `end_time`, `capacity`, `price_per_person`, `skill_level` (nullable: all|beginner|intermediate|pro|legend50+), `status` (open|full|cancelled)
- admin/venue-manager สร้าง; availability ของ private ต้อง exclude เวลาที่มี session อยู่

### `equipment`
`id`, `venue_id`, `name`, `rental_price`, `stock_per_slot`, `status` (active|inactive), `is_included_free`, `included_quantity`

### `bookings`
`id`, `user_id`, `court_id`, `venue_id`
- `booking_type` (**private** | **open_play**)
- `open_play_session_id` (nullable — เฉพาะ open_play)
- `seats` (default 1 — open_play พาเพื่อนมาได้)
- `start_time`, `end_time`
- `status`: ดู state machine ด้านล่าง
- `hold_expires_at` (สำหรับ pending)
- `stripe_payment_intent_id`
- **Price snapshot** (freeze ตอนจอง ห้ามคำนวณย้อนหลัง): `price_line_items` (jsonb: court/seat + add-ons + peak label + discount), `subtotal`, `total`

### `booking_addons`
`booking_id` × `equipment_id` × `quantity` × `price_at_booking` (snapshot)

### `payments`
`id`, `booking_id`, `stripe_payment_intent_id`, `method` (card|promptpay), `amount`, `status`, `paid_at`, เผื่อ `the1_member_id`

### `refunds`
`id`, `payment_id`, `amount`, `reason`, `status`, `created_by`

### `invoices` / `receipts`
`id`, `booking_id`, `tax_id`, `tax_name`, `tax_address`, `issued_at`, `pdf_url` — e-tax invoice (Central ต้องการ)

### `consents` (PDPA)
`user_id`, `type` (marketing|data_processing), `granted`, `granted_at`, `revoked_at`

### `checklist_templates`
`venue_id`/`court_id`, `items[]` — display ให้ staff ต่อ booking (ไม่มี completion tracking)

### `notifications`
`user_id`, `booking_id`, `channel` (line|email), `event` (confirm|reminder|cancel|waitlist_open), `sent_at`, `status`

### `audit_log`
`actor_id`, `action`, `entity`, `entity_id`, `before`, `after`, `created_at` — เปลี่ยนราคา/ปิดสนาม/refund

### `reviews` (Phase 2)
`user_id`, `venue_id`, `booking_id`, `rating`, `comment`, `status` (moderation)

### `waitlist` (Phase 2, schema เผื่อ)
`user_id`, `open_play_session_id`/`court_id+time`, `created_at`, `notified_at`, `expires_at`

---

## Booking state machine

```
pending  ──(Stripe succeeded)──▶ confirmed ──(ถึงเวลา + มาเล่น)──▶ completed
   │                                  │
   │(hold_expires / failed / QR หมด)  │(ลูกค้ายกเลิกตาม policy)
   ▼                                  ▼
released/expired                  cancelled ──(คืนเงิน)──▶ refunded
                                   
confirmed ──(ถึงเวลาแต่ไม่มา)──▶ no_show   (นับเข้า users.no_show_count → CRM signal)
```

- ไม่มี state `awaiting_slip_verification` แล้ว (Stripe-only)
- `pending` มี `hold_expires_at` — Stripe ดูแล expiry ของ PaymentIntent/QR ให้

---

## กันจองซ้อน (race condition)
- **Private:** unique/EXCLUDE constraint บน (`court_id`, time-range) + transaction — ไม่พึ่ง realtime
- **Open-play:** ซื้อ seat ใน transaction เช็ค `seats_taken + seats <= capacity` (row lock ที่ session)
- Realtime = อัปเดต UI ให้เห็นการเปลี่ยนแปลงสด (ไม่ใช่กลไกกันซ้อน)
