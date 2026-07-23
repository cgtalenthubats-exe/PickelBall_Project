export type SlotType = "private" | "open_play";
export type SlotStatus = "available" | "full" | "maintenance";

export interface Slot {
  id: string;
  type: SlotType;
  start: string;
  end: string;
  court: string;
  price: number;
  peak?: boolean;
  status: SlotStatus;
  level?: string;
  capacity?: number;
  taken?: number;
  href?: string;
}

export interface Venue {
  id: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  image: string;
  gallery: string[];
  amenities: string[];
  slots: Slot[];
}

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1100&q=80`;

export const heroImage = U("1595435934249-5df7ed86e1c0");

const ladpraoSlots: Slot[] = [
  { id: "s1", type: "private", start: "08:00", end: "09:00", court: "A", price: 350, status: "available" },
  { id: "s2", type: "private", start: "09:00", end: "10:00", court: "A", price: 350, status: "available" },
  { id: "s3", type: "open_play", start: "10:00", end: "12:00", court: "B", price: 150, status: "available", level: "All Level", capacity: 12, taken: 4 },
  { id: "s4", type: "private", start: "12:00", end: "13:00", court: "A", price: 350, status: "maintenance" },
  { id: "s5", type: "private", start: "17:00", end: "18:00", court: "A", price: 500, peak: true, status: "available" },
  { id: "s6", type: "open_play", start: "18:00", end: "20:00", court: "A", price: 180, status: "available", level: "Legend 50+", capacity: 12, taken: 10 },
  { id: "s7", type: "private", start: "19:00", end: "20:00", court: "B", price: 500, peak: true, status: "available" },
  { id: "s8", type: "private", start: "20:00", end: "21:00", court: "A", price: 400, status: "full" },
];

export const venues: Venue[] = [
  {
    id: "ladprao",
    name: "Central Pickleball · ลาดพร้าว",
    area: "ลาดพร้าว, กรุงเทพฯ",
    address: "ชั้น 7 เซ็นทรัล ลาดพร้าว, ถ.พหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900",
    lat: 13.8163,
    lng: 100.5601,
    rating: 4.8,
    image: U("1626224583764-f87db24ac4ea"),
    gallery: [
      U("1626224583764-f87db24ac4ea"),
      U("1554068865-24cecd4e34b8"),
      U("1531315630201-bb15abeb1653"),
      U("1600965962361-9035dbfd1c50"),
    ],
    amenities: ["ที่จอดรถ", "WiFi", "ห้องเปลี่ยนเสื้อผ้า", "แอร์", "คาเฟ่"],
    slots: ladpraoSlots,
  },
  {
    id: "rama9",
    name: "The Court · พระราม 9",
    area: "ห้วยขวาง, กรุงเทพฯ",
    address: "ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
    lat: 13.7563,
    lng: 100.5665,
    rating: 4.6,
    image: U("1622279457486-62dcc4a431d6"),
    gallery: [
      U("1622279457486-62dcc4a431d6"),
      U("1567220720374-a67f33b2a6b9"),
      U("1554068865-24cecd4e34b8"),
      U("1595435934249-5df7ed86e1c0"),
    ],
    amenities: ["ที่จอดรถ", "WiFi", "คาเฟ่"],
    slots: [
      { id: "r1", type: "open_play", start: "07:00", end: "09:00", court: "1", price: 160, status: "available", level: "Beginner", capacity: 10, taken: 3 },
      { id: "r2", type: "private", start: "10:00", end: "11:00", court: "2", price: 400, status: "available" },
      { id: "r3", type: "private", start: "18:00", end: "19:00", court: "1", price: 550, peak: true, status: "available" },
      { id: "r4", type: "open_play", start: "19:00", end: "21:00", court: "2", price: 200, status: "available", level: "Intermediate", capacity: 12, taken: 11 },
    ],
  },
  {
    id: "thonglor",
    name: "Dink House · ทองหล่อ",
    area: "วัฒนา, กรุงเทพฯ",
    address: "ซ.ทองหล่อ 10 ถ.สุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110",
    lat: 13.7308,
    lng: 100.582,
    rating: 4.9,
    image: U("1615486511484-92e172cc4fe0"),
    gallery: [
      U("1615486511484-92e172cc4fe0"),
      U("1531315630201-bb15abeb1653"),
      U("1600965962361-9035dbfd1c50"),
      U("1567220720374-a67f33b2a6b9"),
    ],
    amenities: ["ที่จอดรถ", "แอร์", "ห้องเปลี่ยนเสื้อผ้า", "คาเฟ่", "โปรช็อป"],
    slots: [
      { id: "t1", type: "private", start: "09:00", end: "10:00", court: "A", price: 600, status: "available" },
      { id: "t2", type: "open_play", start: "17:00", end: "19:00", court: "B", price: 250, status: "available", level: "All Level", capacity: 8, taken: 5 },
      { id: "t3", type: "private", start: "20:00", end: "21:00", court: "A", price: 700, peak: true, status: "full" },
    ],
  },
];

export function getVenue(id: string): Venue | undefined {
  return venues.find((v) => v.id === id);
}

export function getSlot(venueId: string, slotId: string): Slot | undefined {
  return getVenue(venueId)?.slots.find((s) => s.id === slotId);
}

// Deterministic per-day availability variation (mock until DB is wired).
export function varyAvailability(slots: Slot[], dayOffset: number): Slot[] {
  if (dayOffset === 0) return slots;
  return slots.map((s, i) => {
    const seed = (i * 7 + dayOffset * 3) % 10;
    if (s.type === "open_play" && s.capacity) {
      const taken = (seed + dayOffset * 2) % (s.capacity + 1);
      return {
        ...s,
        taken,
        status: taken >= s.capacity ? "full" : "available",
      };
    }
    const status: SlotStatus =
      seed === 0 ? "full" : seed === 3 ? "maintenance" : "available";
    return { ...s, status };
  });
}

export const nearbySlots: { venueId: string; slot: Slot }[] = [
  { venueId: "ladprao", slot: ladpraoSlots[5] },
  { venueId: "ladprao", slot: ladpraoSlots[1] },
];

export type MyBookingStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled";

export interface MyBooking {
  id: string;
  venueId: string;
  venue: string;
  court: string;
  date: string;
  time: string;
  type: SlotType;
  status: MyBookingStatus;
  amount: number;
  level?: string;
  seats?: number;
  upcoming: boolean;
  // QR-ordering share token (confirmed bookings only) — /order/<token>
  orderToken?: string;
}

export const myBookings: MyBooking[] = [
  { id: "BK-1042", venueId: "ladprao", venue: "Central Pickleball · ลาดพร้าว", court: "A", date: "เสาร์ 5 ก.ค. 2026", time: "18:00–20:00", type: "open_play", status: "confirmed", amount: 360, level: "Legend 50+", seats: 2, upcoming: true },
  { id: "BK-1051", venueId: "rama9", venue: "The Court · พระราม 9", court: "2", date: "อาทิตย์ 6 ก.ค. 2026", time: "10:00–11:00", type: "private", status: "pending", amount: 400, upcoming: true },
  { id: "BK-1039", venueId: "ladprao", venue: "Central Pickleball · ลาดพร้าว", court: "A", date: "พฤหัส 3 ก.ค. 2026", time: "09:00–10:00", type: "private", status: "completed", amount: 350, upcoming: false },
  { id: "BK-1020", venueId: "thonglor", venue: "Dink House · ทองหล่อ", court: "B", date: "จันทร์ 30 มิ.ย. 2026", time: "17:00–19:00", type: "open_play", status: "completed", amount: 250, level: "All Level", seats: 1, upcoming: false },
  { id: "BK-1005", venueId: "rama9", venue: "The Court · พระราม 9", court: "1", date: "พุธ 25 มิ.ย. 2026", time: "18:00–19:00", type: "private", status: "cancelled", amount: 550, upcoming: false },
];
