import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
} from "@/components/admin/kit";
import { getReports, getDbVenues } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/authz";
import { ReportsControls, ReportsExport } from "@/components/admin/reports-controls";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; period?: string }>;
}) {
  await requireAdminPage("venue_manager");
  const sp = await searchParams;
  const venueId = sp.venue ?? "";
  const months = Number(sp.period ?? 6);

  const [report, venues] = await Promise.all([
    getReports({ venueId: venueId || undefined, months }),
    getDbVenues(),
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
  } = report;
  const maxVenue = Math.max(1, ...revenueByVenue.map((v) => v.value));

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
              posRevenue,
              totalOrders,
              grandTotal,
              vatAmount,
            }}
          />
        }
      />

      <ReportsControls
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        venueId={venueId}
        months={months}
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
    </div>
  );
}
