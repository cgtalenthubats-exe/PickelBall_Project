"use client";

import { useTranslations } from "next-intl";
import { Flame, Users, Lock, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Slot } from "@/lib/mock";

export function SlotCard({ slot, venueId }: { slot: Slot; venueId?: string }) {
  const t = useTranslations();
  const price = `฿${slot.price.toLocaleString()}`;
  const href =
    slot.status !== "available"
      ? undefined
      : (slot.href ??
        (venueId ? `/venues/${venueId}/book/${slot.id}` : undefined));

  const wrap = (inner: React.ReactNode) =>
    href ? (
      <Link href={href} className="block">
        {inner}
      </Link>
    ) : (
      inner
    );

  if (slot.status !== "available") {
    const isFull = slot.status === "full";
    return (
      <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center justify-between opacity-60">
        <div>
          <div className="font-medium text-[15px] tnum tracking-tight">
            {slot.start} – {slot.end}
          </div>
          <div className="text-xs text-taupe mt-0.5">
            {t("booking.court", { name: slot.court })}
          </div>
        </div>
        <span className="text-xs text-taupe flex items-center gap-1">
          {isFull ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Wrench className="w-3.5 h-3.5" />
          )}
          {isFull ? t("booking.full") : t("booking.maintenance")}
        </span>
      </div>
    );
  }

  if (slot.type === "open_play") {
    const left = (slot.capacity ?? 0) - (slot.taken ?? 0);
    const low = slot.capacity ? left / slot.capacity <= 0.25 : false;
    return wrap(
      <div className="rounded-r-xl border border-line border-l-[3px] border-l-pine bg-surface p-3.5 hover:border-pine transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-[15px] tnum tracking-tight">
              {slot.start} – {slot.end}
            </div>
            <div className="text-xs text-taupe mt-0.5">
              {t("booking.openPlay")} · {slot.level} ·{" "}
              {t("booking.court", { name: slot.court })}
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <div className="font-medium text-[15px] tnum">{price}</div>
            <div className="text-[11px] text-taupe">{t("booking.perPerson")}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full tnum flex items-center gap-1 ${
              low ? "bg-clay-soft text-clay" : "bg-lime-soft text-pine"
            }`}
          >
            {low ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <Users className="w-3.5 h-3.5" />
            )}
            {t("booking.spotsLeft", { left, total: slot.capacity ?? 0 })}
          </span>
          <span className="text-[13px] bg-pine text-bone rounded-[10px] px-4 py-1.5">
            {t("booking.book")}
          </span>
        </div>
      </div>,
    );
  }

  return wrap(
    <div className="rounded-r-xl border border-line border-l-[3px] border-l-brass bg-surface p-3.5 flex items-center justify-between hover:border-brass transition-colors">
      <div>
        <div className="font-medium text-[15px] tnum tracking-tight flex items-center gap-2">
          {slot.start} – {slot.end}
          {slot.peak && (
            <span className="text-[11px] text-brass bg-bone rounded-full px-2 py-0.5">
              {t("booking.peak")}
            </span>
          )}
        </div>
        <div className="text-xs text-taupe mt-0.5">
          {t("booking.private")} · {t("booking.court", { name: slot.court })}
        </div>
      </div>
      <div className="text-right shrink-0 pl-2">
        <span className="text-[11px] text-pine bg-lime-soft rounded-full px-2 py-0.5">
          {t("booking.available")}
        </span>
        <div className="font-medium text-sm tnum mt-1.5">
          {price}
          <span className="text-[11px] text-taupe font-normal">
            {t("booking.perHour")}
          </span>
        </div>
      </div>
    </div>,
  );
}
