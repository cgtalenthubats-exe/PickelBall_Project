# Customer Journey — ระบบจองสนาม Pickleball (v2)

> ต่อยอดจาก FigJam เดิม โดยเติมช่องโหว่ 5 จุด + แตกแขนง open-play

## Journey เดิม (จาก FigJam)
ค้นหา/เลือกสนาม → ดูตารางว่าง (Guest) → **Login/สมัคร** → เลือกวันเวลา → **สนามว่างไหม?**
- เต็ม/ปิดปรับปรุง → Waitlist / เลือกรอบอื่น
- ว่าง → เลือก add-on → ตรวจสอบสรุป → ชำระเงิน → **สำเร็จ?** → ยืนยัน+แจ้ง LINE → ไปใช้สนาม → รีวิว

## จุดที่เติมใน v2

### 1. แตกแขนง Private vs Open-play (หลัง "เลือกวันเวลา")
```
เลือกวัน → เห็นปฏิทินรวม
   ├── เลือก slot ว่าง (Private)      → เลือก add-on → สรุป → จ่าย
   └── เลือก Open-play session        → เห็นระดับ/ที่เหลือ/ราคาต่อคน
                                       → เลือกจำนวนที่ (พาเพื่อน) → (add-on) → สรุป → จ่าย
```

### 2. Payment = Stripe (ไม่มีมนุษย์ใน loop)
กล่อง "ชำระเงินผ่าน Gateway **หรือโอนแนบสลิป**" เดิม → เหลือ **"ชำระผ่าน Stripe (บัตร / PromptPay QR)"**
- สร้าง PaymentIntent → slot/seat = `pending` (hold)
- webhook succeeded → `confirmed` + แจ้ง LINE
- **ไม่สำเร็จ / หมดเวลา hold** → ปล่อย slot/seat คืน + แจ้งลูกค้า (เดิมวนกลับเฉยๆ ไม่มี exit path)

### 3. No-show branch (เดิมไม่มี)
`confirmed` → ถึงเวลา:
- มาเล่น → `completed`
- ไม่มา → `no_show` → +1 `no_show_count` (CRM signal สำหรับ re-engagement/policy)

### 4. Cancel / Reschedule (เดิมไม่มีใน journey)
จาก My Bookings → ยกเลิก/เลื่อนตาม policy → ถ้าเข้าเงื่อนไขคืนเงิน → `refunded`

### 5. Waitlist resolution (เดิมตัน)
Open-play/Private เต็ม → เข้า waitlist → เมื่อมีที่ว่าง → แจ้ง LINE → ลูกค้ามีเวลา X นาทียืนยัน → ไม่ยืนยันในเวลา → เลื่อนคิวถัดไป
(ทำเต็ม Phase 2 แต่ออกแบบ flow เผื่อ)

---

## หน้าจอหลักที่ต้องออกแบบ (input ให้ทีม UX/UI)
1. Landing / ค้นหา venue
2. Venue detail (gallery, floor map, amenities, map, T&C) — อิง BEAT Discovery
3. **ปฏิทินรวม private + open-play** ← จุดที่ไม่มี ref ลอกตรงๆ ต้องออกแบบเอง
4. Open-play session detail (ระดับ, ที่เหลือ, ราคา/คน, เลือกจำนวนที่)
5. Add-on selection (แยกฟรี/เช่าเพิ่ม)
6. Booking summary + Stripe checkout (บัตร/PromptPay QR)
7. Booking confirmed / pending / expired states
8. My Bookings (private + open-play, cancel/reschedule)
9. Admin: dashboard, venue/court CRUD, **open-play session scheduler**, equipment, pricing, customer profile, checklist template

## หลักการ UX (ส่งต่อให้ /frontend-design + /ui-ux-pro-max)
- Mobile-first, customer journey ต้องสั้น-ลื่น (จองเสร็จในไม่กี่ tap)
- ปฏิทินรวมต้องแยก private/open-play ให้เข้าใจทันทีโดยไม่สับสน
- แสดง "ที่เหลือ x/y" ของ open-play ให้เด่น (สร้าง urgency แบบ Reclub)
