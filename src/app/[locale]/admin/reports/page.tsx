import { Download } from "lucide-react";
import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
} from "@/components/admin/kit";
import { getReports } from "@/lib/data/admin";

export default async function ReportsPage() {
  const {
    revenueByMonth,
    revenueByType,
    revenueByVenue,
    totalRevenue,
    totalBookings,
    avgPerBooking,
    refunds,
  } = await getReports();
  const maxVenue = Math.max(1, ...revenueByVenue.map((v) => v.value));

  return (
    <div>
      <PageTitle
        title="รายงาน"
        subtitle="สรุปรายได้และการใช้งาน · ก.พ. – ก.ค. 2026"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <button className="text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors">
          ทุกสาขา ▾
        </button>
        <button className="text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors">
          6 เดือนล่าสุด ▾
        </button>
        <button className="text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors">
          ทุกประเภท ▾
        </button>
      </div>

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
