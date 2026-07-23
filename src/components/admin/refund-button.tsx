"use client";

import { useState, useActionState } from "react";
import { refundBooking, refundOrder } from "@/lib/admin-actions";

// Two-step refund (click → confirm) since it can't be undone from the UI.
export function RefundBookingButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(refundBooking, null);
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-clay hover:underline cursor-pointer"
      >
        คืนเงิน
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs bg-clay text-white rounded px-2 py-1 cursor-pointer disabled:opacity-60"
      >
        {pending ? "..." : "ยืนยันคืนเป็นเครดิต"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-taupe cursor-pointer"
      >
        ยกเลิก
      </button>
      {state?.error && <span className="text-xs text-clay">{state.error}</span>}
    </form>
  );
}

export function RefundOrderButton({
  id,
  venueId,
}: {
  id: string;
  venueId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(refundOrder, null);
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs border border-line rounded-lg px-3 py-1.5 text-clay hover:border-clay transition-colors cursor-pointer"
      >
        คืนเงิน
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="venueId" value={venueId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs bg-clay text-white rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-60"
      >
        {pending ? "..." : "ยืนยันคืนเครดิต+คืนสต็อก"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-taupe cursor-pointer"
      >
        ยกเลิก
      </button>
      {state?.error && <span className="text-xs text-clay">{state.error}</span>}
    </form>
  );
}
