import type { SupabaseClient } from "@supabase/supabase-js";

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
