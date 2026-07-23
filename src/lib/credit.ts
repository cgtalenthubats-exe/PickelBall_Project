import type { SupabaseClient } from "@supabase/supabase-js";

// Wallet balance = sum of the ledger. Returns 0 when the table doesn't exist
// yet (migration-credit.sql not run) so checkout flows keep working.
export async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("change")
    .eq("user_id", userId);
  if (error) return 0;
  return (data ?? []).reduce((s, r) => s + Number(r.change), 0);
}

// Ledger a spend exactly once per ref (webhook retries, double-clicks).
export async function recordCreditSpend(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    amount: number;
    reason: "spend_booking" | "spend_order";
    refId: string;
  },
): Promise<void> {
  if (opts.amount <= 0) return;
  const { data: existing } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("ref_id", opts.refId)
    .eq("reason", opts.reason)
    .maybeSingle();
  if (existing) return;
  await supabase.from("credit_ledger").insert({
    user_id: opts.userId,
    change: -opts.amount,
    reason: opts.reason,
    ref_id: opts.refId,
  });
}
