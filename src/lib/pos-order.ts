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

// Same token as ordering, reused for arrival check-in — one QR the customer
// shows at the counter covers both "I'm here" and "let me order a drink."
// Live window opens earlier (people arrive before their slot starts).
const CHECKIN_LEAD_MS = 60 * 60 * 1000;

export interface CheckinBooking {
  bookingId: string;
  venueId: string;
  venueName: string;
  courtName: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  checkedInAt: string | null;
  active: boolean;
}

export async function resolveCheckinToken(
  token: string,
): Promise<CheckinBooking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, venue_id, status, start_time, end_time, checked_in_at, venues(name), courts(name), profiles(name, phone)",
    )
    .eq("order_token", token)
    .single();
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    venue_id: string;
    status: string;
    start_time: string;
    end_time: string;
    checked_in_at: string | null;
    venues: { name: string } | null;
    courts: { name: string } | null;
    profiles: { name: string | null; phone: string | null } | null;
  };
  const live =
    ["confirmed", "completed"].includes(row.status) &&
    Date.now() > new Date(row.start_time).getTime() - CHECKIN_LEAD_MS &&
    Date.now() < new Date(row.end_time).getTime() + GRACE_MS;
  return {
    bookingId: row.id,
    venueId: row.venue_id,
    venueName: row.venues?.name ?? "",
    courtName: row.courts?.name ?? "",
    customerName: row.profiles?.name ?? "ลูกค้า",
    customerPhone: row.profiles?.phone ?? "—",
    startTime: row.start_time,
    endTime: row.end_time,
    checkedInAt: row.checked_in_at,
    active: live,
  };
}

// Marks an order paid + deducts stock, exactly once (guarded by the status
// transition). Used by both the Stripe webhook and the staff "รับชำระแล้ว"
// fallback so the two paths can't diverge.
export async function finalizeOrderPaid(
  supabase: SupabaseClient,
  orderId: string,
  confirmedBy?: string,
): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, venue_id, total, user_id, credit_applied")
    .eq("id", orderId)
    .single();
  if (!order) return "order_not_found";
  if (order.status !== "pending_payment") return null; // already handled — idempotent

  const patch: Record<string, unknown> = { status: "paid", paid_at: new Date().toISOString() };
  // Only the manual counter-confirm path has a staff operator to attribute —
  // Stripe webhook / credit-covered auto-finalize leave this null.
  if (confirmedBy) patch.confirmed_by = confirmedBy;
  const { error: updateError } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("status", "pending_payment");
  if (updateError) return updateError.message;

  // Stock was already deducted as 'reserved' when the cart was placed — just
  // promote those rows to 'sale' (balance unchanged, no double deduction).
  await supabase
    .from("stock_ledger")
    .update({ reason: "sale" })
    .eq("ref_id", orderId)
    .eq("reason", "reserved");

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

// Returns a picked-but-unpaid order's reserved stock to the pool. Idempotent:
// only rows still marked 'reserved' are acted on, then voided so a second
// call (cron + manual cancel racing) can't release twice.
export async function releaseOrderStock(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: reserved } = await supabase
    .from("stock_ledger")
    .select("id, product_id, venue_id, change")
    .eq("ref_id", orderId)
    .eq("reason", "reserved");
  if (!reserved?.length) return;

  await supabase.from("stock_ledger").insert(
    reserved.map((r) => ({
      product_id: r.product_id,
      venue_id: r.venue_id,
      change: -r.change, // reserved rows are negative → this gives stock back
      reason: "reserve_release",
      ref_id: orderId,
    })),
  );
  await supabase
    .from("stock_ledger")
    .update({ reason: "reserved_void" })
    .in("id", reserved.map((r) => r.id));
}
