"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error?: string } | null;

// Pull "lat,lng" out of the many Google Maps URL shapes.
function parseLatLng(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // /place/.../@13.75,100.56,15z
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=13.75,100.56
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?ll=13.75,100.56
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // !3d13.75!4d100.56
    /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/, // bare "13.75, 100.56"
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

// Resolve short links (maps.app.goo.gl / goo.gl/maps) then parse.
async function resolveLatLng(url: string) {
  let coords = parseLatLng(url);
  if (!coords && /goo\.gl|maps\.app/.test(url)) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      coords = parseLatLng(res.url) ?? parseLatLng(await res.text());
    } catch {
      /* network/short-link resolve failed — fall through */
    }
  }
  return coords;
}

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

  const mapUrl = String(fd.get("mapUrl") ?? "").trim();
  const coords = mapUrl ? await resolveLatLng(mapUrl) : null;
  if (mapUrl && !coords)
    return {
      error:
        "อ่านพิกัดจากลิงก์ไม่ได้ — ลองวางลิงก์ Google Maps แบบเต็ม (ที่มี @lat,lng)",
    };

  const { data: v, error } = await supabase
    .from("venues")
    .insert({
      name,
      slug,
      area: String(fd.get("area") ?? ""),
      address: String(fd.get("address") ?? ""),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
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
    venue_id: String(fd.get("venueId") ?? "") || null, // null = ทุกสาขา
    rental_price: free ? 0 : Number(fd.get("price") || 0),
    stock_per_slot: Number(fd.get("stock") || 0),
    is_included_free: free,
    status: "active",
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/equipment`);
}

export async function updateEquipment(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ไม่พบรายการ" };
  const free = fd.get("free") === "on";

  const { error } = await supabase
    .from("equipment")
    .update({
      name: String(fd.get("name") ?? "").trim(),
      venue_id: String(fd.get("venueId") ?? "") || null,
      rental_price: free ? 0 : Number(fd.get("price") || 0),
      stock_per_slot: Number(fd.get("stock") || 0),
      is_included_free: free,
      status: String(fd.get("status") ?? "active"),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/equipment`);
}

export async function createPricingRule(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const venueId = String(fd.get("venueId") ?? "");
  if (!venueId) return { error: "กรุณาเลือกสาขา" };
  const dow = String(fd.get("dow") ?? "");

  const { error } = await supabase.from("pricing_rules").insert({
    venue_id: venueId,
    court_id: String(fd.get("courtId") ?? "") || null, // null = ทุกคอร์ท
    day_of_week: dow === "" ? null : Number(dow), // null = ทุกวัน
    start_time: String(fd.get("start") ?? "") || null,
    end_time: String(fd.get("end") ?? "") || null,
    price_per_hour: Number(fd.get("price") || 0),
    label: String(fd.get("label") ?? "off_peak"),
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/pricing`);
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
