import { Wallet, CalendarCheck, Percent, Users } from "lucide-react";
import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
  Badge,
  bookingStatusMeta,
} from "@/components/admin/kit";
import { getDashboard } from "@/lib/data/admin";

export default async function AdminDashboard() {
  const { kpis, revenueByMonth, revenueByType, recentBookings } =
    await getDashboard();
  return (
    <div>
      <PageTitle
        title="แดชบอร์ด"
        subtitle="ภาพรวมวันนี้ · ศุกร์ 4 กรกฎาคม 2026"
        action={
          <button className="text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors">
            เดือนนี้ ▾
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="รายได้วันนี้"
          value={`฿${kpis.revenueToday.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="การจองวันนี้"
          value={`${kpis.bookingsToday}`}
          icon={<CalendarCheck className="w-4 h-4" />}
        />
        <StatCard
          label="อัตราการใช้สนาม"
          value={`${kpis.occupancy}%`}
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard
          label="สมาชิกที่ใช้งาน"
          value={kpis.activeMembers.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <SectionCard title="รายได้ 6 เดือนล่าสุด" className="lg:col-span-2">
          <div className="p-5">
            <BarChart data={revenueByMonth} unit="฿" />
          </div>
        </SectionCard>
        <SectionCard title="สัดส่วนรายได้">
          <div className="p-5">
            <DonutChart data={revenueByType} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-3">
        <SectionCard
          title="การจองล่าสุด"
          action={
            <span className="text-xs text-brass cursor-pointer">ดูทั้งหมด</span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">รหัส</th>
                  <th className="font-normal px-3 py-2.5">ลูกค้า</th>
                  <th className="font-normal px-3 py-2.5">สาขา</th>
                  <th className="font-normal px-3 py-2.5">เวลา</th>
                  <th className="font-normal px-3 py-2.5">ประเภท</th>
                  <th className="font-normal px-3 py-2.5">สถานะ</th>
                  <th className="font-normal px-5 py-2.5 text-right">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-taupe">
                      ยังไม่มีการจอง
                    </td>
                  </tr>
                )}
                {recentBookings.map((b) => {
                  const s = bookingStatusMeta[b.status];
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-line last:border-0 hover:bg-bone/50"
                    >
                      <td className="px-5 py-3 tnum text-taupe">{b.id}</td>
                      <td className="px-3 py-3 text-ink">{b.customer}</td>
                      <td className="px-3 py-3 text-taupe">{b.venue}</td>
                      <td className="px-3 py-3 tnum text-taupe">
                        {b.date} {b.time}
                      </td>
                      <td className="px-3 py-3">
                        {b.type === "open_play" ? "Open Play" : "จองเหมา"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right tnum text-ink">
                        ฿{b.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
