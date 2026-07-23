import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ released: data?.length ?? 0 });
}
