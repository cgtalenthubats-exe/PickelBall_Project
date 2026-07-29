import { notFound } from "next/navigation";
import { CheckCircle2, User, MapPin, Clock, Phone } from "lucide-react";
import { requireAdminPage, canAccessVenue } from "@/lib/authz";
import { resolveCheckinToken } from "@/lib/pos-order";
import { Link } from "@/i18n/navigation";
import { CheckinConfirmButton } from "@/components/admin/checkin-confirm-button";

// Staff scans the customer's check-in QR (their own phone camera opens this
// URL) and confirms arrival here. Once checked in, jump straight into
// building a counter order for the same booking.
export default async function StaffCheckinPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const ctx = await requireAdminPage("staff");
  const booking = await resolveCheckinToken(token);
  if (!booking || !canAccessVenue(ctx, booking.venueId)) notFound();

  const timeRange = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-ink">
          <User className="w-5 h-5 text-pine" />
          <span className="font-display text-lg">{booking.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-taupe mt-2">
          <Phone className="w-4 h-4" />
          {booking.customerPhone}
        </div>
        <div className="flex items-center gap-2 text-sm text-taupe mt-1">
          <MapPin className="w-4 h-4" />
          {booking.venueName} · คอร์ท {booking.courtName}
        </div>
        <div className="flex items-center gap-2 text-sm text-taupe mt-1 tnum">
          <Clock className="w-4 h-4" />
          {timeRange.format(new Date(booking.startTime))}–
          {timeRange.format(new Date(booking.endTime))}
        </div>

        {booking.checkedInAt ? (
          <div className="mt-5 pt-5 border-t border-line">
            <div className="flex items-center gap-2 text-pine">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">เช็คอินแล้ว</span>
            </div>
            <p className="text-xs text-taupe mt-1">
              {new Intl.DateTimeFormat("th-TH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Bangkok",
              }).format(new Date(booking.checkedInAt))}
            </p>
            <Link
              href={`/admin/orders/new?venueId=${booking.venueId}&bookingId=${booking.bookingId}`}
              className="mt-4 block text-center bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors"
            >
              สร้างออเดอร์สั่งของให้ลูกค้าคนนี้ →
            </Link>
          </div>
        ) : (
          <div className="mt-5 pt-5 border-t border-line">
            <CheckinConfirmButton id={booking.bookingId} token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
