"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, MapPin, Ticket, QrCode } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/admin/kit";
import type { MyBooking } from "@/lib/mock";

const statusTone: Record<
  MyBooking["status"],
  "green" | "amber" | "gray" | "red"
> = {
  confirmed: "green",
  pending: "amber",
  completed: "gray",
  cancelled: "red",
};

export function MyBookingsList({ bookings }: { bookings: MyBooking[] }) {
  const t = useTranslations();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const shown = bookings.filter((b) =>
    tab === "upcoming" ? b.upcoming : !b.upcoming,
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["upcoming", "past"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-sm px-4 py-2 rounded-full transition-colors cursor-pointer ${
              tab === k
                ? "bg-pine text-bone"
                : "border border-line text-ink hover:border-brass"
            }`}
          >
            {t(`myBookings.${k}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center text-taupe text-sm py-16 border border-line rounded-2xl bg-surface">
          {t("myBookings.empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl bg-surface border border-line p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-base text-pine leading-tight">
                    {b.venue}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-taupe mt-1 tnum">
                    <Ticket className="w-3.5 h-3.5" />
                    {b.id}
                  </div>
                </div>
                <Badge tone={statusTone[b.status]}>
                  {t(`myBookings.status.${b.status}`)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink mt-3">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pine" />
                  <span className="tnum">{b.date}</span>
                </span>
                <span className="tnum text-taupe">{b.time}</span>
                <span className="flex items-center gap-1.5 text-taupe">
                  <MapPin className="w-3.5 h-3.5" />
                  {t("booking.court", { name: b.court })}
                </span>
              </div>

              <div className="text-xs text-taupe mt-1.5">
                {b.type === "open_play"
                  ? `${t("booking.openPlay")} · ${b.level} · ${t("myBookings.seats", { count: b.seats ?? 1 })}`
                  : t("booking.private")}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                <div className="font-medium text-ink tnum">
                  ฿{b.amount.toLocaleString()}
                </div>
                <div className="flex gap-2">
                  {b.upcoming ? (
                    <>
                      {b.orderToken && (
                        <Link
                          href={`/order/${b.orderToken}`}
                          className="text-sm border border-line rounded-lg px-3 py-1.5 text-pine hover:border-brass transition-colors inline-flex items-center gap-1.5"
                        >
                          <QrCode className="w-4 h-4" />
                          สั่งของถึงคอร์ท
                        </Link>
                      )}
                      <button className="text-sm border border-line rounded-lg px-3 py-1.5 text-ink hover:border-brass transition-colors">
                        {t("myBookings.reschedule")}
                      </button>
                      <button className="text-sm border border-line rounded-lg px-3 py-1.5 text-clay hover:border-clay transition-colors">
                        {t("myBookings.cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      {b.rawId && ["confirmed", "completed"].includes(b.status) && (
                        <Link
                          href={`/receipt/b/${b.rawId}`}
                          className="text-sm border border-line rounded-lg px-3 py-1.5 text-ink hover:border-brass transition-colors"
                        >
                          ใบเสร็จ
                        </Link>
                      )}
                      <Link
                        href={`/venues/${b.venueId}`}
                        className="text-sm bg-pine text-bone rounded-lg px-3 py-1.5 hover:bg-pine-deep transition-colors"
                      >
                        {t("myBookings.rebook")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
