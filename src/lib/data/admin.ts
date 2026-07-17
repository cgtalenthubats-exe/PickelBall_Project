import { createClient } from "@/lib/supabase/server";

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const ymdBkk = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

// yyyy-mm bucket in Bangkok time
const monthKey = (iso: string) => ymdBkk(iso).slice(0, 7);
const hoursBetween = (a: string, b: string) =>
  Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000);

const time = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

const date = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

export interface DbCourt {
  id: string;
  name: string;
  purpose: string; // 'private' | 'open_play'
  status: string;
}

export interface DbVenue {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  amenities: string[];
  gallery: string[];
  status: string;
  courts: DbCourt[];
  courtCount: number;
}

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  amenities: string[] | null;
  gallery: string[] | null;
  status: string;
  courts: { id: string; name: string; purpose: string | null; status: string }[];
};

export async function getDbVenues(): Promise<DbVenue[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select(
      "id, slug, name, area, address, lat, lng, amenities, gallery, status, courts(id,name,purpose,status)",
    )
    .order("name");
  const rows = (data ?? []) as unknown as VenueRow[];
  return rows.map((v) => {
    const courts = (v.courts ?? [])
      .map((c) => ({
        id: c.id,
        name: c.name,
        purpose: c.purpose ?? "private",
        status: c.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: v.id,
      slug: v.slug,
      name: v.name,
      area: v.area,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      amenities: v.amenities ?? [],
      gallery: v.gallery ?? [],
      status: v.status,
      courts,
      courtCount: courts.length,
    };
  });
}

type EquipRow = {
  id: string;
  name: string;
  venue_id: string | null;
  rental_price: number;
  stock_per_slot: number;
  is_included_free: boolean;
  status: string;
  venues: { name: string } | null;
};

export async function getDbEquipment() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select(
      "id, name, venue_id, rental_price, stock_per_slot, is_included_free, status, venues(name)",
    )
    .order("name");
  const rows = (data ?? []) as unknown as EquipRow[];
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    venueId: e.venue_id,
    venueName: e.venues?.name ?? "ทุกสาขา",
    price: Number(e.rental_price),
    stockPerSlot: e.stock_per_slot,
    includedFree: e.is_included_free,
    status: e.status,
  }));
}

type SessionRow = {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price_per_person: number;
  skill_level: string | null;
  status: string;
  venues: { name: string } | null;
  courts: { name: string } | null;
};

export async function getDbSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_play_sessions")
    .select(
      "id, start_time, end_time, capacity, price_per_person, skill_level, status, venues(name), courts(name)",
    )
    .order("start_time");
  const rows = (data ?? []) as unknown as SessionRow[];
  const ids = rows.map((s) => s.id);
  if (ids.length === 0) return [];

  const [{ data: bookingRows }, { data: waitRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("open_play_session_id, seats")
      .in("open_play_session_id", ids)
      .in("status", ["pending", "confirmed", "completed"]),
    supabase
      .from("waitlist")
      .select("session_id")
      .in("session_id", ids)
      .eq("status", "waiting"),
  ]);

  const taken: Record<string, number> = {};
  (bookingRows ?? []).forEach((b) => {
    const k = b.open_play_session_id as string;
    taken[k] = (taken[k] ?? 0) + (Number(b.seats) || 1);
  });
  const waiting: Record<string, number> = {};
  (waitRows ?? []).forEach((w) => {
    const k = w.session_id as string;
    waiting[k] = (waiting[k] ?? 0) + 1;
  });

  return rows.map((s) => ({
    id: s.id,
    venueName: s.venues?.name ?? "",
    courtName: s.courts?.name ?? "",
    dateLabel: date(s.start_time),
    timeLabel: `${time(s.start_time)}–${time(s.end_time)}`,
    capacity: s.capacity,
    taken: taken[s.id] ?? 0,
    waitlistCount: waiting[s.id] ?? 0,
    price: Number(s.price_per_person),
    level: s.skill_level ?? "",
    status: s.status as "open" | "full" | "cancelled",
  }));
}

export async function getSessionWaitlist(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("waitlist")
    .select("id, created_at, profiles(name, phone)")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("created_at");
  return ((data ?? []) as unknown as {
    id: string;
    created_at: string;
    profiles: { name: string | null; phone: string | null } | null;
  }[]).map((w) => ({
    id: w.id,
    name: w.profiles?.name ?? "—",
    phone: w.profiles?.phone ?? "—",
    joinedAt: date(w.created_at),
  }));
}

