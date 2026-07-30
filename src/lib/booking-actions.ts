"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { paymentsEnabled, createCheckoutSession } from "@/lib/payments";
import { getCreditBalance, recordCreditSpend } from "@/lib/credit";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyWaitlistForSession } from "@/lib/notify";

export type BookingState = { error?: string } | null;
export type WaitlistState = { error?: string; joined?: boolean } | null;

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "ไม่พบรอบที่เลือก" };

  const { error } = await supabase
    .from("waitlist")
    .insert({ session_id: sessionId, user_id: user.id });

  if (error) {
    return {
      error: /duplicate|unique/i.test(error.message)
        ? "คุณอยู่ในคิวของรอบนี้อยู่แล้ว"
        : error.message,
    };
  }
  return { joined: true };
}

interface AddonInput {
  id: string;
  qty: number;
  price: number;
  name: string;
}

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const type = String(formData.get("type")) as "private" | "open_play";
  const venueId = String(formData.get("venueId"));
  const seats = Math.max(1, Number(formData.get("seats") ?? 1));
  const addons: AddonInput[] = JSON.parse(
    String(formData.get("addons") ?? "[]"),
  );

  let courtId: string;
  let sessionId: string | null = null;
  let startTime: string;
  let endTime: string;
  let base: number;

  if (type === "open_play") {
    sessionId = String(formData.get("sessionId"));
    const { data: s } = await supabase
      .from("open_play_sessions")
      .select("court_id, start_time, end_time, price_per_person")
      .eq("id", sessionId)
      .single();
    if (!s) return { error: "ไม่พบรอบที่เลือก" };
    courtId = s.court_id as string;
    startTime = s.start_time as string;
    endTime = s.end_time as string;
    base = Number(s.price_per_person) * seats;
  } else {
    courtId = String(formData.get("courtId"));
    const date = String(formData.get("date"));
    startTime = `${date}T${String(formData.get("start"))}:00+07:00`;
    endTime = `${date}T${String(formData.get("end"))}:00+07:00`;
    base = Number(formData.get("price") ?? 0);
  }

  const paid = addons.filter((a) => a.qty > 0);
  const addonTotal = paid.reduce((sum, a) => sum + a.qty * a.price, 0);
  const total = base + addonTotal;

  const lineItems = [
    {
      label: type === "open_play" ? `ค่าเข้ารอบ × ${seats}` : "ค่าสนาม",
      amount: base,
    },
    ...paid.map((a) => ({ label: `${a.name} × ${a.qty}`, amount: a.qty * a.price })),
  ];

  // With Stripe configured: create as pending + 15-minute hold, then send the
  // customer to checkout; the webhook flips it to confirmed and the cron
  // releases unpaid holds. Without keys (beta), keep auto-confirming so the
  // app still works before payment is set up.
  // Wallet credit (from past refunds) auto-applies to the charge; it's only
  // ledgered once payment actually completes, so abandoning checkout never
  // burns credit.
  // Customer can opt out of auto-applying their wallet credit (e.g. saving it
  // for a future visit) via the checkbox on the checkout screen.
  const wantsCredit = String(formData.get("useCredit") ?? "1") === "1";
  const creditBalance =
    paymentsEnabled() && wantsCredit ? await getCreditBalance(supabase, user.id) : 0;
  const creditApplied = Math.min(creditBalance, total);
  const charge = total - creditApplied;
  const payNow = paymentsEnabled() && charge > 0;
  const paidByCreditOnly = paymentsEnabled() && total > 0 && charge === 0;

  if (creditApplied > 0) {
    lineItems.push({ label: "ใช้เครดิตคงเหลือ", amount: -creditApplied });
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    venue_id: venueId,
    court_id: courtId,
    booking_type: type,
    open_play_session_id: sessionId,
    seats,
    start_time: startTime,
    end_time: endTime,
    status: payNow ? "pending" : "confirmed",
    hold_expires_at: payNow
      ? new Date(Date.now() + 15 * 60_000).toISOString()
      : null,
    price_line_items: lineItems,
    subtotal: total,
    total,
  };
  // Column exists only after migration-credit.sql — omit when unused so the
  // insert keeps working pre-migration (balance is 0 then anyway).
  if (creditApplied > 0) insertRow.credit_applied = creditApplied;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("exclu")) {
      return { error: "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น" };
    }
    if (error.message.includes("open_play_session_full")) {
      return { error: "รอบนี้เต็มแล้ว กรุณาเลือกรอบอื่นหรือเข้าคิว" };
    }
    return { error: error.message };
  }

  if (paid.length) {
    await supabase.from("booking_addons").insert(
      paid.map((a) => ({
        booking_id: booking.id,
        equipment_id: a.id,
        quantity: a.qty,
        price_at_booking: a.price,
      })),
    );
  }

  if (paidByCreditOnly) {
    // Credit covers everything — no gateway round-trip needed.
    const service = createServiceClient();
    await recordCreditSpend(service, {
      userId: user.id,
      amount: creditApplied,
      reason: "spend_booking",
      refId: booking.id,
    });
    await service.from("payments").insert({
      booking_id: booking.id,
      method: "credit",
      amount: total,
      status: "succeeded",
      paid_at: new Date().toISOString(),
    });
    redirect(`/${locale}/bookings?paid=1`);
  }

  if (payNow) {
    const session = await createCheckoutSession({
      kind: "booking",
      refId: booking.id,
      amount: charge,
      description:
        type === "open_play" ? `Open Play × ${seats}` : "จองคอร์ทพิคเคิลบอล",
      locale,
      successPath: `/${locale}/bookings?paid=1`,
      cancelPath: `/${locale}/bookings?pay=cancelled`,
    });
    if ("error" in session) {
      // Couldn't reach Stripe — release the hold instead of stranding it.
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
      return { error: session.error };
    }
    redirect(session.url);
  }

  redirect(`/${locale}/bookings`);
}

