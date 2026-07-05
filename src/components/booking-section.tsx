"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookingDates } from "./booking-dates";
import { SlotBoard } from "./slot-board";
import { bkkYMD } from "@/lib/fmt";
import type { Slot } from "@/lib/mock";
import type { CustomerVenue } from "@/lib/data/customer";

function ymdLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

export function BookingSection({ venue }: { venue: CustomerVenue }) {
  const t = useTranslations();
  const [date, setDate] = useState<Date>(() => new Date());
  const ymd = ymdLocal(date);
  const court0 = venue.courts[0];

  const daySessions = venue.sessions.filter(
    (s) => bkkYMD(s.startTime) === ymd,
  );

  // open-play slots from real sessions
  const openSlots: Slot[] = daySessions.map((s) => {
    const start = hhmm(s.startTime);
    const end = hhmm(s.endTime);
    const full = s.taken >= s.capacity || s.status === "full";
    return {
      id: `op-${s.id}`,
      type: "open_play",
      start,
      end,
      court: s.courtName,
      price: s.pricePerPerson,
      status: full ? "full" : "available",
      level: s.skillLevel ?? "All Level",
      capacity: s.capacity,
      taken: s.taken,
      href: `/venues/${venue.slug}/book?type=open_play&venueId=${venue.id}&sessionId=${s.id}`,
    };
  });

  // private slots hourly on the first court, skipping hours a session occupies
  const privateSlots: Slot[] = [];
  if (court0) {
    const busy = daySessions
      .filter((s) => s.courtId === court0.id)
      .map((s) => [parseInt(hhmm(s.startTime)), parseInt(hhmm(s.endTime))]);
    for (let h = 8; h <= 19; h++) {
      if (busy.some(([a, b]) => h < b && h + 1 > a)) continue;
      const peak = h >= 17;
      const price = peak ? 500 : 400;
      const start = `${String(h).padStart(2, "0")}:00`;
      const end = `${String(h + 1).padStart(2, "0")}:00`;
      privateSlots.push({
        id: `pv-${ymd}-${start}`,
        type: "private",
        start,
        end,
        court: court0.name,
        price,
        peak,
        status: "available",
        href: `/venues/${venue.slug}/book?type=private&venueId=${venue.id}&courtId=${court0.id}&courtName=${encodeURIComponent(court0.name)}&date=${ymd}&start=${start}&end=${end}&price=${price}`,
      });
    }
  }

  const slots = [...openSlots, ...privateSlots].sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return (
    <div>
      <h2 className="font-display text-lg text-ink mb-2">
        {t("sections.chooseDate")}
      </h2>
      <BookingDates onChange={setDate} />

      <h2 className="font-display text-lg text-ink mt-6 mb-1">
        {t("sections.chooseSlot")}
      </h2>
      <div className="flex gap-4 text-xs text-taupe mb-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-brass inline-block" />
          {t("booking.legend.private")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-pine inline-block" />
          {t("booking.legend.openPlay")}
        </span>
      </div>

      {slots.length === 0 ? (
        <div className="text-center text-taupe text-sm py-12 border border-line rounded-2xl bg-surface">
          ยังไม่มีรอบว่างในวันนี้
        </div>
      ) : (
        <SlotBoard slots={slots} />
      )}
    </div>
  );
}
