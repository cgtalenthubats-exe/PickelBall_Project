"use client";

import { useState, useActionState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { Badge } from "@/components/admin/kit";
import type { SimpleVenue } from "@/components/admin/add-forms";
import { promoteStaff, updateStaff } from "@/lib/admin-actions";

export interface AdminStaff {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "venue_manager" | "staff";
  managedVenueId: string | null;
  managedVenueName: string;
  active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบ (ทุกสาขา)",
  venue_manager: "ผู้จัดการสาขา",
  staff: "พนักงานหน้างาน",
};

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";
const lbl = "text-xs text-taupe";

function AddStaff({ venues }: { venues: SimpleVenue[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(promoteStaff, null);
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 text-sm rounded-xl px-4 py-2 transition-colors cursor-pointer ${
            open ? "border border-line text-taupe hover:border-brass" : "bg-pine text-bone hover:bg-pine-deep"
          }`}
        >
          {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {open ? "ปิด" : "เพิ่มพนักงาน"}
        </button>
      </div>
      {open && (
        <form
          action={action}
          className="rounded-2xl bg-surface border border-line p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <label className="text-sm md:col-span-1">
            <span className={lbl}>อีเมลพนักงาน *</span>
            <input name="email" type="email" required className={inp} placeholder="name@email.com" />
          </label>
          <label className="text-sm">
            <span className={lbl}>สิทธิ์</span>
            <select name="role" defaultValue="staff" className={inp}>
              <option value="staff">พนักงานหน้างาน</option>
              <option value="venue_manager">ผู้จัดการสาขา</option>
              <option value="super_admin">ผู้ดูแลระบบ</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={lbl}>สาขาที่ดูแล (เฉพาะผู้จัดการสาขา)</span>
            <select name="managedVenueId" defaultValue="" className={inp}>
              <option value="">—</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-taupe md:col-span-3">
            พนักงานต้องสมัคร/ล็อกอินเข้าระบบด้วยอีเมลนี้ก่อน แล้วระบบจะเลื่อนสิทธิ์ให้
          </p>
          {state?.error && <p className="text-sm text-clay md:col-span-3">{state.error}</p>}
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="text-sm bg-pine text-bone rounded-xl px-5 py-2.5 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "เลื่อนสิทธิ์"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EditRow({ s, venues }: { s: AdminStaff; venues: SimpleVenue[] }) {
  const [state, action, pending] = useActionState(updateStaff, null);
  return (
    <td colSpan={5} className="px-5 py-4 bg-bone/40">
      <form action={action} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <input type="hidden" name="id" value={s.id} />
        <div className="text-sm md:col-span-1">
          <span className={lbl}>{s.name}</span>
          <div className="text-xs text-taupe">{s.email}</div>
        </div>
        <label className="text-xs text-taupe">
          สิทธิ์
          <select name="role" defaultValue={s.role} className={inp}>
            <option value="staff">พนักงานหน้างาน</option>
            <option value="venue_manager">ผู้จัดการสาขา</option>
            <option value="super_admin">ผู้ดูแลระบบ</option>
            <option value="customer">เอาออกจากทีม</option>
          </select>
        </label>
        <label className="text-xs text-taupe">
          สาขาที่ดูแล
          <select name="managedVenueId" defaultValue={s.managedVenueId ?? ""} className={inp}>
            <option value="">—</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-taupe flex items-center gap-2 mt-5">
          <input name="active" type="checkbox" defaultChecked={s.active} className="w-4 h-4 accent-[#21463a]" />
          เปิดใช้งาน
        </label>
        {state?.error && <p className="text-xs text-clay md:col-span-4">{state.error}</p>}
        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={pending}
            className="text-sm bg-pine text-bone rounded-lg px-4 py-2 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </td>
  );
}

export function StaffManager({
  staff,
  venues,
}: {
  staff: AdminStaff[];
  venues: SimpleVenue[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <AddStaff venues={venues} />
      <div className="rounded-2xl bg-surface border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">ชื่อ / อีเมล</th>
                <th className="font-normal px-3 py-3">สิทธิ์</th>
                <th className="font-normal px-3 py-3">สาขาที่ดูแล</th>
                <th className="font-normal px-3 py-3">สถานะ</th>
                <th className="font-normal px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-taupe">
                    ยังไม่มีทีมงาน — เพิ่มด้วยอีเมลของบัญชีที่สมัครแล้ว
                  </td>
                </tr>
              )}
              {staff.map((s) =>
                editing === s.id ? (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <EditRow s={s} venues={venues} />
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-bone/50">
                    <td className="px-5 py-3">
                      <div className="text-ink">{s.name}</div>
                      <div className="text-xs text-taupe">{s.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={
                          s.role === "super_admin"
                            ? "pine"
                            : s.role === "venue_manager"
                              ? "brass"
                              : "gray"
                        }
                      >
                        {ROLE_LABELS[s.role]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-taupe">{s.managedVenueName}</td>
                    <td className="px-3 py-3">
                      <Badge tone={s.active ? "green" : "gray"}>
                        {s.active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditing(s.id)}
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
        </div>
      </div>
    </div>
  );
}
