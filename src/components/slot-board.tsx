"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Slot, SlotType } from "@/lib/mock";
import { SlotCard } from "./slot-card";

type Filter = "all" | SlotType;

export function SlotBoard({
  slots,
  venueId,
}: {
  slots: Slot[];
  venueId?: string;
}) {
  const t = useTranslations();
  const [filter, setFilter] = useState<Filter>("all");

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: t("filter.all") },
    { key: "private", label: t("filter.private") },
    { key: "open_play", label: t("filter.openPlay") },
  ];

  const shown = slots.filter((s) => filter === "all" || s.type === filter);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`text-[13px] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              filter === c.key
                ? "bg-pine text-bone"
                : "border border-line text-ink hover:border-brass"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {shown.map((s) => (
          <SlotCard key={s.id} slot={s} venueId={venueId} />
        ))}
      </div>
    </div>
  );
}
