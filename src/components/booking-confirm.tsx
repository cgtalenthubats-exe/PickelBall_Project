"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Clock, MapPin, Check } from "lucide-react";
import type { Slot } from "@/lib/mock";
import type { Equipment } from "@/lib/admin-mock";

function Stepper({
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-ink hover:border-brass disabled:opacity-40 cursor-pointer"
        disabled={value <= min}
        aria-label="ลด"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-6 text-center tnum text-sm">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-ink hover:border-brass disabled:opacity-40 cursor-pointer"
        disabled={value >= max}
        aria-label="เพิ่ม"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function BookingConfirm({
  venueName,
  slot,
  addons,
}: {
  venueName: string;
  slot: Slot;
  addons: Equipment[];
}) {
  const t = useTranslations();
  const isOpen = slot.type === "open_play";
  const maxSeats = isOpen
    ? Math.max(1, (slot.capacity ?? 1) - (slot.taken ?? 0))
    : 1;

  const [seats, setSeats] = useState(1);
  const [qty, setQty] = useState<Record<string, number>>({});

  const paid = addons.filter((a) => !a.includedFree);
  const free = addons.filter((a) => a.includedFree);

  const base = isOpen ? slot.price * seats : slot.price;
  const addonTotal = paid.reduce((s, a) => s + (qty[a.id] ?? 0) * a.price, 0);
  const total = base + addonTotal;

  return (
    <div className="space-y-4">
      {/* Slot summary */}
      <div className="rounded-2xl bg-surface border border-line p-4">
        <div className="font-display text-lg text-pine">{venueName}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink mt-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-pine" />
            <span className="tnum">
              {slot.start} – {slot.end}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-taupe">
            <MapPin className="w-3.5 h-3.5" />
            {t("booking.court", { name: slot.court })}
          </span>
        </div>
        <div className="text-xs text-taupe mt-1.5">
          {isOpen
            ? `${t("booking.openPlay")} · ${slot.level}`
            : t("booking.private")}
        </div>

        {isOpen && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
            <span className="text-sm text-ink">{t("bookingFlow.seats")}</span>
            <Stepper value={seats} min={1} max={maxSeats} onChange={setSeats} />
          </div>
        )}
      </div>

      {/* Add-ons */}
      <div className="rounded-2xl bg-surface border border-line p-4">
        <div className="font-display text-base text-ink">
          {t("bookingFlow.addOns")}
        </div>
        <p className="text-xs text-taupe mt-0.5 mb-3">
          {t("bookingFlow.addOnsHint")}
        </p>

        <div className="space-y-2.5">
          {free.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-ink">
                <span className="w-6 h-6 rounded-lg bg-lime-soft text-pine flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {a.name}
              </span>
              <span className="text-xs text-pine bg-lime-soft rounded-full px-2.5 py-1">
                {t("bookingFlow.free")}
              </span>
            </div>
          ))}

          {paid.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <div className="text-ink">{a.name}</div>
                <div className="text-xs text-taupe tnum">
                  ฿{a.price} {t("booking.perHour")}
                </div>
              </div>
              <Stepper
                value={qty[a.id] ?? 0}
                max={a.stockPerSlot}
                onChange={(v) => setQty((q) => ({ ...q, [a.id]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-2xl bg-surface border border-line p-4">
        <div className="flex justify-between text-sm">
          <span className="text-taupe">
            {isOpen
              ? `${t("bookingFlow.seatFee")} × ${seats}`
              : t("bookingFlow.courtFee")}
          </span>
          <span className="tnum text-ink">฿{base.toLocaleString()}</span>
        </div>
        {paid
          .filter((a) => (qty[a.id] ?? 0) > 0)
          .map((a) => (
            <div key={a.id} className="flex justify-between text-sm mt-1.5">
              <span className="text-taupe">
                {a.name} × {qty[a.id]}
              </span>
              <span className="tnum text-ink">
                ฿{((qty[a.id] ?? 0) * a.price).toLocaleString()}
              </span>
            </div>
          ))}
        <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-line">
          <span className="font-medium text-ink">{t("bookingFlow.total")}</span>
          <span className="font-display text-2xl font-bold text-pine tnum">
            ฿{total.toLocaleString()}
          </span>
        </div>
      </div>

      <button className="w-full bg-pine text-bone rounded-xl py-3.5 font-medium hover:bg-pine-deep transition-colors cursor-pointer">
        {t("bookingFlow.proceed")}
      </button>
      <p className="text-xs text-taupe text-center">{t("bookingFlow.payNote")}</p>
    </div>
  );
}
