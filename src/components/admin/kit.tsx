import type { ReactNode } from "react";

type Tone = "green" | "amber" | "red" | "gray" | "brass" | "pine";

const toneClass: Record<Tone, string> = {
  green: "bg-lime-soft text-pine",
  amber: "bg-[#FAEEDA] text-[#854F0B]",
  red: "bg-clay-soft text-clay",
  gray: "bg-bone text-taupe",
  brass: "bg-bone text-brass",
  pine: "bg-pine text-bone",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] leading-none px-2.5 py-1 rounded-full ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export const bookingStatusMeta: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "ยืนยันแล้ว", tone: "green" },
  pending: { label: "รอดำเนินการ", tone: "amber" },
  completed: { label: "เสร็จสิ้น", tone: "gray" },
  cancelled: { label: "ยกเลิก", tone: "red" },
  no_show: { label: "ไม่มาตามนัด", tone: "red" },
};

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-taupe mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-taupe">{label}</span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-bone flex items-center justify-center text-pine">
            {icon}
          </span>
        )}
      </div>
      <div className="font-display text-2xl font-bold text-ink mt-2 tnum">
        {value}
      </div>
      {typeof delta === "number" && (
        <div
          className={`text-xs mt-1 tnum ${delta >= 0 ? "text-pine" : "text-clay"}`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% จากเดือนก่อน
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-surface border border-line ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          {title && (
            <h2 className="font-display text-base text-ink">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function BarChart({
  data,
  unit = "K",
}: {
  data: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value));
  const H = 150;
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-[11px] text-taupe tnum">
            {d.value}
            {unit}
          </div>
          <div
            className="w-full max-w-9 rounded-t-md bg-pine/85 hover:bg-pine transition-colors"
            style={{ height: `${Math.round((d.value / max) * H)}px` }}
          />
          <div className="text-[11px] text-taupe">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const stops = data
    .map((d) => {
      const start = (acc / total) * 100;
      acc += d.value;
      const end = (acc / total) * 100;
      return `${d.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative w-28 h-28 rounded-full shrink-0"
        style={{ background: `conic-gradient(${stops})` }}
      >
        <div className="absolute inset-[14px] rounded-full bg-surface" />
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="text-ink">{d.label}</span>
            <span className="text-taupe tnum">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
