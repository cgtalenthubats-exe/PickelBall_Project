import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkPosAuth } from "@/lib/pos-auth";

// "What's the current queue/availability at this venue right now" — for a
// front-desk system (POS2U or otherwise) to check before taking a walk-in
// or phone booking. Read-only: returns courts, today's (or a given date's)
// private bookings, and Open Play sessions with live seat counts, so the
// caller can compute its own view without duplicating our slot logic.
//
// GET /api/pos/availability?venueId=<uuid>&date=YYYY-MM-DD
// Headers: Authorization: Bearer <POS_API_KEY>
// (date defaults to today in Asia/Bangkok if omitted)
export async function GET(req: NextRequest) {
  const authError = checkPosAuth(req);
  if (authError) return authError;

  const venueId = req.nextUrl.searchParams.get("venueId");
  if (!venueId) {
    return NextResponse.json({ error: "missing_venueId" }, { status: 400 });
  }
  const date =
    req.nextUrl.searchParams.get("date") ??
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, slug, name, courts(id, name, purpose, status)")
    .eq("id", venueId)
    .single();
  if (venueError || !venue) {
    return NextResponse.json({ error: "venue_not_found" }, { status: 404 });
  }

  // Bangkok-local day boundaries, expressed as UTC instants for the query.
  const dayStart = `${date}T00:00:00+07:00`;
  const dayEnd = `${date}T23:59:59+07:00`;

  const [{ data: bookings }, { data: sessions }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, court_id, booking_type, start_time, end_time, status, seats")
      .eq("venue_id", venueId)
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .in("status", ["pending", "confirmed", "completed"]),
    supabase
      .from("open_play_sessions")
      .select("id, court_id, start_time, end_time, capacity, price_per_person, skill_level, status")
      .eq("venue_id", venueId)
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd),
  ]);

  // Open-play taken counts need a second query keyed on session id (the
  // first query above doesn't select open_play_session_id).
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const taken: Record<string, number> = {};
  const { data: openBookings } = sessionIds.length
    ? await supabase
        .from("bookings")
        .select("open_play_session_id, seats")
        .in("open_play_session_id", sessionIds)
        .in("status", ["pending", "confirmed", "completed"])
    : { data: [] as { open_play_session_id: string; seats: number }[] };
  (openBookings ?? []).forEach((b) => {
    const k = b.open_play_session_id as string;
    taken[k] = (taken[k] ?? 0) + (Number(b.seats) || 1);
  });

  return NextResponse.json({
    venue: { id: venue.id, slug: venue.slug, name: venue.name },
    date,
    courts: venue.courts ?? [],
    privateBookings: (bookings ?? [])
      .filter((b) => b.booking_type === "private")
      .map((b) => ({
        id: b.id,
        courtId: b.court_id,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
      })),
    openPlaySessions: (sessions ?? []).map((s) => ({
      id: s.id,
      courtId: s.court_id,
      startTime: s.start_time,
      endTime: s.end_time,
      capacity: s.capacity,
      taken: taken[s.id] ?? 0,
      pricePerPerson: Number(s.price_per_person),
      skillLevel: s.skill_level,
      status: s.status,
    })),
  });
}
