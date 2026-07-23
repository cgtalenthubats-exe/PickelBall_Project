"use client";

import { useState, useActionState } from "react";
import { Pencil, PackagePlus, Plus, ImagePlus } from "lucide-react";
import { Badge, SectionCard } from "@/components/admin/kit";
import {
  createProduct,
  updateProduct,
  recordStockMove,
} from "@/lib/erp-actions";
import type { ProductRow } from "@/lib/data/erp";
import type { SimpleVenue } from "@/components/admin/add-forms";

const inp =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brass";
const btn =
  "text-sm bg-pine text-bone rounded-lg px-4 py-2 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60";
const btnGhost =
  "text-sm border border-line rounded-lg px-4 py-2 text-taupe hover:border-brass transition-colors cursor-pointer";

// Base suggestions — managers can type any category they like; these just
// seed the datalist so common names stay consistent across products.
const BASE_CATEGORIES = ["เครื่องดื่ม", "อาหาร", "ของว่าง", "สินค้ากีฬา", "อื่นๆ"];

function CategoryInput({
  defaultValue,
  suggestions,
}: {
  defaultValue?: string;
  suggestions: string[];
}) {
  const list = [...new Set([...suggestions, ...BASE_CATEGORIES])];
  return (
    <>
      <input
        name="category"
        defaultValue={defaultValue}
        list="pos-categories"
        placeholder="พิมพ์หรือเลือกหมวด"
        className={`${inp} mt-1`}
      />
      <datalist id="pos-categories">
        {list.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

function ImageInput({ current }: { current?: string | null }) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  return (
    <label className="text-xs text-taupe md:col-span-2">
      รูปสินค้า (PNG/JPG/WebP ≤ 4MB)
      <div className="mt-1 flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="w-12 h-12 rounded-lg object-cover border border-line"
          />
        ) : (
          <span className="w-12 h-12 rounded-lg border border-dashed border-line flex items-center justify-center text-taupe">
            <ImagePlus className="w-4 h-4" />
          </span>
        )}
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : current ?? null);
          }}
          className="text-xs text-taupe file:mr-2 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-ink file:cursor-pointer"
        />
      </div>
    </label>
  );
}

