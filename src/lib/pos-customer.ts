import { createServiceClient } from "@/lib/supabase/service";

// Walk-in customers booked via POS2U rarely have a webapp account. We use
// phone number as the shared identity key: look up an existing profile by
// phone, or create a phone-only Supabase Auth user (no password) so the
// same customer accumulates one CRM history whether they walk in or book
// online, and can later claim the account by logging in with that phone.
export async function resolveWalkInCustomer(
  rawPhone: string,
  name?: string,
): Promise<string> {
  const phone = normalizeThaiPhone(rawPhone);
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { name: name ?? null, phone },
  });
  if (error || !created?.user) {
    // Two concurrent walk-ins with the same new phone number can race here —
    // the loser's createUser fails because the phone now exists. Fall back
    // to the row the winner just created instead of erroring the request.
    const { data: retry } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (retry) return retry.id;
    throw new Error(error?.message ?? "walkin_user_create_failed");
  }
  return created.user.id;
}

function normalizeThaiPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("66")) return `+${digits}`;
  if (digits.startsWith("0")) return `+66${digits.slice(1)}`;
  return `+${digits}`;
}
