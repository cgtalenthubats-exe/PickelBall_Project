"use client";

import { useState, useActionState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/admin/kit";
import { updateEquipment } from "@/lib/admin-actions";
import type { SimpleVenue } from "@/components/admin/add-forms";

export interface EquipItem {
  id: string;
  name: string;
  venueId: string | null;
  venueName: string;
  price: number;
  stockPerSlot: number;
  includedFree: boolean;
  status: string;
}

const inp =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brass";

function EditRow({
  e,
  venues,
  onCancel,
}: {
  e: EquipItem;
  venues: SimpleVenue[];
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(updateEquipment, null);
  const [free, setFree] = useState(e.includedFree);
  return (
    <td colSpan={6} className="px-5 py-4 bg-bone/40">
      <form action={action} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <input type="hidden" name="id" value={e.id} />
        <label className="text-xs text-taupe md:col-span-2">
          ชื่ออุปกรณ์
          <input name="name" defaultValue={e.name} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          สาขา
          <select name="venueId" defaultValue={e.venueId ?? ""} className={`${inp} mt-1`}>
            <option value="">ทุกสาขา</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-taupe">
          ราคา/เช่า
          <input
            name="price"
            type="number"
            min={0}
            defaultValue={e.price}
            disabled={free}
            className={`${inp} mt-1 disabled:opacity-50`}
          />
        </label>
        <label className="text-xs text-taupe">
          สต็อก/รอบ
          <input name="stock" type="number" min={0} defaultValue={e.stockPerSlot} className={`${inp} mt-1`} />
        </label>
        <label className="text-xs text-taupe">
          สถานะ
          <select name="status" defaultValue={e.status} className={`${inp} mt-1`}>
            <option value="active">พร้อมให้เช่า</option>
            <option value="inactive">ปิดชั่วคราว</option>
          </select>
        </label>
        <label className="text-xs text-taupe flex items-center gap-2 md:col-span-2">
          <input
            name="free"
            type="checkbox"
            checked={free}
            onChange={(ev) => setFree(ev.target.checked)}
            className="w-4 h-4 accent-[#21463a]"
          />
          แถมฟรีในตัวจอง
        </label>
        {state?.error && (
          <p className="text-xs text-clay md:col-span-6">{state.error}</p>
        )}
        <div className="flex gap-2 md:col-span-4">
          <button
            type="submit"
            disabled={pending}
            className="text-sm bg-pine text-bone rounded-lg px-4 py-2 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm border border-line rounded-lg px-4 py-2 text-taupe hover:border-brass transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </td>
  );
}

export function EquipmentTable({
  equipment,
  venues,
}: {
  equipment: EquipItem[];
  venues: SimpleVenue[];
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <table className="w-full text-sm min-w-[720px]">
      <thead>
        <tr className="text-left text-taupe text-xs border-b border-line">
          <th className="font-normal px-5 py-3">อุปกรณ์</th>
          <th className="font-normal px-3 py-3">สาขา</th>
          <th className="font-normal px-3 py-3 text-right">ราคาเช่า</th>
          <th className="font-normal px-3 py-3 text-right">สต็อก/รอบ</th>
          <th className="font-normal px-3 py-3">สถานะ</th>
          <th className="font-normal px-5 py-3 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody>
        {equipment.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-10 text-center text-taupe">
              ยังไม่มีอุปกรณ์
            </td>
          </tr>
        )}
        {equipment.map((e) =>
          editing === e.id ? (
            <tr key={e.id} className="border-b border-line last:border-0">
              <EditRow e={e} venues={venues} onCancel={() => setEditing(null)} />
            </tr>
          ) : (
            <tr key={e.id} className="border-b border-line last:border-0 hover:bg-bone/50">
              <td className="px-5 py-3 text-ink">
                {e.name}
                {e.includedFree && (
                  <span className="ml-2">
                    <Badge tone="green">แถมฟรีในตัวจอง</Badge>
                  </span>
                )}
              </td>
              <td className="px-3 py-3 text-taupe">{e.venueName}</td>
              <td className="px-3 py-3 text-right tnum text-ink">
                {e.includedFree ? "—" : `฿${e.price}`}
              </td>
              <td className="px-3 py-3 text-right tnum text-taupe">{e.stockPerSlot}</td>
              <td className="px-3 py-3">
                <Badge tone={e.status === "active" ? "green" : "gray"}>
                  {e.status === "active" ? "พร้อมให้เช่า" : "ปิดชั่วคราว"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => setEditing(e.id)}
                  className="inline-flex items-center gap-1 text-xs text-brass hover:text-pine transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
