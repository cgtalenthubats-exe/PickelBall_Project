import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Unread notifications for the logged-in user — polled by the header bell.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [], count: 0 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) return NextResponse.json({ items: [], count: 0 });
  return NextResponse.json({ items: data ?? [], count: (data ?? []).length });
}

// Mark all unread as read (bell "อ่านแล้วทั้งหมด" / opening the dropdown).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  return NextResponse.json({ ok: true });
}
