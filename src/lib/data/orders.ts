import { createClient } from "@/lib/supabase/server";
import { requireActionRole } from "@/lib/authz";

const bkkTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

export interface QueueOrder {
  id: string;
  venueId: string;
  venueName: string;
  courtName: string;
  ordererName: string;
  status: string;
  total: number;
  note: string;
  at: string;
  items: { name: string; qty: number; price: number }[];
}

// Orders needing attention (unpaid + paid-but-unserved) plus today's served
// history, scoped to the caller's branch.
export async function getOrdersQueue(): Promise<QueueOrder[]> {
  const supabase = await createClient();
  const ctx = await requireActionRole("staff");
  const scope = ctx?.venueId ?? null;

  const todayStartBkk = new Date();
  todayStartBkk.setUTCHours(-7, 0, 0, 0); // 00:00 Bangkok = 17:00 UTC previous day

  let q = supabase
    .from("orders")
    .select(
      "id, venue_id, orderer_name, status, total, note, created_at, venues(name), bookings(courts(name)), order_items(name_at_order, qty, price_at_order)",
    )
    .or(
      `status.in.(pending_payment,paid),created_at.gte.${todayStartBkk.toISOString()}`,
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(60);
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;

  return ((data ?? []) as unknown as {
    id: string;
    venue_id: string;
    orderer_name: string | null;
    status: string;
    total: number;
    note: string | null;
    created_at: string;
    venues: { name: string } | null;
    bookings: { courts: { name: string } | null } | null;
    order_items: { name_at_order: string; qty: number; price_at_order: number }[];
  }[]).map((o) => ({
    id: o.id,
    venueId: o.venue_id,
    venueName: o.venues?.name ?? "—",
    courtName: o.bookings?.courts?.name ?? "—",
    ordererName: o.orderer_name ?? "ไม่ระบุชื่อ",
    status: o.status,
    total: Number(o.total),
    note: o.note ?? "",
    at: bkkTime(o.created_at),
    items: (o.order_items ?? []).map((i) => ({
      name: i.name_at_order,
      qty: i.qty,
      price: Number(i.price_at_order),
    })),
  }));
}

// Today's live bookings of the branch — for printing/sharing the order QR.
export async function getTodayBookingsForQr() {
  const supabase = await createClient();
  const ctx = await requireActionRole("staff");
  const scope = ctx?.venueId ?? null;

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setUTCHours(-7, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  let q = supabase
    .from("bookings")
    .select(
      "id, order_token, start_time, end_time, status, venues(name), courts(name), profiles(name)",
    )
    .in("status", ["confirmed", "completed"])
    .gte("start_time", dayStart.toISOString())
    .lt("start_time", dayEnd.toISOString())
    .order("start_time");
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;

  return ((data ?? []) as unknown as {
    id: string;
    order_token: string | null;
    start_time: string;
    end_time: string;
    venues: { name: string } | null;
    courts: { name: string } | null;
    profiles: { name: string | null } | null;
  }[])
    .filter((b) => b.order_token)
    .map((b) => ({
      id: b.id,
      token: b.order_token as string,
      venueName: b.venues?.name ?? "",
      courtName: b.courts?.name ?? "",
      customer: b.profiles?.name ?? "—",
      time: `${bkkTime(b.start_time)}–${bkkTime(b.end_time)}`,
    }));
}
