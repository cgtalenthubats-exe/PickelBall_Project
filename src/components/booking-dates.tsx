"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { th, enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

const WEEKDAYS: Record<string, string[]> = {
  th: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function BookingDates({
  onDayChange,
}: {
  onDayChange?: (offset: number) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [showCal, setShowCal] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[68px] rounded-xl border border-line bg-surface/50" />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offsetOf = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return Math.round((x.getTime() - today.getTime()) / 86400000);
  };
  const pick = (d: Date) => {
    setSelected(d);
    onDayChange?.(offsetOf(d));
  };

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const labels = WEEKDAYS[locale] ?? WEEKDAYS.en;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-ink">
          {selected.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        <button
          onClick={() => setShowCal((v) => !v)}
          className={`flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
            showCal
              ? "bg-pine text-bone"
              : "text-pine border border-line hover:border-brass"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {t("sections.moreDates")}
        </button>
      </div>

      {showCal ? (
        <div className="rounded-2xl bg-surface border border-line p-2 inline-block">
          <Calendar
            mode="single"
            required
            selected={selected}
            onSelect={(d) => {
              if (d) {
                pick(d);
                setShowCal(false);
              }
            }}
            disabled={{ before: today }}
            locale={locale === "th" ? th : enUS}
          />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d, i) => {
            const active = sameDay(d, selected);
            return (
              <button
                key={i}
                onClick={() => pick(d)}
                className={`shrink-0 text-center rounded-xl px-3 py-2 transition-colors cursor-pointer ${
                  active
                    ? "bg-pine text-bone"
                    : "border border-line hover:border-brass"
                }`}
              >
                <div
                  className={`text-[11px] ${active ? "text-bone/80" : "text-taupe"}`}
                >
                  {labels[d.getDay()]}
                </div>
                <div className="text-base font-medium tnum">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
