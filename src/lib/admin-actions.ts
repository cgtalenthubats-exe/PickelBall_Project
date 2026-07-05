"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error?: string } | null;

export async function createVenue(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "กรุณากรอกชื่อสาขา" };
  const slug =
    String(fd.get("slug") ?? "").trim() ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `venue-${Date.now()}`;
  const courtsN = Math.max(1, Number(fd.get("courts") ?? 1));

  const { data: v, error } = await supabase
    .from("venues")
    .insert({
      name,
      slug,
      area: String(fd.get("area") ?? ""),
      address: String(fd.get("address") ?? ""),
      lat: Number(fd.get("lat") || 0),
      lng: Number(fd.get("lng") || 0),
      amenities: String(fd.get("amenities") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "active",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const letters = "ABCDEFGH".slice(0, Math.min(8, courtsN)).split("");
  await supabase
    .from("courts")
    .insert(letters.map((l) => ({ venue_id: v.id, name: l })));

  redirect(`/${await getLocale()}/admin/venues`);
}

export async function createEquipment(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "กรุณากรอกชื่ออุปกรณ์" };
  const free = fd.get("free") === "on";

  const { error } = await supabase.from("equipment").insert({
    name,
    rental_price: free ? 0 : Number(fd.get("price") || 0),
    stock_per_slot: Number(fd.get("stock") || 0),
    is_included_free: free,
    status: "active",
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/equipment`);
}

export async function createSession(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const venueId = String(fd.get("venueId") ?? "");
  const courtId = String(fd.get("courtId") ?? "");
  const date = String(fd.get("date") ?? "");
  const start = String(fd.get("start") ?? "");
  const end = String(fd.get("end") ?? "");
  if (!venueId || !courtId || !date || !start || !end)
    return { error: "กรุณากรอกข้อมูลให้ครบ" };

  const { error } = await supabase.from("open_play_sessions").insert({
    venue_id: venueId,
    court_id: courtId,
    start_time: `${date}T${start}:00+07:00`,
    end_time: `${date}T${end}:00+07:00`,
    capacity: Number(fd.get("capacity") || 12),
    price_per_person: Number(fd.get("price") || 0),
    skill_level: String(fd.get("level") ?? "All Level"),
    status: "open",
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/sessions`);
}
