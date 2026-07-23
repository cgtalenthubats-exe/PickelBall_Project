import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/components/notifications-banner";

// Unread notifications for the logged-in customer. Fail-soft: returns []
// before migration-notify.sql exists so pages keep rendering.
export async function getMyNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return [];

  const fmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  return (data ?? []).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    body: (n.body as string | null) ?? "",
    link: n.link as string | null,
    at: fmt.format(new Date(n.created_at as string)),
  }));
}
