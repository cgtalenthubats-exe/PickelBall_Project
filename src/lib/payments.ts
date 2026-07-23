// Stripe integration via plain REST (no SDK dependency). Everything is
// gated on STRIPE_SECRET_KEY being configured: when it's absent the app
// falls back to the pre-payment "beta" behavior (auto-confirm bookings),
// so shipping this code does not break production until keys are set.
//
// Env needed in production:
//   STRIPE_SECRET_KEY      sk_live_... / sk_test_...
//   STRIPE_WEBHOOK_SECRET  whsec_...   (from the Stripe webhook endpoint)
//   NEXT_PUBLIC_SITE_URL   https://... (checkout redirect base)

import { createHmac, timingSafeEqual } from "crypto";

export function paymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

const STRIPE_API = "https://api.stripe.com/v1";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL?.replace(/^(?!https?:)/, "https://") ??
    "http://localhost:3000"
  );
}

// Creates a Stripe Checkout Session for a booking (or later, a POS order).
// Amounts are THB; Stripe wants satang (x100).
export async function createCheckoutSession(opts: {
  kind: "booking" | "order";
  refId: string; // bookings.id or orders.id — echoed back in the webhook
  amount: number;
  description: string;
  locale: string;
  successPath: string;
  cancelPath: string;
}): Promise<{ url: string } | { error: string }> {
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "thb",
    "line_items[0][price_data][unit_amount]": String(Math.round(opts.amount * 100)),
    "line_items[0][price_data][product_data][name]": opts.description,
    "line_items[0][quantity]": "1",
    "metadata[kind]": opts.kind,
    "metadata[refId]": opts.refId,
    success_url: `${siteUrl()}${opts.successPath}`,
    cancel_url: `${siteUrl()}${opts.cancelPath}`,
    // PromptPay appears automatically for THB when enabled on the Stripe
    // account's payment-method settings; no per-session flag needed.
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) {
    return { error: json.error?.message ?? "สร้างรายการชำระเงินไม่สำเร็จ" };
  }
  return { url: json.url };
}

// Verifies Stripe's webhook signature header ("t=...,v1=...") against the
// raw request body. Returns false on any mismatch/expiry.
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(",").map((kv) => {
      const [k, ...rest] = kv.split("=");
      return [k.trim(), rest.join("=")] as const;
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
