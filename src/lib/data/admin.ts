import { createClient } from "@/lib/supabase/server";

const time = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

const date = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

export interface DbVenue {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  amenities: string[];
  gallery: string[];
  status: string;
  courtCount: number;
}

export async function getDbVenues(): Promise<DbVenue[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select(
      "id, slug, name, area, address, lat, lng, amenities, gallery, status, courts(count)",
    )
    .order("name");
  return (data ?? []).map((v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    area: v.area,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    amenities: v.amenities ?? [],
    gallery: v.gallery ?? [],
    status: v.status,
    // @ts-expect-error supabase aggregate shape
    courtCount: v.courts?.[0]?.count ?? 0,
  }));
}

export async function getDbEquipment() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select(
      "id, name, rental_price, stock_per_slot, is_included_free, status, venues(name)",
    )
    .order("name");
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    // @ts-expect-error joined relation
    venueName: e.venues?.name ?? "ทุกสาขา",
    price: Number(e.rental_price),
    stockPerSlot: e.stock_per_slot,
    includedFree: e.is_included_free,
    status: e.status,
  }));
}

export async function getDbSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_play_sessions")
    .select(
      "id, start_time, end_time, capacity, price_per_person, skill_level, status, venues(name), courts(name)",
    )
    .order("start_time");
  return (data ?? []).map((s) => ({
    id: s.id,
    // @ts-expect-error joined relation
    venueName: s.venues?.name ?? "",
    // @ts-expect-error joined relation
    courtName: s.courts?.name ?? "",
    dateLabel: date(s.start_time),
    timeLabel: `${time(s.start_time)}–${time(s.end_time)}`,
    capacity: s.capacity,
    taken: 0,
    price: Number(s.price_per_person),
    level: s.skill_level ?? "",
    status: s.status as "open" | "full" | "cancelled",
  }));
}
