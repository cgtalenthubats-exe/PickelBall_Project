"use client";

import { useState, useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/admin/kit";
import { createExpense, deleteExpense, EXPENSE_CATEGORIES } from "@/lib/expense-actions";
import type { ExpenseRow } from "@/lib/data/admin";

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brass";
const lbl = "text-xs text-taupe";
const btn =
  "text-sm bg-pine text-bone rounded-lg px-4 py-2 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60";
const btnGhost =
  "text-sm border border-line rounded-lg px-4 py-2 text-taupe hover:border-brass transition-colors cursor-pointer";

export function AddExpenseForm({
  venues,
  isSuperAdmin,
}: {
  venues: { id: string; name: string }[];
  isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createExpense, null);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btn}>
        <span className="inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> เพิ่มรายจ่าย
        </span>
      </button>
    );
  }
  return (
    <SectionCard title="เพิ่มรายจ่าย">
      <form action={action} className="p-5 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        {isSuperAdmin ? (
          <label className="text-sm md:col-span-2">
            <span className={lbl}>สาขา</span>
            <select name="venueId" required className={inp} defaultValue="">
              <option value="" disabled>
                เลือกสาขา
              </option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="venueId" value={venues[0]?.id ?? ""} />
        )}
        <label className="text-sm">
          <span className={lbl}>ประเภท</span>
          <select name="category" className={inp} defaultValue={EXPENSE_CATEGORIES[0].value}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={lbl}>จำนวนเงิน (฿)</span>
          <input name="amount" type="number" min={0} step="0.01" required className={inp} />
        </label>
        <label className="text-sm">
          <span className={lbl}>วันที่</span>
          <input
            name="expenseDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inp}
          />
        </label>
        <label className="text-sm">
          <span className={lbl}>เลขที่เอกสาร</span>
          <input name="docRef" className={inp} placeholder="INV-00123" />
        </label>
        <label className="text-sm">
          <span className={lbl}>ผู้รับเงิน/ร้าน</span>
          <input name="supplier" className={inp} />
        </label>
        <label className="text-sm md:col-span-4">
          <span className={lbl}>หมายเหตุ</span>
          <input name="note" className={inp} />
        </label>
        {state?.error && <p className="text-xs text-clay md:col-span-6">{state.error}</p>}
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" disabled={pending} className={btn}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
            ยกเลิก
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function DeleteExpenseButton({ id, venueId }: { id: string; venueId: string }) {
  const [, action, pending] = useActionState(deleteExpense, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="venueId" value={venueId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="ลบรายการ"
        className="text-taupe hover:text-clay transition-colors cursor-pointer disabled:opacity-60"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  return (
    <table className="w-full text-sm min-w-[820px]">
      <thead>
        <tr className="text-left text-taupe text-xs border-b border-line">
          <th className="font-normal px-5 py-3">วันที่</th>
          <th className="font-normal px-3 py-3">สาขา</th>
          <th className="font-normal px-3 py-3">ประเภท</th>
          <th className="font-normal px-3 py-3 text-right">จำนวนเงิน</th>
          <th className="font-normal px-3 py-3">เอกสาร/ผู้รับเงิน</th>
          <th className="font-normal px-3 py-3">หมายเหตุ</th>
          <th className="font-normal px-3 py-3">บันทึกโดย</th>
          <th className="font-normal px-5 py-3 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody>
        {expenses.length === 0 && (
          <tr>
            <td colSpan={8} className="px-5 py-10 text-center text-taupe">
              ยังไม่มีรายจ่าย
            </td>
          </tr>
        )}
        {expenses.map((e) => (
          <tr key={e.id} className="border-b border-line last:border-0">
            <td className="px-5 py-2.5 text-taupe tnum whitespace-nowrap">{e.date}</td>
            <td className="px-3 py-2.5 text-ink">{e.venueName}</td>
            <td className="px-3 py-2.5 text-ink">{e.categoryLabel}</td>
            <td className="px-3 py-2.5 text-right tnum text-clay">฿{e.amount.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-taupe text-xs">
              {e.docRef || e.supplier ? (
                <>
                  {e.docRef && <div className="tnum">{e.docRef}</div>}
                  {e.supplier && <div>{e.supplier}</div>}
                </>
              ) : (
                "—"
              )}
            </td>
            <td className="px-3 py-2.5 text-taupe">{e.note || "—"}</td>
            <td className="px-3 py-2.5 text-taupe">{e.by}</td>
            <td className="px-5 py-2.5 text-right">
              <DeleteExpenseButton id={e.id} venueId={e.venueId} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
