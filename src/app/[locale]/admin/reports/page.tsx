import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
} from "@/components/admin/kit";
import { getReports, getDbVenues, getRefundLog } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/authz";
import { ReportsControls, ReportsExport } from "@/components/admin/reports-controls";

const REFUND_TYPE_LABEL: Record<string, string> = {
  booking: "จองสนาม",
  order: "ออเดอร์สินค้า",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; period?: string; from?: string; to?: string }>;
}) {
  await requireAdminPage("venue_manager");
  const sp = await searchParams;
  const venueId = sp.venue ?? "";
  const months = Number(sp.period ?? 6);
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const customRange = Boolean(from && to);

  const [report, venues, refundLog] = await Promise.all([
    getReports({
      venueId: venueId || undefined,
      months,
      from: customRange ? from : undefined,
      to: customRange ? to : undefined,
    }),
    getDbVenues(),
    getRefundLog(),
  ]);
  const {
    revenueByMonth,
    revenueByType,
    revenueByStream,
    revenueByVenue,
    totalRevenue,
    posRevenue,
    grandTotal,
    vatAmount,
    totalBookings,
    totalOrders,
    avgPerBooking,
    refunds,
    bookingRefunds,
    orderRefunds,
  } = report;
  const maxVenue = Math.max(1, ...revenueByVenue.map((v) => v.value));
  const periodLabel = customRange ? `${from} ถึง ${to}` : `${months} เดือนล่าสุด`;

  return (
    <div>
      <PageTitle
        title="รายงาน"
        subtitle="สรุปรายได้และการใช้งาน"
        action={
          <ReportsExport
            byMonth={revenueByMonth}
            byVenue={revenueByVenue}
            totals={{
              totalRevenue,
              totalBookings,
              avgPerBooking,
              refunds,
              bookingRefunds,
              orderRefunds,
              posRevenue,
              totalOrders,
              grandTotal,
              vatAmount,
            }}
            refundLog={refundLog}
            periodLabel={periodLabel}
          />
        }
      />

      <ReportsControls
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        venueId={venueId}
        months={months}
        from={from}
        to={to}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="รายได้รวมทุกช่องทาง" value={`฿${grandTotal.toLocaleString()}`} />
        <StatCard
          label="ค่าจองสนาม / ขายสินค้า"
          value={`฿${totalRevenue.toLocaleString()} / ฿${posRevenue.toLocaleString()}`}
        />
        <StatCard
          label="จำนวนจอง / ออเดอร์"
          value={`${totalBookings.toLocaleString()} / ${totalOrders.toLocaleString()}`}
        />
        <StatCard label="VAT 7% (รวมในราคา)" value={`฿${vatAmount.toLocaleString()}`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard label="ยอดเฉลี่ย/การจอง" value={`฿${avgPerBooking.toLocaleString()}`} />
        <StatCard label="ยอดคืนเงิน (เป็นเครดิต)" value={`฿${refunds.toLocaleString()}`} />
        <StatCard
          label="คืนเงิน — จองสนาม / ออเดอร์"
          value={`฿${bookingRefunds.toLocaleString()} / ฿${orderRefunds.toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <SectionCard title="รายได้รายเดือน — ค่าจองสนาม (บาท)" className="lg:col-span-2">
          <div className="p-5">
            <BarChart data={revenueByMonth} unit="฿" />
          </div>
        </SectionCard>
        <div className="space-y-3">
          <SectionCard title="สัดส่วน จองสนาม vs ขายสินค้า">
            <div className="p-5">
              <DonutChart data={revenueByStream} />
            </div>
          </SectionCard>
          <SectionCard title="สัดส่วนประเภทการจอง">
            <div className="p-5">
              <DonutChart data={revenueByType} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-3">
        <SectionCard title="รายได้ตามสาขา">
          <div className="p-5 space-y-4">
            {revenueByVenue.map((v) => (
              <div key={v.venue}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink">{v.venue}</span>
                  <span className="tnum text-taupe">
                    ฿{v.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-bone overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brass"
                    style={{ width: `${(v.value / maxVenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-3">
        <SectionCard title="รายการคืนเงินล่าสุด (ใครคืนให้ใคร ที่ไหน เมื่อไหร่)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">วันที่คืนเงิน</th>
                  <th className="font-normal px-3 py-2.5">ประเภท</th>
                  <th className="font-normal px-3 py-2.5">ลูกค้า</th>
                  <th className="font-normal px-3 py-2.5">สาขา</th>
                  <th className="font-normal px-3 py-2.5 text-right">ยอดคืน</th>
                  <th className="font-normal px-3 py-2.5">ดำเนินการโดย</th>
                  <th className="font-normal px-5 py-2.5">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {refundLog.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-taupe">
                      ยังไม่มีรายการคืนเงิน
                    </td>
                  </tr>
                )}
                {refundLog.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 tnum text-taupe">{r.at}</td>
                    <td className="px-3 py-2.5 text-ink">{REFUND_TYPE_LABEL[r.type]}</td>
                    <td className="px-3 py-2.5 text-ink">{r.customer}</td>
                    <td className="px-3 py-2.5 text-taupe">{r.venue}</td>
                    <td className="px-3 py-2.5 text-right tnum text-clay">
                      ฿{r.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-taupe">{r.by}</td>
                    <td className="px-5 py-2.5 text-taupe">{r.note || "—"}</td>
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
