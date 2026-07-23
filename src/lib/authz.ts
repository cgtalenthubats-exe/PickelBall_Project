import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

// Three staff levels, ordered. Access model:
//   super_admin   — every venue, every action
//   venue_manager — own venue only, every action within it
//   staff         — own venue only, floor operations (POS, stock, check-in,
//                   tasks, open-play sessions); no pricing/venue/staff/reports
export type StaffRole = "staff" | "venue_manager" | "super_admin";

const LEVEL: Record<StaffRole, number> = {
  staff: 1,
  venue_manager: 2,
  super_admin: 3,
};

export interface StaffContext {
  userId: string;
  role: StaffRole;
  // null for super_admin (sees everything); always set for the other roles
  venueId: string | null;
}

async function loadStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, managed_venue_id, active")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "customer" || profile.active === false) {
    return null;
  }
  const role = profile.role as StaffRole;
  return {
    userId: user.id,
    role,
    venueId: role === "super_admin" ? null : (profile.managed_venue_id as string | null),
  };
}

// For admin PAGES — redirects away when the viewer is below minRole.
export async function requireAdminPage(
  minRole: StaffRole = "staff",
): Promise<StaffContext> {
  const ctx = await loadStaffContext();
  const locale = await getLocale();
  if (!ctx) redirect(`/${locale}/login`);
  if (LEVEL[ctx.role] < LEVEL[minRole]) redirect(`/${locale}/admin`);
  return ctx;
}

// For server ACTIONS — returns null when below minRole so the caller can
// return a friendly error instead of redirecting mid-mutation.
export async function requireActionRole(
  minRole: StaffRole = "staff",
): Promise<StaffContext | null> {
  const ctx = await loadStaffContext();
  if (!ctx || LEVEL[ctx.role] < LEVEL[minRole]) return null;
  return ctx;
}

// True when this context may touch data belonging to `venueId`.
// null venueId on the data means "global" (e.g. equipment for all venues) —
// only super_admin can touch those.
export function canAccessVenue(ctx: StaffContext, venueId: string | null): boolean {
  if (ctx.role === "super_admin") return true;
  if (!venueId) return false;
  return ctx.venueId === venueId;
}

export const FORBIDDEN = "คุณไม่มีสิทธิ์ทำรายการนี้ (ตรวจสอบ role/สาขาของบัญชี)";
