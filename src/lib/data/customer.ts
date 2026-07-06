import { createClient } from "@/lib/supabase/server";

export interface CustomerCourt {
  id: string;
  name: string;
  purpose: string; // 'private' | 'open_play'
}
export interface CustomerSession {
  id: string;
  courtId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  taken: number;
  pricePerPerson: number;
  skillLevel: string | null;
  status: string;
}
export interface CustomerVenue {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[];
  amenities: string[];
  courts: CustomerCourt[];
  sessions: CustomerSession[];
}

type Row = {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[] | null;
  amenities: string[] | null;
  courts: { id: string; name: string; purpose: string | null }[];
  open_play_sessions: {
    id: string;
    court_id: string;
    start_time: string;
    end_time: string;
    capacity: number;
    price_per_person: number;
    skill_level: string | null;
    status: string;
  }[];
};

export interface CustomerVenueSummary {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
  amenities: string[];
  courtCount: number;
}

type SummaryRow = {
  id: string;
  slug: string;
  name: string;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[] | null;
  amenities: string[] | null;
  courts: { id: string }[];
};

/**
 * Branch listing for the /venues index. Returns [] when Supabase has no venues
 * so the page can fall back to bundled mock data.
 */
export async function getCustomerVenues(): Promise<CustomerVenueSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select("id, slug, name, area, address, lat, lng, gallery, amenities, courts(id)")
    .eq("status", "active")
    .order("name");

  const rows = (data ?? []) as unknown as SummaryRow[];
  return rows.map((v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    area: v.area ?? "",
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    image: v.gallery?.[0] ?? null,
    amenities: v.amenities ?? [],
    courtCount: v.courts?.length ?? 0,
  }));
}

export async function getCustomerVenue(
  slug: string,
): Promise<CustomerVenue | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select(
      "id, slug, name, area, address, lat, lng, gallery, amenities, courts(id,name,purpose), open_play_sessions(id,court_id,start_time,end_time,capacity,price_per_person,skill_level,status)",
    )
    .eq("slug", slug)
    .single();
  if (!data) return null;
  const v = data as unknown as Row;
  const courts = (v.courts ?? [])
    .map((c) => ({ id: c.id, name: c.name, purpose: c.purpose ?? "private" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const courtName = (id: string) =>
    courts.find((c) => c.id === id)?.name ?? "";

  // count confirmed/pending open-play bookings per session for "taken"
  const sessionIds = (v.open_play_sessions ?? []).map((s) => s.id);
  const taken: Record<string, number> = {};
  if (sessionIds.length) {
    const { data: bk } = await supabase
      .from("bookings")
      .select("open_play_session_id, seats, status")
      .in("open_play_session_id", sessionIds)
      .in("status", ["pending", "confirmed", "completed"]);
    (bk ?? []).forEach((b) => {
      const k = b.open_play_session_id as string;
      taken[k] = (taken[k] ?? 0) + (b.seats ?? 1);
    });
  }

  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    area: v.area,
    address: v.address ?? null,
    lat: v.lat ?? null,
    lng: v.lng ?? null,
    gallery: v.gallery ?? [],
    amenities: v.amenities ?? [],
    courts,
    sessions: (v.open_play_sessions ?? []).map((s) => ({
      id: s.id,
      courtId: s.court_id,
      courtName: courtName(s.court_id),
      startTime: s.start_time,
      endTime: s.end_time,
      capacity: s.capacity,
      taken: taken[s.id] ?? 0,
      pricePerPerson: Number(s.price_per_person),
      skillLevel: s.skill_level,
      status: s.status,
    })),
  };
}
