"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

const PERIODS = [
  { v: "3", label: "3 เดือนล่าสุด" },
  { v: "6", label: "6 เดือนล่าสุด" },
  { v: "12", label: "12 เดือนล่าสุด" },
];

const selCls =
  "text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors cursor-pointer outline-none";

export function ReportsControls({
  venues,
  venueId,
  months,
  from,
  to,
}: {
  venues: { id: string; name: string }[];
  venueId: string;
  months: number;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const customRange = Boolean(from && to);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const clearRange = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select
        value={venueId}
        onChange={(e) => setParam("venue", e.target.value)}
        className={selCls}
      >
        <option value="">ทุกสาขา</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <select
        value={String(months)}
        onChange={(e) => {
          clearRange();
          setParam("period", e.target.value);
        }}
        disabled={customRange}
        className={`${selCls} disabled:opacity-50`}
      >
        {PERIODS.map((p) => (
          <option key={p.v} value={p.v}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="text-xs text-taupe">หรือช่วงเวลากำหนดเอง:</span>
      <input
        type="month"
        value={from}
        onChange={(e) => setParam("from", e.target.value)}
        className={selCls}
      />
      <span className="text-taupe text-sm">ถึง</span>
      <input
        type="month"
        value={to}
        onChange={(e) => setParam("to", e.target.value)}
        className={selCls}
      />
      {customRange && (
        <button onClick={clearRange} className="text-xs text-brass hover:underline cursor-pointer">
          ล้างช่วงเวลา
        </button>
      )}
    </div>
  );
}

interface RefundLogRow {
  type: "booking" | "order";
  refId: string;
  venue: string;
  customer: string;
  amount: number;
  note: string;
  by: string;
  at: string;
}

const REFUND_TYPE_LABEL: Record<string, string> = {
  booking: "จองสนาม",
  order: "ออเดอร์สินค้า",
};

export function ReportsExport({
  byMonth,
  byVenue,
  totals,
  refundLog,
  periodLabel,
  pnl,
  revenueByCategory,
  revenueByWeekday,
  revenueByHour,
  expensesByMonth,
}: {
  byMonth: { label: string; value: number }[];
  byVenue: { venue: string; value: number }[];
  totals: {
    totalRevenue: number;
    totalBookings: number;
    avgPerBooking: number;
    refunds: number;
    bookingRefunds: number;
    orderRefunds: number;
    posRevenue: number;
    totalOrders: number;
    grandTotal: number;
    vatAmount: number;
  };
  refundLog: RefundLogRow[];
  periodLabel: string;
  pnl: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    expensesByCategory: { label: string; value: number }[];
    netProfit: number;
  };
  revenueByCategory: { label: string; value: number }[];
  revenueByWeekday: { label: string; value: number }[];
  revenueByHour: { label: string; value: number }[];
  expensesByMonth: { label: string; value: number }[];
}) {
  const download = () => {
    const rows: string[][] = [
      ["สรุป", ""],
      ["ช่วงเวลา (สำหรับกราฟรายเดือน)", periodLabel],
      ["รายได้รวมทุกช่องทาง", String(totals.grandTotal)],
      ["รายได้ค่าจองสนาม", String(totals.totalRevenue)],
      ["รายได้ขายสินค้า (POS)", String(totals.posRevenue)],
      ["VAT 7% (รวมในราคา)", String(totals.vatAmount)],
      ["การจองทั้งหมด", String(totals.totalBookings)],
      ["ออเดอร์สินค้าทั้งหมด", String(totals.totalOrders)],
      ["ยอดเฉลี่ย/การจอง", String(totals.avgPerBooking)],
      ["ยอดคืนเงินรวม (เป็นเครดิต)", String(totals.refunds)],
      ["ยอดคืนเงิน — จองสนาม", String(totals.bookingRefunds)],
      ["ยอดคืนเงิน — ออเดอร์สินค้า", String(totals.orderRefunds)],
      [],
      ["งบกำไรขาดทุน (P&L)", ""],
      ["รายได้รวม", String(pnl.revenue)],
      ["ต้นทุนสินค้าขาย (COGS)", String(pnl.cogs)],
      ["กำไรขั้นต้น", String(pnl.grossProfit)],
      ["รายจ่ายรวม", String(pnl.totalExpenses)],
      ["กำไรสุทธิ", String(pnl.netProfit)],
      ...pnl.expensesByCategory.map((c) => [`  รายจ่าย — ${c.label}`, String(c.value)]),
      [],
      ["รายได้รายเดือน (บาท)", ""],
      ...byMonth.map((m) => [m.label, String(m.value)]),
      [],
      ["รายจ่ายรายเดือน (บาท)", ""],
      ...expensesByMonth.map((m) => [m.label, String(m.value)]),
      [],
      ["รายได้ตามสาขา (บาท)", ""],
      ...byVenue.map((v) => [v.venue, String(v.value)]),
      [],
      ["รายได้แยกตามประเภท (บาท)", ""],
      ...revenueByCategory.map((c) => [c.label, String(c.value)]),
      [],
      ["รายได้ตามวันในสัปดาห์ (บาท)", ""],
      ...revenueByWeekday.map((d) => [d.label, String(d.value)]),
      [],
      ["รายได้ตามช่วงเวลา (บาท)", ""],
      ...revenueByHour.map((h) => [h.label, String(h.value)]),
      [],
      ["รายการคืนเงิน — วันที่", "ประเภท", "ลูกค้า", "สาขา", "ยอดคืน", "ดำเนินการโดย", "หมายเหตุ"],
      ...refundLog.map((r) => [
        r.at,
        REFUND_TYPE_LABEL[r.type],
        r.customer,
        r.venue,
        String(r.amount),
        r.by,
        r.note,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    // BOM so Excel reads Thai UTF-8 correctly
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors cursor-pointer"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  );
}
