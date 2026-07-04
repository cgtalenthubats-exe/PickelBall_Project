// Mock data for admin back-office + customer bookings. No DB yet.

export type BookingStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "no_show";

export interface AdminBooking {
  id: string;
  customer: string;
  venue: string;
  court: string;
  date: string;
  time: string;
  type: "private" | "open_play";
  status: BookingStatus;
  amount: number;
}

export const kpis = {
  revenueToday: 24800,
  revenueTodayDelta: 12,
  bookingsToday: 38,
  bookingsTodayDelta: 8,
  occupancy: 72,
  occupancyDelta: 5,
  activeMembers: 1240,
  activeMembersDelta: 3,
};

export const revenueByMonth = [
  { label: "ก.พ.", value: 320 },
  { label: "มี.ค.", value: 410 },
  { label: "เม.ย.", value: 380 },
  { label: "พ.ค.", value: 520 },
  { label: "มิ.ย.", value: 610 },
  { label: "ก.ค.", value: 740 },
];

export const revenueByType = [
  { label: "จองเหมาคอร์ท", value: 62, color: "#B08D57" },
  { label: "Open Play", value: 38, color: "#21463A" },
];

export const revenueByVenue = [
  { venue: "ลาดพร้าว", value: 312000 },
  { venue: "พระราม 9", value: 218000 },
  { venue: "ทองหล่อ", value: 264000 },
];

export const recentBookings: AdminBooking[] = [
  { id: "BK-1042", customer: "ณัฐพงษ์ ส.", venue: "ลาดพร้าว", court: "A", date: "4 ก.ค.", time: "18:00–20:00", type: "open_play", status: "confirmed", amount: 360 },
  { id: "BK-1041", customer: "Praewa T.", venue: "ทองหล่อ", court: "B", date: "4 ก.ค.", time: "17:00–19:00", type: "open_play", status: "pending", amount: 500 },
  { id: "BK-1040", customer: "สมชาย ก.", venue: "พระราม 9", court: "1", date: "4 ก.ค.", time: "10:00–11:00", type: "private", status: "confirmed", amount: 400 },
  { id: "BK-1039", customer: "Mint W.", venue: "ลาดพร้าว", court: "A", date: "3 ก.ค.", time: "09:00–10:00", type: "private", status: "completed", amount: 350 },
  { id: "BK-1038", customer: "ธนวัฒน์ ล.", venue: "ทองหล่อ", court: "A", date: "3 ก.ค.", time: "20:00–21:00", type: "private", status: "cancelled", amount: 700 },
  { id: "BK-1037", customer: "Nicha P.", venue: "พระราม 9", court: "2", date: "3 ก.ค.", time: "19:00–21:00", type: "open_play", status: "no_show", amount: 400 },
];

export interface Branch {
  id: string;
  name: string;
  area: string;
  address: string;
  courts: number;
  status: "active" | "inactive";
  amenities: string[];
  lat: number;
  lng: number;
}

export const branches: Branch[] = [
  { id: "ladprao", name: "Central Pickleball · ลาดพร้าว", area: "ลาดพร้าว, กรุงเทพฯ", address: "1691 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กทม. 10900", courts: 4, status: "active", amenities: ["ที่จอดรถ", "WiFi", "ห้องเปลี่ยนเสื้อผ้า", "แอร์", "คาเฟ่"], lat: 13.8177, lng: 100.5602 },
  { id: "rama9", name: "The Court · พระราม 9", area: "ห้วยขวาง, กรุงเทพฯ", address: "9 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กทม. 10310", courts: 3, status: "active", amenities: ["ที่จอดรถ", "WiFi", "คาเฟ่"], lat: 13.7583, lng: 100.5655 },
  { id: "thonglor", name: "Dink House · ทองหล่อ", area: "วัฒนา, กรุงเทพฯ", address: "55 ซ.ทองหล่อ 10 แขวงคลองตันเหนือ เขตวัฒนา กทม. 10110", courts: 2, status: "inactive", amenities: ["ที่จอดรถ", "แอร์", "โปรช็อป"], lat: 13.7376, lng: 100.5836 },
];

export interface PricingRule {
  id: string;
  venue: string;
  court: string;
  days: string;
  time: string;
  price: number;
  label: "peak" | "off_peak";
}

export const pricingRules: PricingRule[] = [
  { id: "p1", venue: "ลาดพร้าว", court: "ทุกคอร์ท", days: "จ.–ศ.", time: "08:00–16:00", price: 350, label: "off_peak" },
  { id: "p2", venue: "ลาดพร้าว", court: "ทุกคอร์ท", days: "จ.–ศ.", time: "16:00–22:00", price: 500, label: "peak" },
  { id: "p3", venue: "ลาดพร้าว", court: "ทุกคอร์ท", days: "ส.–อา.", time: "08:00–22:00", price: 550, label: "peak" },
  { id: "p4", venue: "พระราม 9", court: "ทุกคอร์ท", days: "จ.–ศ.", time: "08:00–16:00", price: 400, label: "off_peak" },
  { id: "p5", venue: "พระราม 9", court: "ทุกคอร์ท", days: "จ.–อา.", time: "16:00–22:00", price: 550, label: "peak" },
];

export interface Equipment {
  id: string;
  name: string;
  venue: string;
  price: number;
  stockPerSlot: number;
  includedFree: boolean;
  status: "active" | "inactive";
}

