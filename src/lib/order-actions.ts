"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireActionRole, canAccessVenue, FORBIDDEN } from "@/lib/authz";
import { paymentsEnabled, createCheckoutSession } from "@/lib/payments";
import { resolveOrderToken, finalizeOrderPaid } from "@/lib/pos-order";
import { getCreditBalance } from "@/lib/credit";

export type OrderActionState = { error?: string } | null;

// Customer (or friend with the QR) places an order. No login required — the
// booking token is the permission. Pay-now policy: with Stripe configured we
// redirect straight to checkout; without it the order waits as
// pending_payment and staff confirm the payment at the counter.
export async function placeOrder(
  _prev: OrderActionState,
  fd: FormData,
): Promise<OrderActionState> {
  const token = String(fd.get("token") ?? "");
  const ordererName = String(fd.get("ordererName") ?? "").trim();
  let items: { id: string; qty: number }[];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    return { error: "รายการสั่งซื้อไม่ถูกต้อง" };
  }
  items = items.filter((i) => Number.isInteger(i.qty) && i.qty > 0);
  if (items.length === 0) return { error: "ยังไม่ได้เลือกสินค้า" };

  const booking = await resolveOrderToken(token);
  if (!booking) return { error: "ลิงก์สั่งซื้อไม่ถูกต้อง" };
  if (!booking.active)
    return { error: "ลิงก์นี้หมดอายุแล้ว (ใช้ได้เฉพาะช่วงเวลาการจอง)" };

  const supabase = createServiceClient();

  // Server-side price lookup — never trust prices from the client.
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, active, venue_id")
    .in("id", items.map((i) => i.id));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  for (const item of items) {
    const p = byId.get(item.id);
    if (!p || !p.active || p.venue_id !== booking.venueId)
      return { error: "มีสินค้าที่ปิดขายแล้ว กรุณารีเฟรชเมนู" };
  }
  const total = items.reduce(
    (s, i) => s + Number(byId.get(i.id)!.price) * i.qty,
    0,
  );

  // Logged-in orderer (optional) — attributes the order in CRM and lets
  // their wallet credit auto-apply. Friends without an account just pay full.
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const creditBalance =
    user && paymentsEnabled() ? await getCreditBalance(supabase, user.id) : 0;
  const creditApplied = Math.min(creditBalance, total);
  const charge = total - creditApplied;

  const insertRow: Record<string, unknown> = {
    venue_id: booking.venueId,
    booking_id: booking.bookingId,
    user_id: user?.id ?? null,
    orderer_name: ordererName || null,
    status: "pending_payment",
    total,
    note: String(fd.get("note") ?? "") || null,
    channel: "qr",
  };
  if (creditApplied > 0) insertRow.credit_applied = creditApplied;

  const { data: order, error } = await supabase
    .from("orders")
    .insert(insertRow)
    .select("id")
    .single();
  if (error || !order) return { error: error?.message ?? "สั่งซื้อไม่สำเร็จ" };

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      product_id: i.id,
      name_at_order: byId.get(i.id)!.name,
      price_at_order: Number(byId.get(i.id)!.price),
      qty: i.qty,
    })),
  );
  if (itemsError) return { error: itemsError.message };

  const locale = await getLocale();
  if (paymentsEnabled() && charge === 0 && total > 0) {
    // Wallet credit covers the whole order — finalize right away.
    const err = await finalizeOrderPaid(supabase, order.id);
    if (err) return { error: err };
    redirect(`/${locale}/order/${token}?done=1&oid=${order.id}`);
  }
  if (paymentsEnabled() && charge > 0) {
    const session = await createCheckoutSession({
      kind: "order",
      refId: order.id,
      amount: charge,
      description: `สั่งของหน้าสนาม — ${booking.venueName}`,
      locale,
      successPath: `/${locale}/order/${token}?done=1&oid=${order.id}`,
      cancelPath: `/${locale}/order/${token}?cancelled=1`,
    });
    if ("error" in session) {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      return { error: session.error };
    }
    redirect(session.url);
  }

  // Beta (no Stripe keys): order waits for staff to confirm payment at the
  // counter — no postpaid, just a different payment rail.
  redirect(`/${locale}/order/${token}?done=1&counter=1&oid=${order.id}`);
}

// ---------- staff queue actions ----------

export async function staffMarkOrderPaid(
  _prev: OrderActionState,
  fd: FormData,
): Promise<OrderActionState> {
  const id = String(fd.get("id") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  const ctx = await requireActionRole("staff");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };
  const err = await finalizeOrderPaid(createServiceClient(), id);
  if (err) return { error: err };
  redirect(`/${await getLocale()}/admin/orders`);
}

export async function staffMarkOrderServed(
  _prev: OrderActionState,
  fd: FormData,
): Promise<OrderActionState> {
  const id = String(fd.get("id") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  const ctx = await requireActionRole("staff");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "served", served_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "paid");
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/orders`);
}

export async function staffCancelOrder(
  _prev: OrderActionState,
  fd: FormData,
): Promise<OrderActionState> {
  const id = String(fd.get("id") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  const ctx = await requireActionRole("staff");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };
  const supabase = await createClient();
  // Only unpaid orders cancel here; paid ones must go through refund (Phase 4).
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending_payment");
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/orders`);
}
