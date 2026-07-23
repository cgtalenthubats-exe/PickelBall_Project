import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyStripeSignature } from "@/lib/payments";
import { finalizeOrderPaid } from "@/lib/pos-order";

// Stripe calls this after checkout. Signature-verified with the endpoint's
// whsec_ secret — unlike the staff-portal routes there is no Bearer key here;
// the HMAC on the raw body IS the authentication.
//
// Configure in Stripe dashboard: endpoint {site}/api/payments/stripe-webhook,
// event: checkout.session.completed
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyStripeSignature(rawBody, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: {
      object: {
        id: string;
        amount_total: number | null;
        payment_intent: string | null;
        metadata?: { kind?: string; refId?: string };
      };
    };
  };

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const { kind, refId } = session.metadata ?? {};
  if (!refId) return NextResponse.json({ error: "missing_refId" }, { status: 400 });

  const supabase = createServiceClient();

  if (kind === "order") {
    // POS order — same finalize path as the staff counter-confirm fallback:
    // marks paid once and deducts stock.
    const err = await finalizeOrderPaid(supabase, refId);
    if (err) return NextResponse.json({ error: err }, { status: 500 });
    return NextResponse.json({ received: true });
  }

  // Default: booking payment.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total")
    .eq("id", refId)
    .single();
  if (!booking) return NextResponse.json({ error: "booking_not_found" }, { status: 404 });

  // Idempotent: Stripe retries deliveries; a second event is a no-op.
  if (booking.status === "pending") {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", hold_expires_at: null })
      .eq("id", refId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("payments").insert({
      booking_id: refId,
      stripe_payment_intent_id: session.payment_intent,
      method: "stripe_checkout",
      source: "stripe",
      amount: (session.amount_total ?? 0) / 100,
      status: "succeeded",
      paid_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