export const equipment: Equipment[] = [
  { id: "e1", name: "ไม้แร็กเกต (มาตรฐาน)", venue: "ทุกสาขา", price: 100, stockPerSlot: 8, includedFree: false, status: "active" },
  { id: "e2", name: "ไม้แร็กเกต (Pro)", venue: "ลาดพร้าว", price: 180, stockPerSlot: 4, includedFree: false, status: "active" },
  { id: "e3", name: "ลูกพิกเกิลบอล", venue: "ทุกสาขา", price: 0, stockPerSlot: 20, includedFree: true, status: "active" },
  { id: "e4", name: "ตะกร้าลูก (Ball Basket)", venue: "ลาดพร้าว", price: 300, stockPerSlot: 2, includedFree: false, status: "active" },
  { id: "e5", name: "Ball Machine", venue: "ทองหล่อ", price: 500, stockPerSlot: 1, includedFree: false, status: "inactive" },
];

export interface OpenPlaySession {
  id: string;
  venue: string;
  court: string;
  date: string;
  time: string;
  level: string;
  capacity: number;
  taken: number;
  price: number;
  status: "open" | "full" | "cancelled";
}

export const sessions: OpenPlaySession[] = [
  { id: "op1", venue: "ลาดพร้าว", court: "B", date: "4 ก.ค.", time: "10:00–12:00", level: "All Level", capacity: 12, taken: 4, price: 150, status: "open" },
  { id: "op2", venue: "ลาดพร้าว", court: "A", date: "4 ก.ค.", time: "18:00–20:00", level: "Legend 50+", capacity: 12, taken: 10, price: 180, status: "open" },
  { id: "op3", venue: "พระราม 9", court: "2", date: "4 ก.ค.", time: "19:00–21:00", level: "Intermediate", capacity: 12, taken: 12, price: 200, status: "full" },
  { id: "op4", venue: "ทองหล่อ", court: "B", date: "5 ก.ค.", time: "17:00–19:00", level: "All Level", capacity: 8, taken: 5, price: 250, status: "open" },
];

export interface StaffTask {
  id: string;
  venue: string;
  court: string;
  title: string;
  time: string;
  category: "cleaning" | "prep" | "check";
  done: boolean;
}

export const tasks: StaffTask[] = [
  { id: "tk1", venue: "ลาดพร้าว", court: "A", title: "เช็ดพื้นคอร์ท + เก็บขยะ", time: "07:30", category: "cleaning", done: true },
  { id: "tk2", venue: "ลาดพร้าว", court: "A", title: "เตรียมลูกบอล + ตรวจตาข่าย", time: "07:45", category: "prep", done: true },
  { id: "tk3", venue: "ลาดพร้าว", court: "B", title: "เช็ดพื้นคอร์ท", time: "09:30", category: "cleaning", done: false },
  { id: "tk4", venue: "ลาดพร้าว", court: "B", title: "ตรวจไฟส่องสว่าง", time: "16:00", category: "check", done: false },
  { id: "tk5", venue: "พระราม 9", court: "1", title: "ทำความสะอาดหลังรอบเช้า", time: "12:00", category: "cleaning", done: false },
  { id: "tk6", venue: "พระราม 9", court: "2", title: "เตรียมพื้นที่รอบ Open Play", time: "18:30", category: "prep", done: false },
];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lifetimeSpend: number;
  lastVisit: string;
  noShows: number;
  tags: string[];
}

export const customers: Customer[] = [
  { id: "c1", name: "ณัฐพงษ์ สุขสมบูรณ์", phone: "081-234-5678", visits: 42, lifetimeSpend: 18600, lastVisit: "3 ก.ค.", noShows: 0, tags: ["VIP", "ขาประจำ"] },
  { id: "c2", name: "Praewa Thanawat", phone: "089-876-5432", visits: 18, lifetimeSpend: 7200, lastVisit: "1 ก.ค.", noShows: 1, tags: ["Open Play"] },
  { id: "c3", name: "สมชาย กิตติชัย", phone: "082-345-6789", visits: 9, lifetimeSpend: 3600, lastVisit: "28 มิ.ย.", noShows: 0, tags: ["ใหม่"] },
  { id: "c4", name: "Mint Wongsak", phone: "086-111-2233", visits: 31, lifetimeSpend: 12400, lastVisit: "20 มิ.ย.", noShows: 2, tags: ["เสี่ยงหาย"] },
  { id: "c5", name: "ธนวัฒน์ ลิ้มเจริญ", phone: "084-555-6677", visits: 5, lifetimeSpend: 2100, lastVisit: "15 มิ.ย.", noShows: 3, tags: ["เสี่ยงหาย"] },
];

export interface Staff {
  id: string;
  name: string;
  role: "super_admin" | "venue_manager" | "staff";
  venues: string;
  status: "active" | "inactive";
}

export const staff: Staff[] = [
  { id: "st1", name: "คุณอรุณ (Owner)", role: "super_admin", venues: "ทุกสาขา", status: "active" },
  { id: "st2", name: "คุณกานต์", role: "venue_manager", venues: "ลาดพร้าว", status: "active" },
  { id: "st3", name: "คุณบีม", role: "venue_manager", venues: "พระราม 9", status: "active" },
  { id: "st4", name: "คุณโอ๊ต", role: "staff", venues: "ลาดพร้าว", status: "active" },
  { id: "st5", name: "คุณฟ้า", role: "staff", venues: "ทองหล่อ", status: "inactive" },
];

export const roleLabels: Record<Staff["role"], string> = {
  super_admin: "ผู้ดูแลระบบ (ทุกสาขา)",
  venue_manager: "ผู้จัดการสาขา",
  staff: "พนักงานหน้างาน",
};
