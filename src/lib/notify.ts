import type { SupabaseClient } from "@supabase/supabase-js";

interface StaffNotif {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

// Fan a notification out to the staff of a venue. `managersOnly` limits it to
// venue_manager + super_admin (e.g. low-stock alerts); otherwise all staff of
// the venue get it (e.g. a new order to serve). super_admin always included.
export async function notifyVenueStaff(
  supabase: SupabaseClient,
  venueId: string,
  notif: StaffNotif,
  managersOnly = false,
): Promise<void> {
  const roles = managersOnly
    ? ["venue_manager", "super_admin"]
    : ["staff", "venue_manager", "super_admin"];
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, role, managed_venue_id, active")
    .in("role", roles);
  const targets = (staff ?? []).filter(
    (s) =>
      s.active !== false &&
      (s.role === "super_admin" || s.managed_venue_id === venueId),
  );
  if (!targets.length) return;
  await supabase.from("notifications").insert(
    targets.map((s) => ({
      user_id: s.id,
      type: notif.type,
      title: notif.title,
      body: notif.body ?? null,
      link: notif.link ?? null,
    })),
  );
}

// When an Open Play seat frees up (cancel / refund / expired hold), tell the
// people waiting — first-come order, one notification per freed seat, and
// never the same person twice (notified_at guard). MVP is in-app only; LINE
// push can hang off the same call later.
export async function notifyWaitlistForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { data: session } = await supabase
    .from("open_play_sessions")
    .select("id, capacity, start_time, venues(name, slug)")
    .eq("id", sessionId)
    .single();
  if (!session) return;
  const s = session as unknown as {
    id: string;
    capacity: number;
    start_time: string;
    venues: { name: string; slug: string } | null;
  };

  const { data: taken } = await supabase
    .from("bookings")
    .select("seats")
    .eq("open_play_session_id", sessionId)
    .in("status", ["pending", "confirmed", "completed"]);
  const seatsTaken = (taken ?? []).reduce((n, b) => n + (Number(b.seats) || 1), 0);
  const free = s.capacity - seatsTaken;
  if (free <= 0) return;

  const { data: waiting } = await supabase
    .from("waitlist")
    .select("id, user_id")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .is("notified_at", null)
    .order("created_at")
    .limit(free);
  if (!waiting?.length) return;

  const when = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(s.start_time));

  await supabase.from("notifications").insert(
    waiting.map((w) => ({
      user_id: w.user_id,
      type: "waitlist_slot",
      title: "มีที่ว่างในรอบ Open Play ที่คุณต่อคิวไว้!",
      body: `${s.venues?.name ?? ""} · ${when} — รีบจองก่อนเต็มอีกรอบ`,
      link: s.venues?.slug ? `/venues/${s.venues.slug}/book?type=open_play` : null,
    })),
  );
  await supabase
    .from("waitlist")
    .update({ notified_at: new Date().toISOString() })
    .in("id", waiting.map((w) => w.id));
}
