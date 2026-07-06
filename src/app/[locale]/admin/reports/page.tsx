import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
} from "@/components/admin/kit";
import { getReports, getDbVenues } from "@/lib/data/admin";
import { ReportsControls, ReportsExport } from "@/components/admin/reports-controls";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; period?: string }>;
}) {
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
    revenueByVenue,
    totalRevenue,
    totalBookings,
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
            totals={{ totalRevenue, totalBookings, avgPerBooking, refunds }}
          />
        }
      />

      <ReportsControls
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        venueId={venueId}
        months={months}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="รายได้รวม" value={`฿${totalRevenue.toLocaleString()}`} />
        <StatCard label="การจองทั้งหมด" value={totalBookings.toLocaleString()} />
        <StatCard label="ยอดเฉลี่ย/การจอง" value={`฿${avgPerBooking.toLocaleString()}`} />
        <StatCard label="ยอดคืนเงิน" value={`฿${refunds.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <SectionCard title="รายได้รายเดือน (บาท)" className="lg:col-span-2">
          <div className="p-5">
            <BarChart data={revenueByMonth} unit="฿" />
          </div>
        </SectionCard>
        <SectionCard title="สัดส่วนรายได้ตามประเภท">
          <div className="p-5">
            <DonutChart data={revenueByType} />
          </div>
        </SectionCard>
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
