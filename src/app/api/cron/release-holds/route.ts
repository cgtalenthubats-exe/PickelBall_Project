import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyWaitlistForSession } from "@/lib/notify";

// Releases expired holds: pending bookings whose hold window lapsed without
// payment become cancelled, freeing the slot (private EXCLUDE constraint and
// open-play capacity trigger both only count pending/confirmed rows, so the
// slot opens up immediately).
//
// Runs every 5 minutes via vercel.json cron. Vercel sends
// "Authorization: Bearer ${CRON_SECRET}" automatically when CRON_SECRET is
// set in the project env.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .not("hold_expires_at", "is", null)
    .lt("hold_expires_at", new Date().toISOString())
    .select("id, booking_type, open_play_session_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Freed Open Play seats go to the waitlist queue (one call per session).
  const sessionIds = [
    ...new Set(
      (data ?? [])
        .filter((b) => b.booking_type === "open_play" && b.open_play_session_id)
        .map((b) => b.open_play_session_id as string),
    ),
  ];
  for (const sid of sessionIds) {
    await notifyWaitlistForSession(supabase, sid);
  }

  return NextResponse.json({ released: data?.length ?? 0 });
}
