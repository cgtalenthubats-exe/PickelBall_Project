import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { recordCreditSpend } from "@/lib/credit";

// The QR token is the permission: no login needed to order, but the token
// only works while its booking is live (from confirmation until 1 hour after
// the session ends — people often want one last drink right after playing).
const GRACE_MS = 60 * 60 * 1000;

export interface TokenBooking {
  bookingId: string;
  venueId: string;
  venueName: string;
  courtName: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export async function resolveOrderToken(
  token: string,
): Promise<TokenBooking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, venue_id, status, start_time, end_time, venues(name), courts(name)")
    .eq("order_token", token)
    .single();
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    venue_id: string;
    status: string;
    start_time: string;
    end_time: string;
    venues: { name: string } | null;
    courts: { name: string } | null;
  };
  const live =
    ["confirmed", "completed"].includes(row.status) &&
    Date.now() < new Date(row.end_time).getTime() + GRACE_MS;
  return {
    bookingId: row.id,
    venueId: row.venue_id,
    venueName: row.venues?.name ?? "",
    courtName: row.courts?.name ?? "",
    startTime: row.start_time,
    endTime: row.end_time,
    active: live,
  };
}

// Marks an order paid + deducts stock, exactly once (guarded by the status
// transition). Used by both the Stripe webhook and the staff "รับชำระแล้ว"
// fallback so the two paths can't diverge.
export async function finalizeOrderPaid(
  supabase: SupabaseClient,
  orderId: string,
): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, venue_id, total, user_id, credit_applied")
    .eq("id", orderId)
    .single();
  if (!order) return "order_not_found";
  if (order.status !== "pending_payment") return null; // already handled — idempotent

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending_payment");
  if (updateError) return updateError.message;

  // Deduct stock: one ledger row per line item.
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, qty")
    .eq("order_id", orderId);
  if (items?.length) {
    await supabase.from("stock_ledger").insert(
      items.map((i) => ({
        product_id: i.product_id,
        venue_id: order.venue_id,
        change: -i.qty,
        reason: "sale",
        ref_id: orderId,
      })),
    );
  }

  // Ledger any credit that was reserved for this order (idempotent).
  const creditApplied = Number(order.credit_applied ?? 0);
  if (creditApplied > 0 && order.user_id) {
    await recordCreditSpend(supabase, {
      userId: order.user_id as string,
      amount: creditApplied,
      reason: "spend_order",
      refId: orderId,
    });
  }

  // Note: order revenue is read from orders.paid_at/total directly — the
  // payments table stays booking-scoped.
  return null;
}
