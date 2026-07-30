import { Wallet, CalendarCheck, Percent, Users } from "lucide-react";
import {
  PageTitle,
  StatCard,
  SectionCard,
  BarChart,
  DonutChart,
  Badge,
  activityStatusMeta,
} from "@/components/admin/kit";
import { Link } from "@/i18n/navigation";
import { getDashboard } from "@/lib/data/admin";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { RefundBookingButton, RefundOrderButton } from "@/components/admin/refund-button";
import { DashboardDatePicker } from "@/components/admin/dashboard-date-picker";
import { requireAdminPage } from "@/lib/authz";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await requireAdminPage("staff");
  const canRefund = ctx.role !== "staff";
  const sp = await searchParams;
  const {
    selectedDate,
    kpis,
    revenueByMonth,
    revenueByType,
    dailyRevenueByCategory,
    dailyRevenueByHour,
    recentActivity,
  } = await getDashboard({ date: sp.date });
  const isToday = selectedDate === new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div>
      <PageTitle
        title="แดชบอร์ด"
        subtitle={`${isToday ? "ภาพรวมวันนี้" : "ภาพรวมวันที่เลือก"} · ${new Intl.DateTimeFormat("th-TH", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Bangkok",
        }).format(new Date(`${selectedDate}T12:00:00+07:00`))}`}
        action={<DashboardDatePicker date={selectedDate} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`รายได้${isToday ? "วันนี้" : "วันที่เลือก"} (สนาม + สินค้า)`}
          value={`฿${kpis.revenueToday.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="จองสนาม / ออเดอร์สินค้า"
          value={`${kpis.bookingsToday} / ${kpis.ordersToday}`}
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
        <SectionCard title="รายได้ 6 เดือนล่าสุด (สนาม + สินค้า)" className="lg:col-span-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <SectionCard
          title={`รายได้ตามช่วงเวลา — ${isToday ? "วันนี้" : "วันที่เลือก"} (08:00-21:00)`}
          className="lg:col-span-2"
        >
          <div className="p-5">
            <BarChart data={dailyRevenueByHour} unit="฿" />
          </div>
        </SectionCard>
        <SectionCard title={`รายได้แยกตามประเภท — ${isToday ? "วันนี้" : "วันที่เลือก"}`}>
          <div className="p-5">
            <DonutChart data={dailyRevenueByCategory} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-3">
        <SectionCard
          title="ธุรกรรมล่าสุด (จองสนาม + ออเดอร์สินค้า)"
          action={
            <Link href="/admin/reports" className="text-xs text-brass hover:underline">
              ดูรายงานทั้งหมด
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">รหัส</th>
                  <th className="font-normal px-3 py-2.5">ประเภท</th>
                  <th className="font-normal px-3 py-2.5">ลูกค้า</th>
                  <th className="font-normal px-3 py-2.5">สาขา</th>
                  <th className="font-normal px-3 py-2.5">ทำรายการเมื่อ</th>
                  <th className="font-normal px-3 py-2.5">ใช้บริการ</th>
                  <th className="font-normal px-3 py-2.5">ช่องทาง</th>
                  <th className="font-normal px-3 py-2.5">สถานะ</th>
                  <th className="font-normal px-3 py-2.5 text-right">ยอด</th>
                  <th className="font-normal px-5 py-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-taupe">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
                {recentActivity.map((a) => {
                  const s = activityStatusMeta[a.status] ?? { label: a.status, tone: "gray" as const };
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-line last:border-0 hover:bg-bone/50"
                    >
                      <td className="px-5 py-3 tnum text-taupe">{a.id}</td>
                      <td className="px-3 py-3 text-ink">{a.typeLabel}</td>
                      <td className="px-3 py-3 text-ink">{a.customer}</td>
                      <td className="px-3 py-3 text-taupe">{a.venue}</td>
                      <td className="px-3 py-3 tnum text-taupe whitespace-nowrap">
                        {a.transactedAt}
                      </td>
                      <td className="px-3 py-3 tnum text-taupe whitespace-nowrap">
                        {a.serviceLabel}
                      </td>
                      <td className="px-3 py-3 text-taupe whitespace-nowrap">{a.channel}</td>
                      <td className="px-3 py-3">
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right tnum text-ink">
                        ฿{a.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {a.kind === "booking" && a.status === "pending" && (
                          <ConfirmPaymentButton id={a.rawId} />
                        )}
                        {a.kind === "booking" && ["confirmed", "completed"].includes(a.status) && (
                          <span className="inline-flex items-center gap-3">
                            <Link
                              href={`/receipt/b/${a.rawId}`}
                              className="text-xs text-brass hover:underline"
                            >
                              ใบเสร็จ
                            </Link>
                            {canRefund && <RefundBookingButton id={a.rawId} />}
                          </span>
                        )}
                        {a.kind === "order" && ["pending_payment", "paid"].includes(a.status) && (
                          <Link
                            href="/admin/orders"
                            className="text-xs text-brass hover:underline"
                          >
                            ไปที่คิวออเดอร์ →
                          </Link>
                        )}
                        {a.kind === "order" && a.status === "served" && (
                          <span className="inline-flex items-center gap-3">
                            <Link
                              href={`/receipt/o/${a.rawId}`}
                              className="text-xs text-brass hover:underline"
                            >
                              ใบเสร็จ
                            </Link>
                            {canRefund && <RefundOrderButton id={a.rawId} venueId={a.venueId} />}
                          </span>
                        )}
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
