"use client";

import { useState, useActionState } from "react";
import { updateTaxProfile } from "@/lib/receipt-actions";

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";

export function TaxProfileForm({
  taxName,
  taxId,
  taxAddress,
}: {
  taxName: string;
  taxId: string;
  taxAddress: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateTaxProfile, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-brass cursor-pointer print:hidden"
      >
        {taxName || taxId ? "แก้ไขข้อมูลใบกำกับภาษี" : "เพิ่มข้อมูลใบกำกับภาษี (ชื่อ/เลขผู้เสียภาษี)"}
      </button>
    );
  }
  return (
    <form action={action} className="mt-3 space-y-2 text-left print:hidden">
      <label className="block text-xs text-taupe">
        ชื่อ (บุคคล/บริษัท ตามใบกำกับภาษี)
        <input name="taxName" defaultValue={taxName} className={inp} />
      </label>
      <label className="block text-xs text-taupe">
        เลขประจำตัวผู้เสียภาษี
        <input name="taxId" defaultValue={taxId} className={inp} />
      </label>
      <label className="block text-xs text-taupe">
        ที่อยู่
        <textarea name="taxAddress" defaultValue={taxAddress} rows={2} className={inp} />
      </label>
      {state?.error && <p className="text-xs text-clay">{state.error}</p>}
      {state?.saved && <p className="text-xs text-pine">บันทึกแล้ว — รีเฟรชเพื่ออัปเดตใบเสร็จ</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-xs bg-pine text-bone rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-60"
        >
          {pending ? "..." : "บันทึก"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs border border-line rounded-lg px-3 py-1.5 text-taupe cursor-pointer"
        >
          ปิด
        </button>
      </div>
    </form>
  );
}
