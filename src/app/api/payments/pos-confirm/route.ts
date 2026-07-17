import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Generic "external POS confirmed this payment" webhook. Any in-store
// terminal (POS2U or otherwise) that can call an arbitrary URL with a shared
// secret can use this to move a booking from pending -> confirmed once the
// customer has paid at the counter. Distinct from the future Stripe webhook,
// which will verify Stripe's own request signature instead of a static key.
//
// POST /api/payments/pos-confirm
// Headers: Authorization: Bearer <POS_CONFIRM_API_KEY>
// Body:    { bookingId: string, amount: number, transactionRef: string, method?: string }
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.replace(/^Bearer\s+/i, "");
  if (!key || key !== process.env.POS_CONFIRM_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    bookingId?: string;
    amount?: number;
    transactionRef?: string;
    method?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { bookingId, amount, transactionRef, method } = body;
  if (!bookingId || typeof amount !== "number" || !transactionRef) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, total")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: "booking_not_pending", status: booking.status },
      { status: 409 },
    );
  }
  if (Number(booking.total) !== amount) {
    return NextResponse.json(
      { error: "amount_mismatch", expected: Number(booking.total), received: amount },
      { status: 422 },
    );
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    booking_id: bookingId,
    method: method ?? "pos_onsite",
    amount,
    status: "succeeded",
    paid_at: new Date().toISOString(),
  });
  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bookingId, status: "confirmed" });
}
