import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkPosAuth } from "@/lib/pos-auth";

// POS2U (or staff, after reversing the charge at the terminal) tells us a
// paid booking was refunded. We don't process the refund ourselves — the
// money already moved back at the POS2U/2C2P side; we just mirror the
// outcome onto the booking + payment rows.
//
// PATCH /api/payments/pos-refund
// Headers: Authorization: Bearer <POS_API_KEY>
// Body:    { bookingId: string, reason?: string }
export async function PATCH(req: NextRequest) {
  const authError = checkPosAuth(req);
  if (authError) return authError;

  let body: { bookingId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { bookingId } = body;
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }
  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "booking_not_refundable", status: booking.status },
      { status: 409 },
    );
  }

  const { data: payment, error: paymentFetchError } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "succeeded")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentFetchError || !payment) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ status: "refunded" })
    .eq("id", bookingId);
  if (bookingUpdateError) {
    return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 });
  }

  const { error: paymentUpdateError } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id);
  if (paymentUpdateError) {
    return NextResponse.json({ error: paymentUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bookingId, status: "refunded" });
}
