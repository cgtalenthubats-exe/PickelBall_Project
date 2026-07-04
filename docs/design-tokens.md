# Design Tokens — "Court Club" (Direction A)

> ทิศทางที่ล็อกแล้ว: พรีเมียม อบอุ่น สว่าง สงบ ไม่รก — ดึงจากโลก pickleball จริง (พื้นคอร์ทเขียว, ลูก optic-lime, เส้นคอร์ทขาว)
> Supersede palette amber ใน `design-system/pickleball-booking/MASTER.md`

## Color

| Token | Hex | ใช้ตรงไหน |
|-------|-----|-----------|
| `--bone` (bg) | `#F5F2EA` | พื้นหลังหลัก |
| `--surface` | `#FFFFFF` / `#FBFAF3` | การ์ด |
| `--ink` (text) | `#1A1C18` | ตัวอักษรหลัก |
| `--taupe` (muted) | `#5C5647` | ตัวอักษรรอง/คำอธิบาย |
| `--pine` (primary) | `#21463A` | ปุ่มหลัก, จองเหมา, heading |
| `--pine-deep` | `#163027` | hover/active |
| `--brass` (accent) | `#B08D57` | eyebrow, ป้ายรอง, เส้นเน้น |
| `--lime` (micro) | `#C6F24E` | live/available เล็กๆ เท่านั้น (ห้ามใช้เป็นพื้นใหญ่) |
| `--clay` (urgency) | `#C0522E` | ที่เหลือน้อย/almost-full |
| `--border` | `#E0DACB` | hairline |

**Semantic (booking):** available = pine · Open Play = brass/lime accent · almost-full = clay · full/disabled = taupe จาง 0.5

## Typography

| Role | Latin | Thai |
|------|-------|------|
| Display (heading) | **Bricolage Grotesque** 600–700 | **Anuphan** 600 |
| Body / UI | **Hanken Grotesk** 400–500 | **IBM Plex Sans Thai** 400–600 |
| Numerals (เวลา/ราคา) | tabular-nums; signature = mono treatment สำหรับ time labels ในปฏิทิน | เลขอารบิก tabular |

- **หนีฟอนต์ Inter** (AI tell) — จงใจ
- Type scale: 12 · 14 · 16 · 20 · 26 · 34 · 48 (mobile ปรับลง)
- Body 16px min บนมือถือ, line-height 1.5–1.7

## Layout & Signature
- Whitespace เยอะ, hairline `--border`, radius การ์ด 12–16px
- **Signature = "court-line motif"**: เส้นบางแนวนอน/ตาข่ายเป็น divider ระหว่าง section + ปฏิทินรวมที่ code สีสองโหมด
- Hero = thesis: "จองเหมาคอร์ท หรือเข้ารอบ Open Play — เห็นที่ว่างเรียลไทม์"

## Motion (Felt Quality)
- Page-load: stagger การ์ด slot 30–50ms/ใบ
- Hover: card lift เบาๆ (transform/opacity เท่านั้น)
- Hero: halo นวลตามเมาส์ (subtle)
- ทุกอย่าง respect `prefers-reduced-motion`, 150–300ms, ease-out เข้า

## Quality Bar — "$10k website" checklist (คุมทุกหน้า)
**Taste:** 1) มี point of view 2) typography ตั้งใจ 3) จำกัดโทนสี ไม่ฉูดฉาด
**Substance:** 4) hierarchy ชัด 5) imagery คุณภาพสูง (รูปสนามจริง)
**Felt Quality:** 6) motion มีความหมาย 7) mobile pass แยกจริง (80% ผู้ใช้) 8) โหลดเร็ว

## i18n
- next-intl, message catalog แยกไฟล์, **default = ไทย**, สลับ EN
- เผื่อ layout ทนความยาวข้อความต่างภาษา, จับคู่ฟอนต์ไทย-Latin ให้เป็นชุดเดียว
