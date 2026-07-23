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
}: {
  venues: { id: string; name: string }[];
  venueId: string;
  months: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
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
        onChange={(e) => setParam("period", e.target.value)}
        className={selCls}
      >
        {PERIODS.map((p) => (
          <option key={p.v} value={p.v}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReportsExport({
  byMonth,
  byVenue,
  totals,
}: {
  byMonth: { label: string; value: number }[];
  byVenue: { venue: string; value: number }[];
  totals: {
    totalRevenue: number;
    totalBookings: number;
    avgPerBooking: number;
    refunds: number;
    posRevenue: number;
    totalOrders: number;
    grandTotal: number;
    vatAmount: number;
  };
}) {
  const download = () => {
    const rows: string[][] = [
      ["สรุป", ""],
      ["รายได้รวมทุกช่องทาง", String(totals.grandTotal)],
      ["รายได้ค่าจองสนาม", String(totals.totalRevenue)],
      ["รายได้ขายสินค้า (POS)", String(totals.posRevenue)],
      ["VAT 7% (รวมในราคา)", String(totals.vatAmount)],
      ["การจองทั้งหมด", String(totals.totalBookings)],
      ["ออเดอร์สินค้าทั้งหมด", String(totals.totalOrders)],
      ["ยอดเฉลี่ย/การจอง", String(totals.avgPerBooking)],
      ["ยอดคืนเงิน (เป็นเครดิต)", String(totals.refunds)],
      [],
      ["รายได้รายเดือน (บาท)", ""],
      ...byMonth.map((m) => [m.label, String(m.value)]),
      [],
      ["รายได้ตามสาขา (บาท)", ""],
      ...byVenue.map((v) => [v.venue, String(v.value)]),
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
