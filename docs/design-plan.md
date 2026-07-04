# Design Plan — ระบบจองสนาม Pickleball

> Design direction จาก `/ui-ux-pro-max` — รายละเอียดเต็มอยู่ใน `design-system/pickleball-booking/MASTER.md`
> Page override หน้าปฏิทินรวม: `design-system/pickleball-booking/pages/unified-booking-calendar.md`

## Design Direction

| ด้าน | เลือก | เหตุผล |
|------|-------|--------|
| Pattern | **Marketplace / Directory** | จองสนาม = ค้นหา venue แล้วเลือก — search-first, listing-driven |
| Style | **Soft UI Evolution** | เงานุ่ม depth บางๆ, WCAG AA+, ดู modern-premium เหมาะกับ Central |
| Palette | **Amber #F59E0B + Blue accent #2563EB** บนพื้น cream (#FFFBEB) | Amber = พลังงาน/กีฬา, Blue = ความน่าเชื่อถือ/ปุ่มจอง |
| Typography | **Barlow Condensed** (heading) + **Barlow** (body) | ตระกูล athletic/condensed สื่อกีฬาชัด อ่านง่ายบนมือถือ |
| Icons | Lucide / Heroicons (SVG เท่านั้น ห้าม emoji) | consistency + theming |

> หมายเหตุ: palette นี้ปรับให้เข้ากับ brand guideline ของ Central ได้ถ้ามีข้อกำหนด — ตอนนี้ใช้แนว sport-premium เป็น default

## Screen Inventory (Phase 1)

**Customer**
1. Landing — hero + search venue (search bar = CTA หลัก), featured venues, trust/safety
2. Venue detail — gallery, floor map, amenities, Google Map, T&C (อิง BEAT Discovery)
3. ⭐ **ปฏิทินรวม private + open-play** — หน้า signature (ดูด้านล่าง)
4. Open-play session detail — ระดับ, ที่เหลือ x/y, ราคา/คน, เลือกจำนวนที่
5. Add-on selection — แยกของแถมฟรี / เช่าเพิ่ม
6. Booking summary + Stripe checkout — step indicator, บัตร/PromptPay QR
7. Booking status — confirmed / pending(hold) / expired
8. My Bookings — private + open-play, cancel/reschedule

**Admin (3-role scoped)**
9. Dashboard — รายได้/booking (super-admin ทุกสาขา, venue-manager เฉพาะสาขา)
10. Venue/Court CRUD
11. ⭐ **Open-play session scheduler** — ตั้งรอบ (คอร์ท+เวลา+capacity+ราคา/คน+ระดับ)
12. Equipment, Pricing rules, Customer profile, Checklist template

## ⭐ Signature screen: ปฏิทินรวม (ออกแบบเอง ไม่มี ref)

**เป้าหมาย:** เห็นทั้ง Private (จองเหมา) และ Open-play (รอบรวม) ในมุมมองเดียว โดยแยกออกจากกันชัดเจนใน 1 วินาที

**หลักการแยกสองโหมด:**
- ใช้ **สี + ป้าย + ไอคอน** ไม่ใช่สีอย่างเดียว (accessibility)
  - Private slot = โทน amber/neutral + ป้าย "จองเหมา" + ราคา/ชม.
  - Open-play = โทน blue + ป้าย "Open Play" + ระดับ + **badge "เหลือ x/y ที่"** เด่น (สร้าง urgency แบบ Reclub)
- Slot เต็ม/ปิดปรับปรุง = ทึบ/disabled ชัด กดไม่ได้
- Toggle filter ด้านบน: "ทั้งหมด / จองเหมา / Open Play" (progressive disclosure)
- Mobile-first: วันเลือกด้านบน (horizontal scroll chips), slot เป็น list card แนวตั้ง (ไม่ใช่ grid แน่นๆ ที่กดยากบนมือถือ)
- Number = tabular figures (ราคา/ที่เหลือ ไม่ขยับ layout)

**States:** loading = skeleton, ไม่มี slot = empty state พร้อม CTA, hold = แสดง countdown ที่เหลือ

## UX guardrails (จาก skill)
- Touch target ≥44px, spacing ≥8px
- Step indicator ทุก multi-step flow (checkout)
- Empty state มี message + action เสมอ
- Error ใต้ field + recovery path
- Contrast ≥4.5:1, focus ring ชัด, respect reduced-motion
- Responsive breakpoints: 375 / 768 / 1024 / 1440
