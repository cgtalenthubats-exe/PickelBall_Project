import { createClient } from "@/lib/supabase/server";
import { requireActionRole } from "@/lib/authz";

// Branch scoping: venue_manager/staff only ever see their own venue's rows;
// super_admin sees everything (scope() returns null = no filter).
async function scopedVenueId(): Promise<string | null> {
  const ctx = await requireActionRole("staff");
  return ctx?.venueId ?? null;
}

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

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

// "pos2u" was an early external-hardware integration path that's since been
// dropped in favor of our own in-house POS (the "staff" channel below) — no
// current booking should ever carry that value, but the fallback keeps a
// stray old row from rendering as a blank string instead of something readable.
const CHANNEL_LABEL: Record<string, string> = {
  webapp: "เว็บลูกค้า",
  qr: "QR หน้าสนาม",
  staff: "พนักงาน (เคาน์เตอร์)",
};

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
  const scope = await scopedVenueId();
  let q = supabase
    .from("venues")
    .select(
      "id, slug, name, area, address, lat, lng, amenities, gallery, status, courts(id,name,purpose,status)",
    )
    .order("name");
  if (scope) q = q.eq("id", scope);
  const { data } = await q;
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
  const scope = await scopedVenueId();
  let q = supabase
    .from("equipment")
    .select(
      "id, name, venue_id, rental_price, stock_per_slot, is_included_free, status, venues(name)",
    )
    .order("name");
  // Branch staff still see global (all-venue) gear alongside their own.
  if (scope) q = q.or(`venue_id.eq.${scope},venue_id.is.null`);
  const { data } = await q;
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
  const scope = await scopedVenueId();
  let q = supabase
    .from("open_play_sessions")
    .select(
      "id, start_time, end_time, capacity, price_per_person, skill_level, status, venues(name), courts(name)",
    )
    .order("start_time");
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
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
  const scope = await scopedVenueId();
  let q = supabase
    .from("staff_tasks")
    .select("id, venue_id, title, scheduled_time, category, done, venues(name), courts(name)")
    .order("scheduled_time");
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
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
  channel: string;
  created_at: string;
  venues: { name: string } | null;
  courts: { name: string } | null;
  profiles: { name: string | null } | null;
};

const PAID = ["confirmed", "completed"];

async function fetchBookings() {
  const supabase = await createClient();
  const scope = await scopedVenueId();
  let q = supabase
    .from("bookings")
    .select(
      // bookings now has two FKs to profiles (user_id, checked_in_by) — the
      // embed must name the constraint or PostgREST rejects it as ambiguous.
      "id, user_id, venue_id, booking_type, start_time, end_time, status, total, channel, created_at, venues(name), courts(name), profiles!bookings_user_id_fkey(name)",
    )
    .order("created_at", { ascending: false });
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
  return (data ?? []) as unknown as BookingRow[];
}

// Buckets from `n` months ago through the current month.
function monthBuckets(n: number) {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: TH_MONTHS[d.getMonth()],
    });
  }
  return buckets;
}

