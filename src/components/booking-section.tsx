"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookingDates } from "./booking-dates";
import { SlotBoard } from "./slot-board";
import { varyAvailability, type Venue } from "@/lib/mock";

export function BookingSection({ venue }: { venue: Venue }) {
  const t = useTranslations();
  const [dayOffset, setDayOffset] = useState(0);
  const slots = varyAvailability(venue.slots, dayOffset);

  return (
    <div>
      <h2 className="font-display text-lg text-ink mb-2">
        {t("sections.chooseDate")}
      </h2>
      <BookingDates onDayChange={setDayOffset} />

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

      <SlotBoard slots={slots} venueId={venue.id} />
    </div>
  );
}
