"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { BookingDates } from "./booking-dates";
import { SlotCard } from "./slot-card";
import { Link } from "@/i18n/navigation";
import { bkkYMD } from "@/lib/fmt";
import type { Slot } from "@/lib/mock";
import type { CustomerVenue } from "@/lib/data/customer";

const OPEN_MIN = 8 * 60; // 08:00
const CLOSE_MIN = 22 * 60; // 22:00
const STEP = 30; // 30-minute grid
const PEAK_FROM = 17 * 60; // 17:00
const RATE_OFF = 400;
const RATE_PEAK = 500;
const DURATIONS = [60, 90, 120] as const;

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
const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

interface TimeBlock {
  start: string;
  end: string;
  peak: boolean;
  price: number;
  disabled: boolean;
}

export function BookingSection({ venue }: { venue: CustomerVenue }) {
  const t = useTranslations();
  const [date, setDate] = useState<Date>(() => new Date());
  const [duration, setDuration] = useState<number>(60);
  const ymd = ymdLocal(date);
  const court0 = venue.courts[0];

  const daySessions = useMemo(
    () => venue.sessions.filter((s) => bkkYMD(s.startTime) === ymd),
    [venue.sessions, ymd],
  );

  // Open-play slots (fixed sessions — shown as their own cards below).
  const openSlots: Slot[] = daySessions.map((s) => {
    const full = s.taken >= s.capacity || s.status === "full";
    return {
      id: `op-${s.id}`,
      type: "open_play",
      start: hhmm(s.startTime),
      end: hhmm(s.endTime),
      court: s.courtName,
      price: s.pricePerPerson,
      status: full ? "full" : "available",
      level: s.skillLevel ?? "All Level",
      capacity: s.capacity,
      taken: s.taken,
      href: `/venues/${venue.slug}/book?type=open_play&venueId=${venue.id}&sessionId=${s.id}`,
    };
  });

  // Private start-time grid for the chosen duration.
  const blocks: TimeBlock[] = useMemo(() => {
    if (!court0) return [];
    const busy = daySessions
      .filter((s) => s.courtId === court0.id)
      .map((s) => [toMin(hhmm(s.startTime)), toMin(hhmm(s.endTime))]);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const out: TimeBlock[] = [];
    for (let start = OPEN_MIN; start + duration <= CLOSE_MIN; start += STEP) {
      const end = start + duration;
      const peak = start >= PEAK_FROM;
      const price = Math.round(((peak ? RATE_PEAK : RATE_OFF) * duration) / 60);
      const overlaps = busy.some(([a, b]) => start < b && end > a);
      const past = isToday && start <= nowMin;
      out.push({
        start: fromMin(start),
        end: fromMin(end),
        peak,
        price,
        disabled: overlaps || past,
      });
    }
    return out;
  }, [court0, daySessions, duration, date]);

  const hasFree = blocks.some((b) => !b.disabled);

  return (
    <div>
      <h2 className="font-display text-lg text-ink mb-2">
        {t("sections.chooseDate")}
      </h2>
      <BookingDates onChange={setDate} />

      {/* Duration */}
      <h2 className="font-display text-lg text-ink mt-6 mb-2">
        {t("sections.chooseDuration")}
      </h2>
      <div className="flex gap-2">
        {DURATIONS.map((d) => {
          const active = duration === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              aria-pressed={active}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-pine text-bone"
                  : "border border-line text-ink hover:border-brass"
              }`}
            >
              {d} {t("booking.min")}
            </button>
          );
        })}
      </div>

      {/* Private time grid */}
      <div className="flex items-baseline justify-between mt-6 mb-2">
        <h2 className="font-display text-lg text-ink">
          {t("booking.private")}
        </h2>
        <span className="text-[11px] text-taupe tnum">
          {t("booking.priceHint")}
        </span>
      </div>
      {court0 && hasFree ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {blocks.map((b) => {
            const label = (
              <>
                {b.start}
                {b.peak && (
                  <Flame className="absolute top-1 right-1 w-3 h-3 text-brass" />
                )}
              </>
            );
            const base =
              "relative rounded-lg py-2.5 text-[13px] tnum text-center transition-colors";
            if (b.disabled) {
              return (
                <div
                  key={b.start}
                  aria-disabled
                  className={`${base} border border-line text-taupe/40 line-through`}
                >
                  {b.start}
                </div>
              );
            }
            const href = `/venues/${venue.slug}/book?type=private&venueId=${venue.id}&courtId=${court0.id}&courtName=${encodeURIComponent(court0.name)}&date=${ymd}&start=${b.start}&end=${b.end}&price=${b.price}`;
            return (
              <Link
                key={b.start}
                href={href}
                className={`${base} border border-line text-ink hover:border-pine hover:bg-lime-soft cursor-pointer`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-taupe text-sm py-8 border border-line rounded-2xl bg-surface">
          {t("booking.noSlots")}
        </div>
      )}

      {/* Open Play */}
      {openSlots.length > 0 && (
        <>
          <h2 className="font-display text-lg text-ink mt-8 mb-1">
            {t("booking.openPlayTitle")}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-taupe mb-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-pine inline-block" />
            {t("booking.legend.openPlay")}
          </div>
          <div className="space-y-2">
            {openSlots.map((s) => (
              <SlotCard key={s.id} slot={s} venueId={venue.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
