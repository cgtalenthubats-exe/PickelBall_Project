"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireActionRole,
  canAccessVenue,
  FORBIDDEN,
  type StaffContext,
  type StaffRole,
} from "@/lib/authz";

export type AdminActionState = { error?: string } | null;

// Role guard for mutations. Returns the caller's context, or null (=> the
// action should bail with FORBIDDEN). Optionally also checks that the row's
// venue belongs to the caller.
async function guard(
  minRole: StaffRole,
  venueId?: string | null,
): Promise<StaffContext | null> {
  const ctx = await requireActionRole(minRole);
  if (!ctx) return null;
  if (venueId !== undefined && !canAccessVenue(ctx, venueId)) return null;
  return ctx;
}

// Looks up which venue a child row belongs to, for venue checks on rows
// addressed only by their own id (courts, tasks, bookings, sessions).
async function venueOf(
  table: "courts" | "staff_tasks" | "bookings",
  id: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("venue_id")
    .eq("id", id)
    .single();
  return (data?.venue_id as string | undefined) ?? null;
}

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
  if (!(await guard("super_admin"))) return { error: FORBIDDEN };
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

export async function updateVenue(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ไม่พบสาขา" };
  if (!(await guard("venue_manager", id))) return { error: FORBIDDEN };

  const mapUrl = String(fd.get("mapUrl") ?? "").trim();
  const coords = mapUrl ? await resolveLatLng(mapUrl) : null;
  if (mapUrl && !coords)
    return {
      error: "อ่านพิกัดจากลิงก์ไม่ได้ — ลองวางลิงก์ Google Maps แบบเต็ม (ที่มี @lat,lng)",
    };

  const patch: Record<string, unknown> = {
    name: String(fd.get("name") ?? "").trim(),
    area: String(fd.get("area") ?? ""),
    address: String(fd.get("address") ?? ""),
    amenities: String(fd.get("amenities") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  // Only overwrite coordinates when a new link was provided.
  if (coords) {
    patch.lat = coords.lat;
    patch.lng = coords.lng;
  }

  const { error } = await supabase.from("venues").update(patch).eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/venues`);
}

export async function setVenueStatus(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  if (!(await guard("super_admin"))) return { error: FORBIDDEN };
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "active");
  const { error } = await supabase
    .from("venues")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/venues`);
}

// ---------- courts ----------
export async function addCourt(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const venueId = String(fd.get("venueId") ?? "");
  if (!venueId) return { error: "ไม่พบสาขา" };
  if (!(await guard("venue_manager", venueId))) return { error: FORBIDDEN };
  let name = String(fd.get("name") ?? "").trim();
  if (!name) {
    // auto next letter based on current count
    const { count } = await supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId);
    name = "ABCDEFGHIJKLMNOP".charAt(count ?? 0) || `C${(count ?? 0) + 1}`;
  }
  const { error } = await supabase.from("courts").insert({
    venue_id: venueId,
    name,
    purpose: String(fd.get("purpose") ?? "private"),
    status: "active",
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/venues`);
}

export async function setCourtPurpose(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!(await guard("venue_manager", await venueOf("courts", id))))
    return { error: FORBIDDEN };
  const purpose = String(fd.get("purpose") ?? "private");
  const { error } = await supabase
    .from("courts")
    .update({ purpose })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/venues`);
}

export async function deleteCourt(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!(await guard("venue_manager", await venueOf("courts", id))))
    return { error: FORBIDDEN };
  const { error } = await supabase.from("courts").delete().eq("id", id);
  if (error)
    return {
      error: /foreign key|violates/i.test(error.message)
        ? "ลบไม่ได้ — คอร์ทนี้มีการจอง/รอบอยู่แล้ว"
        : error.message,
    };
  redirect(`/${await getLocale()}/admin/venues`);
}

export async function createEquipment(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "กรุณากรอกชื่ออุปกรณ์" };
  // null venueId = "all venues" gear, which only super_admin may create.
  if (!(await guard("venue_manager", String(fd.get("venueId") ?? "") || null)))
    return { error: FORBIDDEN };
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
  if (!(await guard("venue_manager", String(fd.get("venueId") ?? "") || null)))
    return { error: FORBIDDEN };
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

