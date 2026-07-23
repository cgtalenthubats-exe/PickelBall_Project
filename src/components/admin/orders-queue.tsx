"use client";

import { useActionState } from "react";
import { Badge, SectionCard } from "@/components/admin/kit";
import {
  staffMarkOrderPaid,
  staffMarkOrderServed,
  staffCancelOrder,
} from "@/lib/order-actions";
import type { QueueOrder } from "@/lib/data/orders";

const btn =
  "text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-60";

function OrderCard({ o }: { o: QueueOrder }) {
  const [paidState, paidAction, paidPending] = useActionState(staffMarkOrderPaid, null);
  const [servedState, servedAction, servedPending] = useActionState(staffMarkOrderServed, null);
  const [cancelState, cancelAction, cancelPending] = useActionState(staffCancelOrder, null);
  const err = paidState?.error ?? servedState?.error ?? cancelState?.error;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-ink font-medium">
            คอร์ท {o.courtName} · {o.ordererName}
          </div>
          <div className="text-xs text-taupe mt-0.5 tnum">
            {o.at} · {o.venueName}
          </div>
        </div>
        <Badge
          tone={
            o.status === "pending_payment"
              ? "amber"
              : o.status === "paid"
                ? "green"
                : "gray"
          }
        >
          {o.status === "pending_payment"
            ? "รอชำระ"
            : o.status === "paid"
              ? "จ่ายแล้ว รอเสิร์ฟ"
              : o.status === "served"
                ? "เสิร์ฟแล้ว"
                : o.status}
        </Badge>
      </div>

      <ul className="mt-3 space-y-1">
        {o.items.map((i, idx) => (
          <li key={idx} className="flex justify-between text-sm">
            <span className="text-ink">
              {i.name} × {i.qty}
            </span>
            <span className="text-taupe tnum">฿{(i.price * i.qty).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="text-xs text-taupe mt-2">หมายเหตุ: {o.note}</p>}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <div className="text-sm font-medium text-ink tnum">
          รวม ฿{o.total.toLocaleString()}
        </div>
        <div className="flex gap-2">
          {o.status === "pending_payment" && (
            <>
              <form action={paidAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="venueId" value={o.venueId} />
                <button
                  type="submit"
                  disabled={paidPending}
                  className={`${btn} bg-pine text-bone hover:bg-pine-deep`}
                >
                  {paidPending ? "..." : "รับชำระแล้ว"}
                </button>
              </form>
              <form action={cancelAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="venueId" value={o.venueId} />
                <button
                  type="submit"
                  disabled={cancelPending}
                  className={`${btn} border border-line text-clay hover:border-clay`}
                >
                  ยกเลิก
                </button>
              </form>
            </>
          )}
          {o.status === "paid" && (
            <form action={servedAction}>
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="venueId" value={o.venueId} />
              <button
                type="submit"
                disabled={servedPending}
                className={`${btn} bg-brass text-white hover:opacity-90`}
              >
                {servedPending ? "..." : "เสิร์ฟแล้ว ✓"}
              </button>
            </form>
          )}
        </div>
      </div>
      {err && <p className="text-xs text-clay mt-2">{err}</p>}
    </div>
  );
}

export function OrdersQueue({ orders }: { orders: QueueOrder[] }) {
  const waiting = orders.filter((o) => o.status === "pending_payment");
  const toServe = orders.filter((o) => o.status === "paid");
  const done = orders.filter((o) => ["served", "refunded"].includes(o.status));

  return (
    <div className="space-y-4">
      <SectionCard title={`รอชำระ (${waiting.length})`}>
        <div className="p-4 grid gap-3 md:grid-cols-2">
          {waiting.length === 0 && (
            <p className="text-sm text-taupe col-span-2">ไม่มีออเดอร์รอชำระ</p>
          )}
          {waiting.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title={`จ่ายแล้ว รอเสิร์ฟ (${toServe.length})`}>
        <div className="p-4 grid gap-3 md:grid-cols-2">
          {toServe.length === 0 && (
            <p className="text-sm text-taupe col-span-2">ไม่มีออเดอร์ค้างเสิร์ฟ</p>
          )}
          {toServe.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title={`เสิร์ฟแล้ววันนี้ (${done.length})`}>
        <div className="p-4 grid gap-3 md:grid-cols-2">
          {done.length === 0 && (
            <p className="text-sm text-taupe col-span-2">ยังไม่มี</p>
          )}
          {done.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
