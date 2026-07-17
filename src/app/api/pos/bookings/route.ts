import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkPosAuth } from "@/lib/pos-auth";
import { resolveWalkInCustomer } from "@/lib/pos-customer";

// Creates a booking on behalf of a walk-in / phone-in customer at the
// front desk. POS2U tells us the outcome up front via `status`:
//   - "reserved" — customer wants the slot held, pays later (e.g. an
//     event booked in advance, paid on the day)
//   - "paid"     — customer already paid at the POS2U terminal
// We don't evaluate or delay on either case — we just record what we're
// told, same as the private/open-play booking creation the webapp already
// does. Pricing is caller-supplied for private courts (the webapp itself
// doesn't have a server-side pricing engine yet — see docs/pos2u-api-doc.md).
//
// POST /api/pos/bookings
// Headers: Authorization: Bearer <POS_API_KEY>
export async function POST(req: NextRequest) {
  const authError = checkPosAuth(req);
  if (authError) return authError;

  let body: {
    venueId?: string;
    type?: "private" | "open_play";
    courtId?: string;
    date?: string;
    start?: string;
    end?: string;
    price?: number;
    sessionId?: string;
    seats?: number;
    customerPhone?: string;
    customerName?: string;
    status?: "reserved" | "paid";
    transactionRef?: string;
    method?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { venueId, type, customerPhone, status } = body;
  if (!venueId || !type || !customerPhone || !status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (status !== "reserved" && status !== "paid") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (status === "paid" && !body.transactionRef) {
    return NextResponse.json(
      { error: "status_paid_requires_transactionRef" },
      { status: 422 },
    );
  }

  const supabase = createServiceClient();

  let courtId: string;
  let sessionId: string | null = null;
  let startTime: string;
  let endTime: string;
  let seats = 1;
  let total: number;
  let lineItemLabel: string;

  if (type === "open_play") {
    if (!body.sessionId) {
      return NextResponse.json({ error: "missing_sessionId" }, { status: 400 });
    }
    seats = Math.max(1, Number(body.seats ?? 1));
    const { data: session, error: sessionError } = await supabase
      .from("open_play_sessions")
      .select("court_id, venue_id, start_time, end_time, price_per_person")
      .eq("id", body.sessionId)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }
    if (session.venue_id !== venueId) {
      return NextResponse.json({ error: "session_venue_mismatch" }, { status: 400 });
    }
    sessionId = body.sessionId;
    courtId = session.court_id as string;
    startTime = session.start_time as string;
    endTime = session.end_time as string;
    total = Number(session.price_per_person) * seats;
    lineItemLabel = `ค่าเข้ารอบ × ${seats}`;
  } else if (type === "private") {
    if (!body.courtId || !body.date || !body.start || !body.end) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    courtId = body.courtId;
    startTime = `${body.date}T${body.start}:00+07:00`;
    endTime = `${body.date}T${body.end}:00+07:00`;
    total = Number(body.price ?? 0);
    lineItemLabel = "ค่าสนาม";
  } else {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  let userId: string;
  try {
    userId = await resolveWalkInCustomer(customerPhone, body.customerName);
  } catch (e) {
    return NextResponse.json(
      { error: "customer_resolve_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      venue_id: venueId,
      court_id: courtId,
      booking_type: type,
      open_play_session_id: sessionId,
      seats,
      start_time: startTime,
      end_time: endTime,
      status: status === "paid" ? "confirmed" : "pending",
      channel: "pos2u",
      price_line_items: [{ label: lineItemLabel, amount: total }],
      subtotal: total,
      total,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("exclu")) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
    if (error.message.includes("open_play_session_full")) {
      return NextResponse.json({ error: "session_full" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "paid") {
    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: booking.id,
      method: body.method ?? "pos_onsite",
      source: "pos2u",
      amount: total,
      status: "succeeded",
      paid_at: new Date().toISOString(),
    });
    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { ok: true, bookingId: booking.id, status: status === "paid" ? "confirmed" : "pending" },
    { status: 201 },
  );
}
