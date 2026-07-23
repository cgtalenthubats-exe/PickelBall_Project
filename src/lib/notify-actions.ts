"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotifyActionState = { error?: string } | null;

export async function markNotificationsRead(): Promise<NotifyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  revalidatePath("/", "layout");
  return null;
}
