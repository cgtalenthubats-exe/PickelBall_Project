import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireActionRole, canAccessVenue } from "@/lib/authz";
import { PrintButton } from "@/components/admin/print-button";
import { TaxProfileForm } from "@/components/tax-profile-form";

// ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ — kind "b" (booking) หรือ "o" (order).
// Prices are VAT-inclusive; VAT line = total × 7/107.
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; kind: string; id: string }>;
}) {
  const { locale, kind, id } = await params;
  setRequestLocale(locale);
  if (kind !== "b" && kind !== "o") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  const staffCtx = await requireActionRole("staff").catch(() => null);

  let header: { venue: string; address: string };
  let meta: { label: string; refCode: string; when: string; method: string };
  let lines: { label: string; amount: number }[];
  let total: number;
  let ownerId: string | null;
  let venueId: string;

  const dt = (iso: string) =>
    new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date(iso));

  if (kind === "b") {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, user_id, venue_id, status, total, price_line_items, start_time, created_at, venues(name, address), payments(method, paid_at, status)",
      )
      .eq("id", id)
      .single();
    const b = data as unknown as {
      id: string;
      user_id: string;
      venue_id: string;
      status: string;
      total: number;
      price_line_items: { label: string; amount: number }[];
      start_time: string;
      created_at: string;
      venues: { name: string; address: string | null } | null;
      payments: { method: string | null; paid_at: string | null; status: string }[];
    } | null;
    if (!b || !["confirmed", "completed", "refunded"].includes(b.status)) notFound();
    ownerId = b.user_id;
    venueId = b.venue_id;
    const paid = (b.payments ?? []).find((p) => p.status === "succeeded" || p.status === "refunded");
    header = {
      venue: b.venues?.name ?? "PickleBall",
      address: b.venues?.address ?? "",
    };
    meta = {
      label: "ค่าจองสนาม",
      refCode: `BK-${b.id.slice(0, 8).toUpperCase()}`,
      when: dt(paid?.paid_at ?? b.created_at),
      method: paid?.method ?? "-",
    };
    lines = (b.price_line_items ?? []).map((l) => ({
      label: l.label,
      amount: Number(l.amount),
    }));
    total = Number(b.total);
  } else {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, user_id, venue_id, status, total, paid_at, created_at, venues(name, address), order_items(name_at_order, qty, price_at_order)",
      )
      .eq("id", id)
      .single();
    const o = data as unknown as {
      id: string;
      user_id: string | null;
      venue_id: string;
      status: string;
      total: number;
      paid_at: string | null;
      created_at: string;
      venues: { name: string; address: string | null } | null;
      order_items: { name_at_order: string; qty: number; price_at_order: number }[];
    } | null;
    if (!o || !["paid", "served", "refunded"].includes(o.status)) notFound();
    ownerId = o.user_id;
    venueId = o.venue_id;
    header = {
      venue: o.venues?.name ?? "PickleBall",
      address: o.venues?.address ?? "",
    };
    meta = {
      label: "ค่าสินค้า",
      refCode: `OR-${o.id.slice(0, 8).toUpperCase()}`,
      when: dt(o.paid_at ?? o.created_at),
      method: "ชำระออนไลน์/หน้าร้าน",
    };
    lines = (o.order_items ?? []).map((i) => ({
      label: `${i.name_at_order} × ${i.qty}`,
      amount: Number(i.price_at_order) * i.qty,
    }));
    total = Number(o.total);
  }

  // Owner or staff of that venue only.
  const isOwner = ownerId === user.id;
  const isStaff = staffCtx && canAccessVenue(staffCtx, venueId);
  if (!isOwner && !isStaff) notFound();

  const vat = Math.round(((total * 7) / 107) * 100) / 100;
  const beforeVat = Math.round((total - vat) * 100) / 100;

  // Tax details of the receipt owner (for ใบกำกับภาษี).
  const { data: taxProfile } = await supabase
    .from("profiles")
    .select("name, tax_name, tax_id, tax_address")
    .eq("id", ownerId ?? user.id)
    .single();

  return (
    <div className="min-h-dvh bg-bone print:bg-white">
      <main className="max-w-sm mx-auto w-full px-5 py-8 print:py-2">
        <div className="rounded-2xl border border-line bg-surface p-6 print:border-0 print:p-0">
          <div className="text-center">
            <div className="font-display text-xl font-bold text-pine">
              {header.venue}
            </div>
            {header.address && (
              <div className="text-[11px] text-taupe mt-0.5">{header.address}</div>
            )}
            <div className="text-sm font-medium text-ink mt-3">
              ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ
            </div>
            <div className="text-[11px] text-taupe tnum mt-1">
              เลขที่ {meta.refCode} · {meta.when}
            </div>
          </div>

          {(taxProfile?.tax_name || taxProfile?.tax_id) && (
            <div className="mt-4 text-xs text-ink border border-line rounded-lg p-3">
              <div className="text-taupe text-[11px] mb-0.5">ออกในนาม</div>
              <div>{taxProfile.tax_name ?? taxProfile.name}</div>
              {taxProfile.tax_id && (
                <div className="tnum">เลขผู้เสียภาษี {taxProfile.tax_id}</div>
              )}
              {taxProfile.tax_address && (
                <div className="text-taupe">{taxProfile.tax_address}</div>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-dashed border-line pt-3 space-y-1.5">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-ink">{l.label}</span>
                <span className="tnum text-ink">
                  {l.amount < 0 ? "-" : ""}฿{Math.abs(l.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-dashed border-line pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-taupe text-xs">
              <span>มูลค่าก่อน VAT</span>
              <span className="tnum">฿{beforeVat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-taupe text-xs">
              <span>VAT 7% (รวมในราคา)</span>
              <span className="tnum">฿{vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium text-ink text-base pt-1">
              <span>รวมทั้งสิ้น</span>
              <span className="tnum">฿{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-taupe text-xs">
              <span>ช่องทางชำระ</span>
              <span>{meta.method}</span>
            </div>
          </div>

          <div className="text-center mt-5">
            {isOwner && (
              <TaxProfileForm
                taxName={taxProfile?.tax_name ?? ""}
                taxId={taxProfile?.tax_id ?? ""}
                taxAddress={taxProfile?.tax_address ?? ""}
              />
            )}
          </div>
        </div>

        <div className="text-center mt-5 print:hidden">
          <PrintButton label="ปริ้นใบเสร็จ" />
        </div>
      </main>
    </div>
  );
}
