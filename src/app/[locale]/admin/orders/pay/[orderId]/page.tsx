import QRCode from "qrcode";
import { createServiceClient } from "@/lib/supabase/service";

// Payment screen for a staff-created walk-in order. Staff opens this on
// their own screen right after building the cart; the actual QR here
// encodes the Stripe Checkout link, so the CUSTOMER scans it with their own
// phone to pay. Stripe also redirects back to this same URL (done/cancelled)
// on whichever device completed checkout — so, like the customer QR-order
// page, this route stays unauthenticated and only reveals this one order's
// status (keyed by an unguessable UUID), nothing else.
export default async function StaffOrderPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<{
    url?: string;
    counter?: string;
    paidByCredit?: string;
    done?: string;
    cancelled?: string;
  }>;
}) {
  const { orderId } = await params;
  const sp = await searchParams;

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("total, status, created_at")
    .eq("id", orderId)
    .single();
  const total = order ? Number(order.total) : null;

  if (sp.url) {
    const qrDataUrl = await QRCode.toDataURL(sp.url, { width: 480, margin: 1 });
    return (
      <Shell title="สแกนเพื่อชำระเงิน">
        {total !== null && (
          <p className="text-sm text-taupe tnum">ยอดชำระ ฿{total.toLocaleString()}</p>
        )}
        <div className="mt-5 rounded-2xl border border-line bg-surface p-6 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR ชำระเงิน" className="w-64 h-64" />
        </div>
        <p className="text-sm text-ink mt-4">ลูกค้าสแกนด้วยมือถือตัวเองเพื่อชำระเงิน</p>
        <p className="text-xs text-taupe mt-1">หรือส่งลิงก์นี้ให้ลูกค้ากดจ่ายก็ได้</p>
      </Shell>
    );
  }

  if (sp.counter) {
    return (
      <Shell title="รอชำระที่เคาน์เตอร์">
        {total !== null && (
          <p className="text-sm text-taupe tnum">ยอดชำระ ฿{total.toLocaleString()}</p>
        )}
        <p className="text-sm text-ink mt-3">
          ยังไม่ได้เชื่อมต่อ Stripe — รับเงินสด/โอนจากลูกค้าแล้วกดยืนยันรับชำระในหน้าคิวออเดอร์
        </p>
      </Shell>
    );
  }

  if (sp.paidByCredit) {
    return (
      <Shell title="ชำระด้วยเครดิตแล้ว ✅">
        {total !== null && (
          <p className="text-sm text-taupe tnum">ยอดชำระ ฿{total.toLocaleString()}</p>
        )}
        <p className="text-sm text-ink mt-3">
          เครดิตของลูกค้าครอบคลุมยอดทั้งหมด — ออเดอร์ชำระเรียบร้อย ส่งของได้เลย
        </p>
      </Shell>
    );
  }

  if (sp.done) {
    let txAt: string | null = null;
    if (order?.created_at) {
      txAt = new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }).format(new Date(order.created_at));
    }
    return (
      <Shell title="ชำระเงินสำเร็จ 🎉">
        {total !== null && (
          <p className="text-sm text-taupe tnum">ยอดชำระ ฿{total.toLocaleString()}</p>
        )}
        <p className="text-sm text-ink mt-3">ขอบคุณค่ะ — เดี๋ยวพนักงานนำของมาเสิร์ฟ</p>
        {txAt && <p className="text-[11px] text-taupe/70 mt-1 tnum">ชำระเมื่อ {txAt}</p>}
      </Shell>
    );
  }

  if (sp.cancelled) {
    return (
      <Shell title="ยกเลิกการชำระเงิน">
        <p className="text-sm text-ink mt-1">
          การชำระเงินถูกยกเลิก — แจ้งพนักงานเพื่อสร้างออเดอร์ใหม่ได้เลย
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="ไม่พบสถานะออเดอร์">
      <p className="text-sm text-taupe">ลิงก์นี้ไม่ถูกต้อง กรุณากลับไปที่หน้าคิวออเดอร์</p>
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
