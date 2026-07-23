import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { requireAdminPage, canAccessVenue } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/admin/print-button";

// Printable QR sheet for one booking — staff hands this to the group so
// anyone at the court can scan, order, and pay from their own phone.
export default async function OrderQrPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const ctx = await requireAdminPage("staff");

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, venue_id, order_token, start_time, end_time, venues(name), courts(name)")
    .eq("id", bookingId)
    .single();
  const row = data as unknown as {
    id: string;
    venue_id: string;
    order_token: string | null;
    start_time: string;
    end_time: string;
    venues: { name: string } | null;
    courts: { name: string } | null;
  } | null;
  if (!row || !row.order_token || !canAccessVenue(ctx, row.venue_id)) notFound();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${site}/${locale}/order/${row.order_token}`;
  const qrDataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1 });

  const time = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  return (
    <div className="max-w-sm mx-auto text-center py-6 print:py-0">
      <div className="font-display text-2xl font-bold text-pine">
        {row.venues?.name}
      </div>
      <div className="text-sm text-taupe mt-1 tnum">
        คอร์ท {row.courts?.name} · {time.format(new Date(row.start_time))}–
        {time.format(new Date(row.end_time))}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-6 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR สั่งของ" className="w-64 h-64" />
      </div>

      <p className="text-base font-medium text-ink mt-4">
        สแกนเพื่อสั่งเครื่องดื่ม/ของว่างถึงคอร์ท 🏓
      </p>
      <p className="text-xs text-taupe mt-1">
        จ่ายผ่านมือถือได้เลย · แชร์ลิงก์ให้เพื่อนในก๊วนได้
      </p>

      <div className="mt-6 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