// Customer self-service cancel. Unpaid holds just release; paid bookings
// refund in full as wallet credit (policy: no cash/card refund path exists —
// same rule the staff-side refund action follows). Session client only
// verifies identity/ownership; the actual write goes through the service
// client since customers have no RLS write access to bookings.status.
export async function cancelMyBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect(`/${locale}/login`);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ไม่พบการจอง" };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total, user_id, booking_type, open_play_session_id, start_time")
    .eq("id", id)
    .single();
  if (!booking || booking.user_id !== user.id) return { error: "ไม่พบการจอง" };
  if (!["pending", "confirmed", "completed"].includes(booking.status))
    return { error: "รายการนี้ยกเลิกไม่ได้แล้ว" };
  if (new Date(booking.start_time).getTime() <= Date.now())
    return { error: "ยกเลิกไม่ได้ — ถึงเวลาใช้สนามแล้ว" };

  const wasPaid = ["confirmed", "completed"].includes(booking.status);
  const service = createServiceClient();
  const { error } = await service
    .from("bookings")
    .update({ status: wasPaid ? "refunded" : "cancelled" })
    .eq("id", id);
  if (error) return { error: error.message };

  if (wasPaid) {
    await service
      .from("payments")
      .update({ status: "refunded" })
      .eq("booking_id", id)
      .eq("status", "succeeded");
    const { error: creditError } = await service.from("credit_ledger").insert({
      user_id: user.id,
      change: Number(booking.total),
      reason: "refund_booking",
      ref_id: id,
      note: "ลูกค้ายกเลิกเอง",
    });
    if (creditError)
      return {
        error: `ยกเลิกแล้ว แต่บันทึกเครดิตคืนไม่สำเร็จ: ${creditError.message} — กรุณาแจ้งผู้ดูแลระบบ`,
      };
  }

  if (booking.booking_type === "open_play" && booking.open_play_session_id) {
    await notifyWaitlistForSession(service, booking.open_play_session_id as string);
  }

  redirect(`/${locale}/bookings?cancelled=1`);
}
