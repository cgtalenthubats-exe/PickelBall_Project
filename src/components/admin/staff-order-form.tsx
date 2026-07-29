"use client";

import { useMemo, useState, useActionState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { createStaffOrder } from "@/lib/order-actions";

export interface StaffMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string | null;
  available: number;
}

export interface CourtOption {
  id: string;
  courtName: string;
  customer: string;
  time: string;
}

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";

export function StaffOrderForm({
  venueId,
  items,
  courts,
  defaultBookingId,
}: {
  venueId: string;
  items: StaffMenuItem[];
  courts: CourtOption[];
  defaultBookingId?: string;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState(createStaffOrder, null);

  const cart = useMemo(
    () => items.filter((i) => (qty[i.id] ?? 0) > 0).map((i) => ({ ...i, qty: qty[i.id] })),
    [items, qty],
  );
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const bump = (id: string, d: number, max: number) =>
    setQty((q) => ({ ...q, [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + d)) }));

  const grouped = useMemo(() => {
    const g = new Map<string, StaffMenuItem[]>();
    items.forEach((i) => g.set(i.category, [...(g.get(i.category) ?? []), i]));
    return [...g.entries()];
  }, [items]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="venueId" value={venueId} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(cart.map((c) => ({ id: c.id, qty: c.qty })))}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-taupe">
          ผูกกับสนาม (ไม่บังคับ)
          <select name="bookingId" className={inp} defaultValue={defaultBookingId ?? ""}>
            <option value="">ไม่ผูกกับสนาม (walk-in ซื้อของอย่างเดียว)</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                คอร์ท {c.courtName} · {c.time} · {c.customer}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-taupe">
          เบอร์โทรลูกค้า
          <input name="customerPhone" required placeholder="081-234-5678" className={inp} />
        </label>
        <label className="text-xs text-taupe col-span-2">
          ชื่อลูกค้า (ไม่บังคับ)
          <input name="customerName" placeholder="ชื่อเล่น/ชื่อจริง" className={inp} />
        </label>
      </div>

      {grouped.map(([cat, list]) => (
        <div key={cat}>
          <h3 className="text-xs font-medium text-taupe mb-1.5">{cat || "อื่นๆ"}</h3>
          <div className="space-y-1.5">
            {list.map((i) => (
              <div
                key={i.id}
                className={`flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 ${i.available === 0 ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-line" />
                  )}
                  <div>
                    <div className="text-sm text-ink">{i.name}</div>
                    <div className="text-xs text-taupe tnum">
                      ฿{i.price.toLocaleString()}
                      {i.available === 0 && " · ของหมด"}
                    </div>
                  </div>
                </div>
                {i.available > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bump(i.id, -1, i.available)}
                      className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-taupe hover:border-brass cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center tnum text-ink">{qty[i.id] ?? 0}</span>
                    <button
                      type="button"
                      onClick={() => bump(i.id, 1, i.available)}
                      disabled={(qty[i.id] ?? 0) >= i.available}
                      className="w-7 h-7 rounded-full bg-pine text-bone flex items-center justify-center hover:bg-pine-deep cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {state?.error && <p className="text-sm text-clay">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || cart.length === 0}
        className="w-full bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <ShoppingBag className="w-4 h-4" />
        {pending
          ? "กำลังสร้างออเดอร์..."
          : cart.length === 0
            ? "เลือกสินค้าก่อน"
            : `สร้างออเดอร์ ฿${total.toLocaleString()} → สร้าง QR ชำระเงิน`}
      </button>
    </form>
  );
}