type TaskRow = {
  id: string;
  venue_id: string;
  title: string;
  scheduled_time: string | null;
  category: string;
  done: boolean;
  venues: { name: string } | null;
  courts: { name: string } | null;
};

export async function getDbTasks() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_tasks")
    .select("id, venue_id, title, scheduled_time, category, done, venues(name), courts(name)")
    .order("scheduled_time");
  const rows = (data ?? []) as unknown as TaskRow[];
  return rows.map((t) => ({
    id: t.id,
    venueId: t.venue_id,
    venueName: t.venues?.name ?? "—",
    courtName: t.courts?.name ?? "",
    title: t.title,
    time: t.scheduled_time ?? "",
    category: (t.category as "cleaning" | "prep" | "check") ?? "cleaning",
    done: t.done,
  }));
}

// ============================================================
// Aggregations for dashboard / reports / customers / staff / pricing
// ============================================================

type BookingRow = {
  id: string;
  user_id: string;
  venue_id: string;
  booking_type: "private" | "open_play";
  start_time: string;
  end_time: string;
  status: string;
  total: number;
  venues: { name: string } | null;
  courts: { name: string } | null;
  profiles: { name: string | null } | null;
};

const PAID = ["confirmed", "completed"];

async function fetchBookings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, user_id, venue_id, booking_type, start_time, end_time, status, total, venues(name), courts(name), profiles(name)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as BookingRow[];
}

function lastNMonths(rows: BookingRow[], n: number) {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: TH_MONTHS[d.getMonth()],
    });
  }
  const paid = rows.filter((r) => PAID.includes(r.status));
  // Actual baht per month (amounts are small; K-rounding erased all detail).
  return buckets.map((b) => ({
    label: b.label,
    value: paid
      .filter((r) => monthKey(r.start_time) === b.key)
      .reduce((s, r) => s + Number(r.total), 0),
  }));
}

// Share of revenue as PERCENTAGES (the donut legend renders "{value}%").
function revenueByType(rows: BookingRow[]) {
  const paid = rows.filter((r) => PAID.includes(r.status));
  const priv = paid
    .filter((r) => r.booking_type === "private")
    .reduce((s, r) => s + Number(r.total), 0);
  const open = paid
    .filter((r) => r.booking_type === "open_play")
    .reduce((s, r) => s + Number(r.total), 0);
  const total = priv + open || 1;
  return [
    { label: "จองเหมาคอร์ท", value: Math.round((priv / total) * 100), color: "#B08D57" },
    { label: "Open Play", value: Math.round((open / total) * 100), color: "#21463A" },
  ];
}

function mapStatus(s: string): "confirmed" | "pending" | "completed" | "cancelled" | "no_show" {
  if (s === "refunded") return "cancelled";
  if (["confirmed", "pending", "completed", "cancelled", "no_show"].includes(s))
    return s as "confirmed";
  return "pending";
}

export async function getDashboard() {
  const supabase = await createClient();
  const rows = await fetchBookings();
  const todayKey = ymdBkk(new Date().toISOString());
  const paidToday = rows.filter(
    (r) => PAID.includes(r.status) && ymdBkk(r.start_time) === todayKey,
  );

  const [{ count: memberCount }, { count: courtCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("courts").select("id", { count: "exact", head: true }),
  ]);

  const bookedHoursToday = paidToday.reduce(
    (s, r) => s + hoursBetween(r.start_time, r.end_time),
    0,
  );
  const capacityHours = (courtCount ?? 0) * 14; // 08:00–22:00
  const occupancy = capacityHours
    ? Math.round((bookedHoursToday / capacityHours) * 100)
    : 0;

  return {
    kpis: {
      revenueToday: paidToday.reduce((s, r) => s + Number(r.total), 0),
      bookingsToday: paidToday.length,
      occupancy,
      activeMembers: memberCount ?? 0,
    },
    revenueByMonth: lastNMonths(rows, 6),
    revenueByType: revenueByType(rows),
    recentBookings: rows.slice(0, 6).map((b) => ({
      id: `BK-${b.id.slice(0, 4).toUpperCase()}`,
      rawId: b.id,
      customer: b.profiles?.name ?? "—",
      venue: b.venues?.name ?? "—",
      court: b.courts?.name ?? "—",
      date: date(b.start_time),
      time: `${time(b.start_time)}–${time(b.end_time)}`,
      type: b.booking_type,
      status: mapStatus(b.status),
      amount: Number(b.total),
    })),
  };
}

