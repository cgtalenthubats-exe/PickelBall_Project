"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      venue_id: venueId,
      court_id: courtId,
      booking_type: type,
      open_play_session_id: sessionId,
      seats,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed", // beta: payment not wired yet
      price_line_items: lineItems,
      subtotal: total,
      total,
    })
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

  redirect(`/${locale}/bookings`);
}