// Buckets for an explicit "YYYY-MM" .. "YYYY-MM" range (inclusive), capped so
// a typo'd range can't generate thousands of empty columns.
function monthRangeBuckets(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let cur = new Date(fy, fm - 1, 1);
  const end = new Date(ty, tm - 1, 1);
  const buckets: { key: string; label: string }[] = [];
  while (cur <= end && buckets.length < 36) {
    buckets.push({
      key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: `${TH_MONTHS[cur.getMonth()]} ${cur.getFullYear()}`,
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return buckets;
}

function revenueByMonthBuckets(
  rows: BookingRow[],
  buckets: { key: string; label: string }[],
) {
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

export interface ActivityRow {
  id: string;
  rawId: string;
  kind: "booking" | "order";
  customer: string;
  venue: string;
  venueId: string;
  transactedAt: string;
  serviceLabel: string;
  typeLabel: string;
  status: string;
  amount: number;
  channel: string;
}

type OrderActivityDbRow = {
  id: string;
  user_id: string | null;
  venue_id: string;
  status: string;
  total: number;
  channel: string;
  orderer_name: string | null;
  created_at: string;
  venues: { name: string } | null;
  profiles: { name: string | null } | null;
  bookings: {
    start_time: string;
    end_time: string;
    courts: { name: string } | null;
  } | null;
};

async function fetchRecentOrders(limit: number): Promise<OrderActivityDbRow[]> {
  const supabase = await createClient();
  const scope = await scopedVenueId();
  let q = supabase
    .from("orders")
    .select(
      // orders now has three FKs to profiles (user_id, created_by,
      // confirmed_by) — must name the constraint or PostgREST rejects the
      // embed as ambiguous.
      "id, user_id, venue_id, status, total, channel, orderer_name, created_at, venues(name), profiles!orders_user_id_fkey(name), bookings(start_time, end_time, courts(name))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
  return (data ?? []) as unknown as OrderActivityDbRow[];
}

export async function getDashboard(opts?: { date?: string }) {
  const supabase = await createClient();
  const rows = await fetchBookings();
  // "Today" is actually "the selected day" — defaults to today (Bangkok) when
  // no ?date= is picked on the dashboard.
  const todayKey =
    opts?.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)
      ? opts.date
      : ymdBkk(new Date().toISOString());
  const paidToday = rows.filter(
    (r) => PAID.includes(r.status) && ymdBkk(r.start_time) === todayKey,
  );

  const scope = await scopedVenueId();
  let courtsQ = supabase.from("courts").select("id", { count: "exact", head: true });
  if (scope) courtsQ = courtsQ.eq("venue_id", scope);
  const [{ count: memberCount }, { count: courtCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    courtsQ,
  ]);

  const bookedHoursToday = paidToday.reduce(
    (s, r) => s + hoursBetween(r.start_time, r.end_time),
    0,
  );
  const capacityHours = (courtCount ?? 0) * 14; // 08:00–22:00
  const occupancy = capacityHours
    ? Math.round((bookedHoursToday / capacityHours) * 100)
    : 0;

  // POS sales (fail-soft: [] before migration-pos-orders.sql runs). Not
  // date-filtered here — reused below for the 6-month chart too.
  let ordersQ = supabase
    .from("orders")
    .select("total, status, paid_at, venue_id")
    .in("status", ["paid", "served"]);
  if (scope) ordersQ = ordersQ.eq("venue_id", scope);
  const { data: orderRows } = await ordersQ;
  const paidOrders = (orderRows ?? []) as { total: number; paid_at: string | null }[];
  const paidOrdersToday = paidOrders.filter(
    (o) => o.paid_at && ymdBkk(o.paid_at) === todayKey,
  );
  const posRevenueToday = paidOrdersToday.reduce((s, o) => s + Number(o.total), 0);
  const bookingRevenueToday = paidToday.reduce((s, r) => s + Number(r.total), 0);

  // Monthly revenue chart: booking revenue + POS revenue combined — with a
  // merchandise-only venue (no paid court bookings yet), the chart used to
  // show a flat zero for months where real money still came in from orders.
  const monthlyBuckets = monthBuckets(6);
  const bookingByMonth = revenueByMonthBuckets(rows, monthlyBuckets);
  const posByMonth = monthlyBuckets.map((b) => ({
    label: b.label,
    value: paidOrders
      .filter((o) => o.paid_at && monthKey(o.paid_at) === b.key)
      .reduce((s, o) => s + Number(o.total), 0),
  }));
  const combinedRevenueByMonth = monthlyBuckets.map((b, i) => ({
    label: b.label,
    value: bookingByMonth[i].value + posByMonth[i].value,
  }));

  // Recent activity feed — bookings and merchandise orders merged into one
  // timeline so "what happened today" isn't split across two tables. Each
  // row shows both when the TRANSACTION happened (created_at) and when the
  // court/service is actually for (start_time), since those can differ a lot
  // (e.g. booked this afternoon for a court tomorrow morning).
  const recentOrderRows = await fetchRecentOrders(20);
  const bookingActivity = rows.slice(0, 20).map((b) => ({
    row: {
      id: `BK-${b.id.slice(0, 4).toUpperCase()}`,
      rawId: b.id,
      kind: "booking" as const,
      customer: b.profiles?.name ?? "—",
      venue: b.venues?.name ?? "—",
      venueId: b.venue_id,
      transactedAt: dateTime(b.created_at),
      serviceLabel: `${date(b.start_time)} ${time(b.start_time)}–${time(b.end_time)}${b.courts?.name ? ` · คอร์ท ${b.courts.name}` : ""}`,
      typeLabel: b.booking_type === "open_play" ? "Open Play" : "จองเหมาคอร์ท",
      status: b.status,
      amount: Number(b.total),
      channel: CHANNEL_LABEL[b.channel] ?? b.channel,
    } satisfies ActivityRow,
    createdAt: b.created_at,
  }));
  const orderActivity = recentOrderRows.map((o) => ({
    row: {
      id: `OD-${o.id.slice(0, 4).toUpperCase()}`,
      rawId: o.id,
      kind: "order" as const,
      customer: o.profiles?.name ?? o.orderer_name ?? "ลูกค้า walk-in",
      venue: o.venues?.name ?? "—",
      venueId: o.venue_id,
      transactedAt: dateTime(o.created_at),
      serviceLabel: o.bookings
        ? `${date(o.bookings.start_time)} ${time(o.bookings.start_time)}–${time(o.bookings.end_time)}${o.bookings.courts?.name ? ` · คอร์ท ${o.bookings.courts.name}` : ""}`
        : "ซื้อหน้าเคาน์เตอร์ (ไม่ผูกคอร์ท)",
      typeLabel: "ออเดอร์สินค้า",
      status: o.status,
      amount: Number(o.total),
      channel: CHANNEL_LABEL[o.channel] ?? o.channel,
    } satisfies ActivityRow,
    createdAt: o.created_at,
  }));
  const recentActivity = [...bookingActivity, ...orderActivity]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8)
    .map((a) => a.row);

  return {
    selectedDate: todayKey,
    kpis: {
      revenueToday: bookingRevenueToday + posRevenueToday,
      bookingRevenueToday,
      posRevenueToday,
      ordersToday: paidOrdersToday.length,
      bookingsToday: paidToday.length,
      occupancy,
      activeMembers: memberCount ?? 0,
    },
    revenueByMonth: combinedRevenueByMonth,
    revenueByType: revenueByType(rows),
    recentActivity,
  };
}

export async function getReports(opts?: {
  venueId?: string;
  months?: number;
  from?: string; // "YYYY-MM", used together with `to` for a custom range
  to?: string;
}) {
  const all = await fetchBookings(); // already branch-scoped for non-super admins
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
  const bookingRefunds = rows
    .filter((r) => r.status === "refunded")
    .reduce((s, r) => s + Number(r.total), 0);

  // POS sales (Phase 3+): fail-soft before migration-pos-orders.sql runs.
  const supabase = await createClient();
  let ordersQ = supabase
    .from("orders")
    .select("venue_id, total, status, venues(name)")
    .in("status", ["paid", "served", "refunded"]);
  if (opts?.venueId) ordersQ = ordersQ.eq("venue_id", opts.venueId);
  const { data: orderRows } = await ordersQ;
  const orders = (orderRows ?? []) as unknown as {
    venue_id: string;
    total: number;
    status: string;
    venues: { name: string } | null;
  }[];
  const paidOrders = orders.filter((o) => o.status !== "refunded");
  const posRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  paidOrders.forEach((o) => {
    const k = o.venues?.name ?? "—";
    byVenueMap.set(k, (byVenueMap.get(k) ?? 0) + Number(o.total));
  });
  // Order refunds weren't counted before — accounting needs the full picture.
  const orderRefunds = orders
    .filter((o) => o.status === "refunded")
    .reduce((s, o) => s + Number(o.total), 0);
  const refunds = bookingRefunds + orderRefunds;

  const grandTotal = totalRevenue + posRevenue;
  // Prices are VAT-inclusive → VAT portion = total × 7/107 (for accounting).
  const vatAmount = Math.round(((grandTotal * 7) / 107) * 100) / 100;

  const buckets =
    opts?.from && opts?.to ? monthRangeBuckets(opts.from, opts.to) : monthBuckets(months);

  return {
    revenueByMonth: revenueByMonthBuckets(rows, buckets),
    revenueByType: revenueByType(rows),
    // Where the money comes from: court bookings vs POS merchandise.
    revenueByStream: [
      {
        label: "จอง/เช่าสนาม",
        value: grandTotal ? Math.round((totalRevenue / grandTotal) * 100) : 0,
        color: "#21463A",
      },
      {
        label: "ขายสินค้า (POS)",
        value: grandTotal ? Math.round((posRevenue / grandTotal) * 100) : 0,
        color: "#B08D57",
      },
    ],
    revenueByVenue: [...byVenueMap.entries()].map(([venue, value]) => ({ venue, value })),
    totalRevenue,
    posRevenue,
    grandTotal,
    vatAmount,
    totalBookings: paid.length,
    totalOrders: paidOrders.length,
    avgPerBooking: paid.length ? Math.round(totalRevenue / paid.length) : 0,
    refunds,
    bookingRefunds,
    orderRefunds,
  };
}

export interface RefundLogRow {
  id: string;
  type: "booking" | "order";
  refId: string;
  venue: string;
  customer: string;
  amount: number;
  note: string;
  by: string;
  at: string;
}

// Audit trail for accounting: every credit refund, which booking/order it
// came from, and which staff member processed it.
export async function getRefundLog(limit = 20): Promise<RefundLogRow[]> {
  const supabase = await createClient();
  const scope = await scopedVenueId();

  const { data: ledgerRows } = await supabase
    .from("credit_ledger")
    .select("id, change, reason, ref_id, note, created_at, user_id, created_by")
    .in("reason", ["refund_booking", "refund_order"])
    .order("created_at", { ascending: false })
    .limit(scope ? 200 : limit); // over-fetch when we still need to filter by venue in JS
  const rows = (ledgerRows ?? []) as {
    id: string;
    change: number;
    reason: string;
    ref_id: string | null;
    note: string | null;
    created_at: string;
    user_id: string;
    created_by: string | null;
  }[];
  if (rows.length === 0) return [];

  const bookingIds = rows.filter((r) => r.reason === "refund_booking" && r.ref_id).map((r) => r.ref_id as string);
  const orderIds = rows.filter((r) => r.reason === "refund_order" && r.ref_id).map((r) => r.ref_id as string);
  const peopleIds = [...new Set(rows.flatMap((r) => (r.created_by ? [r.user_id, r.created_by] : [r.user_id])))];

  type RefVenueRow = { id: string; venue_id: string; venues: { name: string } | null };
  const [{ data: bookingRows }, { data: orderRows }, { data: profileRows }] = await Promise.all([
    bookingIds.length
      ? supabase.from("bookings").select("id, venue_id, venues(name)").in("id", bookingIds)
      : Promise.resolve({ data: [] as RefVenueRow[] }),
    orderIds.length
      ? supabase.from("orders").select("id, venue_id, venues(name)").in("id", orderIds)
      : Promise.resolve({ data: [] as RefVenueRow[] }),
    supabase.from("profiles").select("id, name").in("id", peopleIds),
  ]);
  const venueById = new Map<string, { venueId: string; venueName: string }>();
  ((bookingRows ?? []) as unknown as RefVenueRow[]).forEach((b) =>
    venueById.set(b.id, { venueId: b.venue_id, venueName: b.venues?.name ?? "—" }),
  );
  ((orderRows ?? []) as unknown as RefVenueRow[]).forEach((o) =>
    venueById.set(o.id, { venueId: o.venue_id, venueName: o.venues?.name ?? "—" }),
  );
  const nameById = new Map((profileRows ?? []).map((p) => [p.id as string, p.name as string | null]));

  return rows
    .map((r) => {
      const v = r.ref_id ? venueById.get(r.ref_id) : undefined;
      return {
        id: r.id,
        type: (r.reason === "refund_booking" ? "booking" : "order") as "booking" | "order",
        refId: r.ref_id ?? "",
        venueId: v?.venueId ?? null,
        venue: v?.venueName ?? "—",
        customer: nameById.get(r.user_id) ?? "—",
        amount: Number(r.change),
        note: r.note ?? "",
        by: (r.created_by && nameById.get(r.created_by)) || "—",
        at: new Intl.DateTimeFormat("th-TH", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Bangkok",
        }).format(new Date(r.created_at)),
      };
    })
    .filter((r) => !scope || r.venueId === scope)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      type: r.type,
      refId: r.refId,
      venue: r.venue,
      customer: r.customer,
      amount: r.amount,
      note: r.note,
      by: r.by,
      at: r.at,
    }));
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

  // Branch-scoped viewers only see customers who have booked at their venue
  // (fetchBookings above is already scoped, so agg only has their customers).
  const scope = await scopedVenueId();
  return (profs ?? [])
    .filter((p) => !scope || agg.has(p.id))
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
  const scope = await scopedVenueId();
  let q = supabase
    .from("pricing_rules")
    .select("id, day_of_week, start_time, end_time, price_per_hour, label, venues(name), courts(name)")
    .order("price_per_hour");
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
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
  const scope = await scopedVenueId();
  let q = supabase
    .from("profiles")
    .select("id, name, email, role, active, managed_venue_id, venues(name)")
    .in("role", ["super_admin", "venue_manager", "staff"])
    .order("role");
  if (scope) q = q.eq("managed_venue_id", scope);
  const { data } = await q;
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