export async function getReports(opts?: { venueId?: string; months?: number }) {
  const all = await fetchBookings();
  const months = opts?.months ?? 6;
  const rows = opts?.venueId
    ? all.filter((r) => r.venue_id === opts.venueId)
    : all;

  const paid = rows.filter((r) => PAID.includes(r.status));
  const byVenueMap = new Map<string, number>();
  paid.forEach((r) => {
    const k = r.venues?.name ?? "—";
    byVenueMap.set(k, (byVenueMap.get(k) ?? 0) + Number(r.total));
  });
  const totalRevenue = paid.reduce((s, r) => s + Number(r.total), 0);
  const refunds = rows
    .filter((r) => r.status === "refunded")
    .reduce((s, r) => s + Number(r.total), 0);

  return {
    revenueByMonth: lastNMonths(rows, months),
    revenueByType: revenueByType(rows),
    revenueByVenue: [...byVenueMap.entries()].map(([venue, value]) => ({ venue, value })),
    totalRevenue,
    totalBookings: paid.length,
    avgPerBooking: paid.length ? Math.round(totalRevenue / paid.length) : 0,
    refunds,
  };
}

export async function getAdminCustomers() {
  const supabase = await createClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, name, phone, tags")
    .eq("role", "customer");
  const rows = await fetchBookings();

  type Agg = { visits: number; spend: number; last: string; noShows: number };
  const agg = new Map<string, Agg>();
  rows.forEach((b) => {
    const a = agg.get(b.user_id) ?? { visits: 0, spend: 0, last: "", noShows: 0 };
    if (PAID.includes(b.status)) {
      a.visits += 1;
      a.spend += Number(b.total);
      if (!a.last || b.start_time > a.last) a.last = b.start_time;
    }
    if (b.status === "no_show") a.noShows += 1;
    agg.set(b.user_id, a);
  });

  return (profs ?? [])
    .map((p) => {
      const a = agg.get(p.id) ?? { visits: 0, spend: 0, last: "", noShows: 0 };
      return {
        id: p.id,
        name: (p.name as string) ?? "—",
        phone: (p.phone as string) ?? "—",
        visits: a.visits,
        lifetimeSpend: a.spend,
        lastVisit: a.last ? date(a.last) : "—",
        noShows: a.noShows,
        tags: ((p.tags as string[]) ?? []) as string[],
      };
    })
    .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
}

type PricingRow = {
  id: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  price_per_hour: number;
  label: string | null;
  venues: { name: string } | null;
  courts: { name: string } | null;
};

export async function getPricingRules() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("id, day_of_week, start_time, end_time, price_per_hour, label, venues(name), courts(name)")
    .order("price_per_hour");
  const rows = (data ?? []) as unknown as PricingRow[];
  return rows.map((r) => ({
    id: r.id,
    venue: r.venues?.name ?? "—",
    court: r.courts?.name ?? "ทุกคอร์ท",
    days: r.day_of_week == null ? "ทุกวัน" : TH_DAYS[r.day_of_week],
    time:
      r.start_time && r.end_time
        ? `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`
        : "ทั้งวัน",
    price: Number(r.price_per_hour),
    label: (r.label === "peak" ? "peak" : "off_peak") as "peak" | "off_peak",
  }));
}

type StaffRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: "super_admin" | "venue_manager" | "staff";
  active: boolean | null;
  managed_venue_id: string | null;
  venues: { name: string } | null;
};

export async function getStaff() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, role, active, managed_venue_id, venues(name)")
    .in("role", ["super_admin", "venue_manager", "staff"])
    .order("role");
  const rows = (data ?? []) as unknown as StaffRow[];
  return rows.map((s) => ({
    id: s.id,
    name: s.name ?? "—",
    email: s.email ?? "—",
    role: s.role,
    managedVenueId: s.managed_venue_id,
    managedVenueName:
      s.venues?.name ?? (s.role === "super_admin" ? "ทุกสาขา" : "—"),
    active: s.active ?? true,
  }));
}