export async function promoteStaff(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const email = String(fd.get("email") ?? "").trim();
  if (!email) return { error: "กรุณากรอกอีเมล" };
  const role = String(fd.get("role") ?? "staff");
  let venueId = String(fd.get("managedVenueId") ?? "") || null;
  const ctx = await guard("venue_manager");
  if (!ctx) return { error: FORBIDDEN };
  // Branch managers can only add floor staff into their own venue.
  if (ctx.role === "venue_manager") {
    if (role !== "staff") return { error: FORBIDDEN };
    venueId = ctx.venueId;
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!prof)
    return {
      error: "ไม่พบบัญชีอีเมลนี้ — ให้พนักงานสมัคร/ล็อกอินเข้าระบบก่อน แล้วค่อยเลื่อนสิทธิ์",
    };

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      managed_venue_id: role === "super_admin" ? null : venueId,
      active: true,
    })
    .eq("id", prof.id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/staff`);
}

export async function updateStaff(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ไม่พบพนักงาน" };
  const role = String(fd.get("role") ?? "staff");
  let venueId = String(fd.get("managedVenueId") ?? "") || null;
  const active = fd.get("active") === "on";
  const ctx = await guard("venue_manager");
  if (!ctx) return { error: FORBIDDEN };
  if (ctx.role === "venue_manager") {
    // Managers only manage floor staff of their own venue.
    if (role !== "staff") return { error: FORBIDDEN };
    const { data: target } = await supabase
      .from("profiles")
      .select("managed_venue_id, role")
      .eq("id", id)
      .single();
    if (!target || target.managed_venue_id !== ctx.venueId || target.role !== "staff")
      return { error: FORBIDDEN };
    venueId = ctx.venueId;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      managed_venue_id: role === "super_admin" ? null : venueId,
      active,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/staff`);
}

export async function createTask(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const venueId = String(fd.get("venueId") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  if (!venueId) return { error: "กรุณาเลือกสาขา" };
  if (!title) return { error: "กรุณากรอกชื่องาน" };
  if (!(await guard("staff", venueId))) return { error: FORBIDDEN };

  const { error } = await supabase.from("staff_tasks").insert({
    venue_id: venueId,
    court_id: String(fd.get("courtId") ?? "") || null,
    title,
    scheduled_time: String(fd.get("time") ?? "") || null,
    category: String(fd.get("category") ?? "cleaning"),
    done: false,
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/tasks`);
}

export async function toggleTask(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!(await guard("staff", await venueOf("staff_tasks", id))))
    return { error: FORBIDDEN };
  const done = fd.get("done") === "true";
  const { error } = await supabase
    .from("staff_tasks")
    .update({ done })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/tasks`);
}

export async function deleteTask(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!(await guard("staff", await venueOf("staff_tasks", id))))
    return { error: FORBIDDEN };
  const { error } = await supabase.from("staff_tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/tasks`);
}

export async function removeFromWaitlist(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!(await guard("staff"))) return { error: FORBIDDEN };
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/sessions`);
}

export async function confirmOnsitePayment(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ไม่พบการจอง" };
  if (!(await guard("staff", await venueOf("bookings", id))))
    return { error: FORBIDDEN };

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, total")
    .eq("id", id)
    .single();
  if (fetchError || !booking) return { error: "ไม่พบการจอง" };
  if (booking.status !== "pending")
    return { error: "รายการนี้ไม่ได้อยู่ในสถานะรอชำระ" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("payments").insert({
    booking_id: id,
    method: "pos_onsite",
    amount: booking.total,
    status: "succeeded",
    paid_at: new Date().toISOString(),
  });

  redirect(`/${await getLocale()}/admin`);
}

export async function updateCustomerTags(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ไม่พบลูกค้า" };
  if (!(await guard("venue_manager"))) return { error: FORBIDDEN };
  const tags = String(fd.get("tags") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { error } = await supabase
    .from("profiles")
    .update({ tags })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/customers`);
}

export async function createPricingRule(
  _prev: AdminActionState,
  fd: FormData,
): Promise<AdminActionState> {
  const supabase = await createClient();
  const venueId = String(fd.get("venueId") ?? "");
  if (!venueId) return { error: "กรุณาเลือกสาขา" };
  if (!(await guard("venue_manager", venueId))) return { error: FORBIDDEN };
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
  if (!(await guard("staff", venueId))) return { error: FORBIDDEN };

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
