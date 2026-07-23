import { QrCode } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageTitle, SectionCard } from "@/components/admin/kit";
import { requireAdminPage } from "@/lib/authz";
import { getOrdersQueue, getTodayBookingsForQr } from "@/lib/data/orders";
import { OrdersQueue } from "@/components/admin/orders-queue";

export default async function OrdersPage() {
  await requireAdminPage("staff");
  const [orders, qrBookings] = await Promise.all([
    getOrdersQueue(),
    getTodayBookingsForQr(),
  ]);

  return (
    <div>
      <PageTitle
        title="ออเดอร์หน้าร้าน"
        subtitle="ลูกค้าสแกน QR จากการจองเพื่อสั่ง — จ่ายแล้วระบบตัดสต็อกให้อัตโนมัติ"
      />

      <OrdersQueue orders={orders} />

      <div className="mt-4">
        <SectionCard title="QR สั่งของ — การจองวันนี้ (ปริ้นให้ลูกค้าได้)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">เวลา</th>
                  <th className="font-normal px-3 py-2.5">คอร์ท</th>
                  <th className="font-normal px-3 py-2.5">ลูกค้า</th>
                  <th className="font-normal px-5 py-2.5 text-right">QR</th>
                </tr>
              </thead>
              <tbody>
                {qrBookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-taupe">
                      วันนี้ยังไม่มีการจองที่ยืนยันแล้ว
                    </td>
                  </tr>
                )}
                {qrBookings.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 tnum text-taupe">{b.time}</td>
                    <td className="px-3 py-2.5 text-ink">คอร์ท {b.courtName}</td>
                    <td className="px-3 py-2.5 text-ink">{b.customer}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Link
                        href={`/admin/orders/qr/${b.id}`}
                        className="inline-flex items-center gap-1 text-xs text-brass hover:text-pine transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" /> เปิด/ปริ้น QR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
