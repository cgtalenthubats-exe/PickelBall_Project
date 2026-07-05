"use client";

import { useState, useActionState } from "react";
import { Plus, X } from "lucide-react";
import {
  createVenue,
  createEquipment,
  createSession,
} from "@/lib/admin-actions";

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";
const lbl = "text-xs text-taupe";

function Toggle({
  open,
  setOpen,
  label,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex justify-end mb-3">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 text-sm rounded-xl px-4 py-2 transition-colors cursor-pointer ${
          open
            ? "border border-line text-taupe hover:border-brass"
            : "bg-pine text-bone hover:bg-pine-deep"
        }`}
      >
        {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {open ? "ปิด" : label}
      </button>
    </div>
  );
}

function Actions({ pending }: { pending: boolean }) {
  return (
    <div className="md:col-span-2 flex gap-2 pt-1">
      <button
        type="submit"
        disabled={pending}
        className="text-sm bg-pine text-bone rounded-xl px-5 py-2.5 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </div>
  );
}

export function AddVenueForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createVenue, null);
  return (
    <div>
      <Toggle open={open} setOpen={setOpen} label="เพิ่มสาขา" />
      {open && (
        <form
          action={action}
          className="rounded-2xl bg-surface border border-line p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="text-sm">
            <span className={lbl}>ชื่อสาขา *</span>
            <input name="name" required className={inp} placeholder="เช่น Central Pickleball · บางนา" />
          </label>
          <label className="text-sm">
            <span className={lbl}>slug (ภาษาอังกฤษ)</span>
            <input name="slug" className={inp} placeholder="bangna (เว้นว่างได้)" />
          </label>
          <label className="text-sm">
            <span className={lbl}>พื้นที่</span>
            <input name="area" className={inp} placeholder="บางนา, กรุงเทพฯ" />
          </label>
          <label className="text-sm">
            <span className={lbl}>จำนวนคอร์ท</span>
            <input name="courts" type="number" min={1} defaultValue={2} className={inp} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className={lbl}>ที่อยู่</span>
            <input name="address" className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>Latitude</span>
            <input name="lat" className={inp} placeholder="13.6" />
          </label>
          <label className="text-sm">
            <span className={lbl}>Longitude</span>
            <input name="lng" className={inp} placeholder="100.6" />
          </label>
          <label className="text-sm md:col-span-2">
            <span className={lbl}>สิ่งอำนวยความสะดวก (คั่นด้วย ,)</span>
            <input name="amenities" className={inp} placeholder="ที่จอดรถ, WiFi, คาเฟ่" />
          </label>
          {state?.error && <p className="text-sm text-clay md:col-span-2">{state.error}</p>}
          <Actions pending={pending} />
        </form>
      )}
    </div>
  );
}

export function AddEquipmentForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createEquipment, null);
  return (
    <div>
      <Toggle open={open} setOpen={setOpen} label="เพิ่มอุปกรณ์" />
      {open && (
        <form
          action={action}
          className="rounded-2xl bg-surface border border-line p-5 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="text-sm">
            <span className={lbl}>ชื่ออุปกรณ์ *</span>
            <input name="name" required className={inp} placeholder="เช่น ไม้แร็กเกต (Pro)" />
          </label>
          <label className="text-sm">
            <span className={lbl}>ราคาเช่า (บาท)</span>
            <input name="price" type="number" min={0} defaultValue={100} className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>สต็อกต่อรอบ</span>
            <input name="stock" type="number" min={0} defaultValue={4} className={inp} />
          </label>
          <label className="text-sm flex items-center gap-2 mt-6">
            <input name="free" type="checkbox" className="w-4 h-4 accent-[#21463a]" />
            <span className="text-taupe">แถมฟรีในตัวจอง</span>
          </label>
          {state?.error && <p className="text-sm text-clay md:col-span-2">{state.error}</p>}
          <Actions pending={pending} />
        </form>
      )}
    </div>
  );
}

interface VenueOpt {
  id: string;
  name: string;
  courts: { id: string; name: string }[];
}

export function AddSessionForm({ venues }: { venues: VenueOpt[] }) {
  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [state, action, pending] = useActionState(createSession, null);
  const courts = venues.find((v) => v.id === venueId)?.courts ?? [];

  return (
    <div>
      <Toggle open={open} setOpen={setOpen} label="ตั้งรอบใหม่" />
      {open && (
        <form
          action={action}
          className="rounded-2xl bg-surface border border-line p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <label className="text-sm">
            <span className={lbl}>สาขา *</span>
            <select
              name="venueId"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className={inp}
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={lbl}>คอร์ท *</span>
            <select name="courtId" className={inp}>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  คอร์ท {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={lbl}>ระดับ</span>
            <input name="level" defaultValue="All Level" className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>วันที่ *</span>
            <input name="date" type="date" required className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>เริ่ม *</span>
            <input name="start" type="time" required defaultValue="18:00" className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>สิ้นสุด *</span>
            <input name="end" type="time" required defaultValue="20:00" className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>จำนวนที่รับ</span>
            <input name="capacity" type="number" min={1} defaultValue={12} className={inp} />
          </label>
          <label className="text-sm">
            <span className={lbl}>ราคา/คน (บาท)</span>
            <input name="price" type="number" min={0} defaultValue={150} className={inp} />
          </label>
          {state?.error && <p className="text-sm text-clay md:col-span-3">{state.error}</p>}
          <div className="md:col-span-3 flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="text-sm bg-pine text-bone rounded-xl px-5 py-2.5 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
