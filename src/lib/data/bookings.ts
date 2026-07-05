import { createClient } from "@/lib/supabase/server";
import { bkkTime, bkkDateFull } from "@/lib/fmt";
import type { MyBooking, MyBookingStatus } from "@/lib/mock";

function mapStatus(s: string): MyBookingStatus {
  if (s === "confirmed") return "confirmed";
  if (s === "pending") return "pending";
  if (s === "cancelled" || s === "refunded") return "cancelled";
  return "completed"; // completed, no_show
}

type Row = {
  id: string;
  booking_type: "private" | "open_play";
  seats: number;
  start_time: string;
  end_time: string;
  status: string;
  total: number;
  venues: { slug: string; name: string } | null;
  courts: { name: string } | null;
};

export async function getMyBookings(): Promise<MyBooking[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, booking_type, seats, start_time, end_time, status, total, venues(slug,name), courts(name)",
    )
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });

  const now = Date.now();
  return ((data ?? []) as unknown as Row[]).map((b) => ({
    id: b.id.slice(0, 8).toUpperCase(),
    venueId: b.venues?.slug ?? "",
    venue: b.venues?.name ?? "",
    court: b.courts?.name ?? "",
    date: bkkDateFull(b.start_time),
    time: `${bkkTime(b.start_time)}–${bkkTime(b.end_time)}`,
    type: b.booking_type,
    status: mapStatus(b.status),
    amount: Number(b.total),
    seats: b.seats,
    upcoming:
      new Date(b.start_time).getTime() > now &&
      b.status !== "cancelled" &&
      b.status !== "refunded",
  }));
}
