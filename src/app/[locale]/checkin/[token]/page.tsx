import QRCode from "qrcode";
import { resolveCheckinToken } from "@/lib/pos-order";

// Public check-in QR — no login. The customer opens this on their own phone
// and shows the screen to staff, who scan the QR with their own phone; that
// opens /admin/checkin/<token> (staff-authenticated) to confirm arrival.
export default async function CheckinPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const booking = await resolveCheckinToken(token);

  if (!booking) {
    return (
      <Shell title="ไม่พบลิงก์เช็คอิน">
        <p className="text-sm text-taupe">
          ลิงก์ไม่ถูกต้อง — กลับไปหน้าการจองของฉันแล้วลองใหม่
        </p>
      </Shell>
    );
  }

  const timeRange = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  const header = `${booking.venueName} · คอร์ท ${booking.courtName} · ${timeRange.format(new Date(booking.startTime))}–${timeRange.format(new Date(booking.endTime))}`;

  if (booking.checkedInAt) {
    const checkedInTime = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date(booking.checkedInAt));
    return (
      <Shell title="เช็คอินแล้ว ✅">
        <p className="text-sm text-taupe">{header}</p>
        <p className="text-sm text-ink mt-3">เช็คอินเมื่อ {checkedInTime}</p>
      </Shell>
    );
  }

  if (!booking.active) {
    return (
      <Shell title="ยังไม่ถึงเวลาเช็คอิน">
        <p className="text-sm text-taupe">{header}</p>
        <p className="text-sm text-ink mt-3">
          เปิดใช้ QR เช็คอินได้ตั้งแต่ 1 ชั่วโมงก่อนเวลาใช้สนาม
        </p>
      </Shell>
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staffUrl = `${site}/${locale}/admin/checkin/${token}`;
  const qrDataUrl = await QRCode.toDataURL(staffUrl, { width: 480, margin: 1 });

  return (
    <Shell title="เช็คอินเข้าสนาม">
      <p className="text-sm text-taupe">{header}</p>
      <div className="mt-5 rounded-2xl border border-line bg-surface p-6 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR เช็คอิน" className="w-64 h-64" />
      </div>
      <p className="text-sm text-ink mt-4">แสดงหน้านี้ให้พนักงานสแกนตอนมาถึงสนาม</p>
      <p className="text-xs text-taupe mt-1">QR เดียวกันนี้ใช้สั่งเครื่องดื่ม/ของว่างได้ด้วย</p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bone">
      <main className="max-w-md mx-auto w-full px-5 py-8 text-center">
        <div className="font-display text-xl font-bold text-pine">PickleBall</div>
        <h1 className="font-display text-2xl font-bold text-ink mt-4">{title}</h1>
        {children}
      </main>
    </div>
  );
}
