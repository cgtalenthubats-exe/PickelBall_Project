"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { checkInBooking } from "@/lib/admin-actions";

export function CheckinConfirmButton({ id, token }: { id: string; token: string }) {
  const [state, action, pending] = useActionState(checkInBooking, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
      >
        <CheckCircle2 className="w-4 h-4" />
        {pending ? "กำลังเช็คอิน…" : "ยืนยันเช็คอิน"}
      </button>
      {state?.error && <p className="text-sm text-clay text-center mt-2">{state.error}</p>}
    </form>
  );
}
