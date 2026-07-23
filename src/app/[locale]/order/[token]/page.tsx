import { setRequestLocale } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveOrderToken } from "@/lib/pos-order";
import { OrderMenu, type MenuItem } from "@/components/order-menu";

// Public QR-ordering page — no login. The token in the URL is the permission
// (validated + time-boxed server-side); friends in the group can use a
// shared/printed QR to order for the same booking.
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ done?: string; counter?: string; cancelled?: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const booking = await resolveOrderToken(token);

  if (!booking) {
    return (
      <Shell title="ไม่พบลิงก์สั่งซื้อ">
        <p className="text-sm text-taupe">
          ลิงก์ไม่ถูกต้อง หรืออาจถูกพิมพ์ผิด — สแกน QR จากหน้าการจองอีกครั้ง
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

  if (sp.done) {
    return (
      <Shell title="สั่งสำเร็จ 🎉">
        <p className="text-sm text-taupe">{header}</p>
        <p className="text-sm text-ink mt-3">
          {sp.counter
            ? "พนักงานได้รับออเดอร์แล้ว — ชำระเงินที่เคาน์เตอร์ได้เลย"
            : "ชำระเงินเรียบร้อย — เดี๋ยวของไปเสิร์ฟถึงคอร์ท"}
        </p>
        <a
          href={`/${locale}/order/${token}`}
          className="inline-block mt-5 text-sm text-brass"
        >
          สั่งเพิ่มอีกรอบ →
        </a>
      </Shell>
    );
  }

  if (!booking.active) {
    return (
      <Shell title="ลิงก์หมดอายุแล้ว">
        <p className="text-sm text-taupe">{header}</p>
        <p className="text-sm text-ink mt-3">
          QR สั่งของใช้ได้เฉพาะช่วงเวลาการจอง (ถึงหลังจบ 1 ชั่วโมง)
        </p>
      </Shell>
    );
  }

  // Menu of this venue with per-product stock so sold-out items grey out.
  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price, active")
    .eq("venue_id", booking.venueId)
    .eq("active", true)
    .order("name");
  const ids = (products ?? []).map((p) => p.id);
  const stock: Record<string, number> = {};
  if (ids.length) {
    const { data: ledger } = await supabase
      .from("stock_ledger")
      .select("product_id, change")
      .in("product_id", ids);
    (ledger ?? []).forEach((l) => {
      stock[l.product_id] = (stock[l.product_id] ?? 0) + l.change;
    });
  }
  const items: MenuItem[] = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    inStock: (stock[p.id] ?? 0) > 0,
  }));

  return (
    <Shell title="สั่งของถึงคอร์ท">
      <p className="text-sm text-taupe">{header}</p>
      {sp.cancelled && (
        <p className="text-sm text-clay mt-2">ยกเลิกการชำระเงิน — สั่งใหม่ได้เลย</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-taupe mt-6">สาขานี้ยังไม่มีเมนูขาย</p>
      ) : (
        <OrderMenu token={token} items={items} />
      )}
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bone">
      <main className="max-w-md mx-auto w-full px-5 py-8">
        <div className="font-display text-xl font-bold text-pine">PickleBall</div>
        <h1 className="font-display text-2xl font-bold text-ink mt-4">{title}</h1>
        {children}
      </main>
    </div>
  );
}
