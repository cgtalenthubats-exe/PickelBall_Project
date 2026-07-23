"use client";

import { useMemo, useState, useActionState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { placeOrder } from "@/lib/order-actions";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const CAT_LABEL: Record<string, string> = {
  drink: "เครื่องดื่ม",
  food: "อาหาร/ของว่าง",
  gear: "อุปกรณ์/สินค้ากีฬา",
  other: "อื่นๆ",
};

export function OrderMenu({
  token,
  items,
}: {
  token: string;
  items: MenuItem[];
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState(placeOrder, null);

  const cart = useMemo(
    () =>
      items
        .filter((i) => (qty[i.id] ?? 0) > 0)
        .map((i) => ({ ...i, qty: qty[i.id] })),
    [items, qty],
  );
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const grouped = useMemo(() => {
    const g = new Map<string, MenuItem[]>();
    items.forEach((i) => {
      g.set(i.category, [...(g.get(i.category) ?? []), i]);
    });
    return [...g.entries()];
  }, [items]);

  const bump = (id: string, d: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));

  return (
    <div className="pb-32">
      {grouped.map(([cat, list]) => (
        <section key={cat} className="mt-6">
          <h2 className="text-sm font-medium text-taupe mb-2">
            {CAT_LABEL[cat] ?? cat}
          </h2>
          <div className="space-y-2">
            {list.map((i) => (
              <div
                key={i.id}
                className={`flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 ${!i.inStock ? "opacity-50" : ""}`}
              >
                <div>
                  <div className="text-sm text-ink">{i.name}</div>
                  <div className="text-xs text-taupe tnum">
                    ฿{i.price.toLocaleString()}
                    {!i.inStock && " · ของหมด"}
                  </div>
                </div>
                {i.inStock && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => bump(i.id, -1)}
                      aria-label="ลด"
                      className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-taupe hover:border-brass cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-5 text-center tnum text-ink">
                      {qty[i.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => bump(i.id, 1)}
                      aria-label="เพิ่ม"
                      className="w-8 h-8 rounded-full bg-pine text-bone flex items-center justify-center hover:bg-pine-deep cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* sticky checkout bar */}
      <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-line p-4">
        <form action={action} className="max-w-md mx-auto space-y-2">
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(cart.map((c) => ({ id: c.id, qty: c.qty })))}
          />
          <input
            name="ordererName"
            placeholder="ชื่อคนสั่ง (เช่น พี่เอ คอร์ท B)"
            className="w-full rounded-xl border border-line bg-bone px-3 py-2.5 text-sm text-ink outline-none focus:border-brass placeholder:text-taupe/60"
          />
          {state?.error && <p className="text-sm text-clay">{state.error}</p>}
          <button
            type="submit"
            disabled={pending || cart.length === 0}
            className="w-full bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            {pending
              ? "กำลังสั่ง..."
              : cart.length === 0
                ? "เลือกสินค้าก่อน"
                : `สั่งและชำระเงิน ฿${total.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}
