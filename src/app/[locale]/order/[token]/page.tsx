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
  searchParams: Promise<{
    done?: string;
    counter?: string;
    cancelled?: string;
    oid?: string;
  }>;
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
        <div className="mt-5 flex flex-col gap-2">
          {sp.oid && !sp.counter && (
            <a
              href={`/${locale}/receipt/o/${sp.oid}`}
              className="text-sm text-taupe underline"
            >
              ดูใบเสร็จ (ต้องล็อกอินบัญชีที่สั่ง)
            </a>
          )}
          <a href={`/${locale}/order/${token}`} className="text-sm text-brass">
            สั่งเพิ่มอีกรอบ →
          </a>
        </div>
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
    .select("id, name, category, price, active, image_url, safety_stock")
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
  // Sellable = balance - safety buffer; that's the max the customer may order.
  const items: MenuItem[] = (products ?? []).map((p) => {
    const sellable =
      (stock[p.id] ?? 0) -
      ((p as { safety_stock: number | null }).safety_stock ?? 0);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      inStock: sellable > 0,
      available: Math.max(0, sellable),
      imageUrl: (p as { image_url: string | null }).image_url ?? null,
    };
  });

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
