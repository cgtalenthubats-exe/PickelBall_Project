import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkPosAuth } from "@/lib/pos-auth";

// Cancels a booking that hasn't been paid yet — the customer changed their
// mind, or staff released the hold manually. Only "pending" bookings can be
// cancelled here; an already-paid booking must go through
// /api/payments/pos-refund instead, since money actually moved.
//
// PATCH /api/pos/bookings/:id
// Headers: Authorization: Bearer <POS_API_KEY>
// Body:    { reason?: string }
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/pos/bookings/[id]">,
) {
  const authError = checkPosAuth(req);
  if (authError) return authError;

  const { id } = await ctx.params;
  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", id)
    .single();
  if (fetchError || !booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: "booking_not_cancellable", status: booking.status },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bookingId: id, status: "cancelled" });
}
