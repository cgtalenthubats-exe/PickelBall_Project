"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Clock, MapPin, Users, CheckCircle2 } from "lucide-react";
import { joinWaitlist } from "@/lib/booking-actions";

interface Display {
  venueName: string;
  start: string;
  end: string;
  court: string;
  level: string | null;
  capacity: number;
}

export function WaitlistJoin({
  display,
  sessionId,
}: {
  display: Display;
  sessionId: string;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(joinWaitlist, null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface border border-line p-4">
        <div className="font-display text-lg text-pine">{display.venueName}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink mt-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-pine" />
            <span className="tnum">
              {display.start} – {display.end}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-taupe">
            <MapPin className="w-3.5 h-3.5" />
            {t("booking.court", { name: display.court })}
          </span>
        </div>
        <div className="text-xs text-taupe mt-1.5">
          {t("booking.openPlay")} · {display.level}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-clay mt-3 pt-3 border-t border-line">
          <Users className="w-4 h-4" />
          {t("bookingFlow.sessionFull", { count: display.capacity })}
        </div>
      </div>

      {state?.joined ? (
        <div className="rounded-2xl bg-lime-soft border border-line p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-pine flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-ink">
              {t("bookingFlow.waitlistJoined")}
            </div>
            <p className="text-sm text-taupe mt-1">
              {t("bookingFlow.waitlistJoinedHint")}
            </p>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          {state?.error && (
            <p className="text-sm text-clay text-center">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-pine text-bone rounded-xl py-3.5 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            {pending ? t("bookingFlow.joiningWaitlist") : t("bookingFlow.joinWaitlist")}
          </button>
          <p className="text-xs text-taupe text-center">
            {t("bookingFlow.waitlistNote")}
          </p>
        </form>
      )}
    </div>
  );
}
