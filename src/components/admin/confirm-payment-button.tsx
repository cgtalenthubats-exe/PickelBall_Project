"use client";

import { useActionState } from "react";
import { confirmOnsitePayment } from "@/lib/admin-actions";

export function ConfirmPaymentButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(confirmOnsitePayment, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-brass hover:text-pine transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "กำลังยืนยัน…" : "ยืนยันชำระแล้ว"}
      </button>
      {state?.error && (
        <p className="text-[10px] text-clay mt-0.5">{state.error}</p>
      )}
    </form>
  );
}
