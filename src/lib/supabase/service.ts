import { createClient } from "@supabase/supabase-js";

// Server-to-server client using the service_role key — bypasses RLS entirely.
// Only use this in trusted, server-only code that authenticates its caller
// itself (e.g. a webhook/API route checking a shared secret), never in a
// path reachable from a logged-in user's own session. Never import this into
// client components or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