export function AddProductForm({
  venues,
  categories,
  isManager,
}: {
  venues: SimpleVenue[];
  categories: string[];
  isManager: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProduct, null);
  if (!isManager) return null;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btn}>
        <span className="inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> เพิ่มสินค้า
        </span>
      </button>
    );
  }
  return (
    <SectionCard title="เพิ่มสินค้าใหม่">
      <form action={action} className="p-5 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <label className="text-xs text-taupe md:col-span-2">
          ชื่อสินค้า
          <input name="name" required className={`${inp} mt-1`} placeholder="เช่น น้ำดื่ม / เสื้อสโมสร" />
        </label>
        <label className="text-xs text-taupe">
          สาขา
          <select name="venueId" required className={`${inp} mt-1`}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-taupe">
          หมวด
          <CategoryInput suggestions={categories} />
        </label>
        <label className="text-xs text-taupe">
          ราคาขาย (฿)
          <input name="price" type="number" min={0} step="0.25" required className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          จุดสั่งซื้อ (เตือนเมื่อต่ำกว่า)
          <input name="reorderPoint" type="number" min={0} defaultValue={5} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          กันชน (safety stock — กันไม่ให้ขายจนติดลบ)
          <input name="safetyStock" type="number" min={0} defaultValue={0} className={`${inp} mt-1`} />
        </label>
        <ImageInput />
        {state?.error && <p className="text-xs text-clay md:col-span-6">{state.error}</p>}
        <div className="flex gap-2 md:col-span-4">
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

function EditRow({
  p,
  categories,
  onCancel,
}: {
  p: ProductRow;
  categories: string[];
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(updateProduct, null);
  return (
    <td colSpan={7} className="px-5 py-4 bg-bone/40">
      <form action={action} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="venueId" value={p.venueId} />
        <label className="text-xs text-taupe md:col-span-2">
          ชื่อสินค้า
          <input name="name" defaultValue={p.name} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          หมวด
          <CategoryInput defaultValue={p.category} suggestions={categories} />
        </label>
        <label className="text-xs text-taupe">
          ราคาขาย (฿)
          <input name="price" type="number" min={0} step="0.25" defaultValue={p.price} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          จุดสั่งซื้อ
          <input name="reorderPoint" type="number" min={0} defaultValue={p.reorderPoint} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          กันชน (safety)
          <input name="safetyStock" type="number" min={0} defaultValue={p.safetyStock} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe flex items-center gap-2">
          <input name="active" type="checkbox" defaultChecked={p.active} className="w-4 h-4 accent-[#21463a]" />
          เปิดขาย
        </label>
        <ImageInput current={p.imageUrl} />
        {state?.error && <p className="text-xs text-clay md:col-span-6">{state.error}</p>}
        <div className="flex gap-2 md:col-span-3">
          <button type="submit" disabled={pending} className={btn}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          <button type="button" onClick={onCancel} className={btnGhost}>
            ยกเลิก
          </button>
        </div>
      </form>
    </td>
  );
}

function StockRow({
  p,
  onCancel,
}: {
  p: ProductRow;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(recordStockMove, null);
  const [kind, setKind] = useState<"stock_in" | "adjust">("stock_in");
  return (
    <td colSpan={7} className="px-5 py-4 bg-bone/40">
      <form action={action} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        <input type="hidden" name="productId" value={p.id} />
        <input type="hidden" name="venueId" value={p.venueId} />
        <label className="text-xs text-taupe">
          ประเภท
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "stock_in" | "adjust")}
            className={`${inp} mt-1`}
          >
            <option value="stock_in">รับของเข้า (+)</option>
            <option value="adjust">ปรับสต็อก (± ของเสีย/นับใหม่)</option>
          </select>
        </label>
        <label className="text-xs text-taupe">
          จำนวน {kind === "adjust" ? "(ติดลบได้ เช่น -2)" : ""}
          <input
            name="qty"
            type="number"
            required
            min={kind === "stock_in" ? 1 : undefined}
            className={`${inp} mt-1`}
          />
        </label>
        <label className="text-xs text-taupe md:col-span-2">
          หมายเหตุ
          <input name="note" className={`${inp} mt-1`} placeholder="เช่น ล็อตใหม่ / แตกเสียหาย 2 ขวด" />
        </label>
        {state?.error && <p className="text-xs text-clay md:col-span-5">{state.error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={btn}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          <button type="button" onClick={onCancel} className={btnGhost}>
            ยกเลิก
          </button>
        </div>
      </form>
    </td>
  );
}

export function ProductsTable({
  products,
  categories,
  isManager,
}: {
  products: ProductRow[];
  categories: string[];
  isManager: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [stocking, setStocking] = useState<string | null>(null);

  return (
    <table className="w-full text-sm min-w-[760px]">
      <thead>
        <tr className="text-left text-taupe text-xs border-b border-line">
          <th className="font-normal px-5 py-3">สินค้า</th>
          <th className="font-normal px-3 py-3">สาขา</th>
          <th className="font-normal px-3 py-3">หมวด</th>
          <th className="font-normal px-3 py-3 text-right">ราคาขาย</th>
          <th className="font-normal px-3 py-3 text-right">คงเหลือ</th>
          <th className="font-normal px-3 py-3">สถานะ</th>
          <th className="font-normal px-5 py-3 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 && (
          <tr>
            <td colSpan={7} className="px-5 py-10 text-center text-taupe">
              ยังไม่มีสินค้า — เพิ่มเมนูของสาขาได้เลย
            </td>
          </tr>
        )}
        {products.map((p) => {
          if (editing === p.id)
            return (
              <tr key={p.id} className="border-b border-line last:border-0">
                <EditRow p={p} categories={categories} onCancel={() => setEditing(null)} />
              </tr>
            );
          if (stocking === p.id)
            return (
              <tr key={p.id} className="border-b border-line last:border-0">
                <StockRow p={p} onCancel={() => setStocking(null)} />
              </tr>
            );
          return (
            <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bone/50">
              <td className="px-5 py-3 text-ink">
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover border border-line"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-lg bg-bone border border-line" />
                  )}
                  {p.name}
                </div>
              </td>
              <td className="px-3 py-3 text-taupe">{p.venueName}</td>
              <td className="px-3 py-3 text-taupe">{p.category}</td>
              <td className="px-3 py-3 text-right tnum text-ink">฿{p.price.toLocaleString()}</td>
              <td className="px-3 py-3 text-right tnum">
                <span className={p.low ? "text-clay font-medium" : "text-ink"}>{p.stock}</span>
                {p.safetyStock > 0 && (
                  <span className="text-[11px] text-taupe ml-1">
                    (ขายได้ {Math.max(0, p.sellable)})
                  </span>
                )}
                {p.low && (
                  <span className="ml-2">
                    <Badge tone="red">ใกล้หมด</Badge>
                  </span>
                )}
              </td>
              <td className="px-3 py-3">
                <Badge tone={p.active ? "green" : "gray"}>
                  {p.active ? "เปิดขาย" : "ปิดขาย"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => { setStocking(p.id); setEditing(null); }}
                  className="inline-flex items-center gap-1 text-xs text-pine hover:text-brass transition-colors cursor-pointer mr-3"
                >
                  <PackagePlus className="w-3.5 h-3.5" /> สต็อก
                </button>
                {isManager && (
                  <button
                    onClick={() => { setEditing(p.id); setStocking(null); }}
                    className="inline-flex items-center gap-1 text-xs text-brass hover:text-pine transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
