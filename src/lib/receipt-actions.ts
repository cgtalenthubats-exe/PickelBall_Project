"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReceiptActionState = { error?: string; saved?: boolean } | null;

// Customers edit their own tax-invoice details (ใบกำกับภาษี) — name /
// tax ID / address — then reprint the receipt with them filled in.
export async function updateTaxProfile(
  _prev: ReceiptActionState,
  fd: FormData,
): Promise<ReceiptActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const { error } = await supabase
    .from("profiles")
    .update({
      tax_name: String(fd.get("taxName") ?? "").trim() || null,
      tax_id: String(fd.get("taxId") ?? "").trim() || null,
      tax_address: String(fd.get("taxAddress") ?? "").trim() || null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { saved: true };
}
