"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireActionRole, canAccessVenue, FORBIDDEN } from "@/lib/authz";

export type ExpenseActionState = { error?: string } | null;

export const EXPENSE_CATEGORIES = [
  { value: "facility_rent", label: "ค่าเช่าสถานที่" },
  { value: "utility", label: "ค่าน้ำ/ค่าไฟ/สาธารณูปโภค" },
  { value: "wage", label: "ค่าจ้างพนักงาน" },
  { value: "other", label: "อื่นๆ" },
] as const;
const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);

export async function createExpense(
  _prev: ExpenseActionState,
  fd: FormData,
): Promise<ExpenseActionState> {
  const venueId = String(fd.get("venueId") ?? "");
  if (!venueId) return { error: "กรุณาเลือกสาขา" };
  const ctx = await requireActionRole("venue_manager");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };

  const category = String(fd.get("category") ?? "other");
  if (!CATEGORY_VALUES.includes(category as (typeof CATEGORY_VALUES)[number]))
    return { error: "ประเภทค่าใช้จ่ายไม่ถูกต้อง" };
  const amount = Number(fd.get("amount") || 0);
  if (!(amount > 0)) return { error: "กรุณากรอกจำนวนเงินให้ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    venue_id: venueId,
    category,
    amount,
    note: String(fd.get("note") ?? "").trim() || null,
    doc_ref: String(fd.get("docRef") ?? "").trim() || null,
    supplier: String(fd.get("supplier") ?? "").trim() || null,
    expense_date: String(fd.get("expenseDate") ?? "") || new Date().toISOString().slice(0, 10),
    created_by: ctx.userId,
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/expenses`);
}

export async function deleteExpense(
  _prev: ExpenseActionState,
  fd: FormData,
): Promise<ExpenseActionState> {
  const id = String(fd.get("id") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  if (!id) return { error: "ไม่พบรายการ" };
  const ctx = await requireActionRole("venue_manager");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/expenses`);
}
