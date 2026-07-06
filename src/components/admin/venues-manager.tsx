"use client";

import { useState, useActionState } from "react";
import { MapPin, Pencil, Layers, Navigation, Trash2 } from "lucide-react";
import { Badge } from "@/components/admin/kit";
import { AMENITIES, ChipSelect } from "@/components/admin/add-forms";
import {
  updateVenue,
  setVenueStatus,
  addCourt,
  setCourtPurpose,
  deleteCourt,
} from "@/lib/admin-actions";

export interface AdminCourt {
  id: string;
  name: string;
  purpose: string;
  status: string;
}

export interface AdminVenue {
  id: string;
  name: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  status: string;
  courts: AdminCourt[];
  courtCount: number;
}

const purposeLabel = (p: string) => (p === "open_play" ? "Open Play" : "เหมาคอร์ท");

function CourtRow({ c }: { c: AdminCourt }) {
  const [, purposeAction, pPending] = useActionState(setCourtPurpose, null);
  const [delState, delAction, dPending] = useActionState(deleteCourt, null);
  const next = c.purpose === "open_play" ? "private" : "open_play";
  return (
    <div className="flex items-center justify-between gap-2 text-sm py-1">
      <span className="text-ink">คอร์ท {c.name}</span>
      <div className="flex items-center gap-1.5">
        <form action={purposeAction}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="purpose" value={next} />
          <button
            type="submit"
            disabled={pPending}
            title="กดเพื่อสลับประเภท"
            className={`text-[11px] rounded-full px-2.5 py-0.5 border transition-colors cursor-pointer ${
              c.purpose === "open_play"
                ? "bg-pine text-bone border-pine"
                : "bg-lime-soft text-pine border-lime-soft"
            } disabled:opacity-60`}
          >
            {purposeLabel(c.purpose)}
          </button>
        </form>
        <form action={delAction}>
          <input type="hidden" name="id" value={c.id} />
          <button
            type="submit"
            disabled={dPending}
            aria-label="ลบคอร์ท"
            className="text-taupe hover:text-clay transition-colors cursor-pointer disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      {delState?.error && (
        <span className="text-[11px] text-clay w-full text-right">
          {delState.error}
        </span>
      )}
    </div>
  );
}

function AddCourtForm({ venueId }: { venueId: string }) {
  const [, action, pending] = useActionState(addCourt, null);
  return (
    <form action={action} className="flex items-center gap-2 pt-2">
      <input type="hidden" name="venueId" value={venueId} />
      <input
        name="name"
        placeholder="ชื่อคอร์ท (เว้นว่าง = อัตโนมัติ)"
        className="flex-1 text-xs rounded-lg border border-line bg-surface px-2.5 py-1.5 outline-none focus:border-brass"
      />
      <select
        name="purpose"
        defaultValue="private"
        className="text-xs rounded-lg border border-line bg-surface px-2 py-1.5 outline-none focus:border-brass"
      >
        <option value="private">เหมาคอร์ท</option>
        <option value="open_play">Open Play</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="text-xs bg-pine text-bone rounded-lg px-3 py-1.5 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
      >
        + เพิ่ม
      </button>
    </form>
  );
}

function CourtManager({ venueId, courts }: { venueId: string; courts: AdminCourt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-taupe hover:text-pine transition-colors cursor-pointer"
      >
        จัดการคอร์ท ({courts.length}) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2">
          {courts.map((c) => (
            <CourtRow key={c.id} c={c} />
          ))}
          <AddCourtForm venueId={venueId} />
        </div>
      )}
    </div>
  );
}

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";
const lbl = "text-xs text-taupe";

function VenueCard({ v }: { v: AdminVenue }) {
  const [editing, setEditing] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(v.amenities);
  const [editState, editAction, editPending] = useActionState(updateVenue, null);
  const [, statusAction, statusPending] = useActionState(setVenueStatus, null);
  const hasCoords = v.lat != null && v.lng != null;
  const options = Array.from(new Set([...AMENITIES, ...v.amenities]));

  return (
    <div className="rounded-2xl bg-surface border border-line overflow-hidden">
      {hasCoords ? (
        <iframe
          title={`แผนที่ ${v.name}`}
          src={`https://maps.google.com/maps?q=${v.lat},${v.lng}&z=15&output=embed`}
          loading="lazy"
          className="w-full h-36 border-0"
        />
      ) : (
        <div className="w-full h-36 bg-bone flex items-center justify-center text-xs text-taupe">
          ยังไม่มีพิกัด — กดแก้ไขแล้ววางลิงก์ Google Maps
        </div>
      )}

      <div className="p-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg text-pine leading-tight">{v.name}</h3>
              <Badge tone={v.status === "active" ? "green" : "gray"}>
                {v.status === "active" ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
              </Badge>
            </div>
            <div className="flex items-start gap-1.5 text-sm text-taupe mt-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              {v.address || v.area || "—"}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-taupe mt-1.5">
              <Layers className="w-4 h-4" />
              {v.courtCount} คอร์ท · เหมา{" "}
              {v.courts.filter((c) => c.purpose !== "open_play").length} · Open Play{" "}
              {v.courts.filter((c) => c.purpose === "open_play").length}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {v.amenities.map((a) => (
                <span key={a} className="text-[11px] text-taupe bg-bone rounded-full px-2 py-0.5">
                  {a}
                </span>
              ))}
            </div>
            <CourtManager venueId={v.id} courts={v.courts} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm border border-line rounded-lg py-2 text-ink hover:border-brass transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </button>
              <form action={statusAction} className="flex-1">
                <input type="hidden" name="id" value={v.id} />
                <input
                  type="hidden"
                  name="status"
                  value={v.status === "active" ? "inactive" : "active"}
                />
                <button
                  type="submit"
                  disabled={statusPending}
                  className="w-full text-sm border border-line rounded-lg py-2 text-taupe hover:border-brass transition-colors cursor-pointer disabled:opacity-60"
                >
                  {v.status === "active" ? "ปิดชั่วคราว" : "เปิดใช้งาน"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <form action={editAction} className="space-y-3">
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="amenities" value={amenities.join(",")} />
            <label className="text-sm block">
              <span className={lbl}>ชื่อสาขา</span>
              <input name="name" defaultValue={v.name} className={inp} />
            </label>
            <label className="text-sm block">
              <span className={lbl}>พื้นที่</span>
              <input name="area" defaultValue={v.area} className={inp} />
            </label>
            <label className="text-sm block">
              <span className={lbl}>ที่อยู่</span>
              <input name="address" defaultValue={v.address} className={inp} />
            </label>
            <label className="text-sm block">
              <span className={lbl}>เปลี่ยนตำแหน่ง (วางลิงก์ Google Maps ใหม่)</span>
              <input name="mapUrl" className={inp} placeholder="เว้นว่างไว้ถ้าไม่เปลี่ยน" />
              {hasCoords && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-pine mt-1 hover:text-pine-deep"
                >
                  <Navigation className="w-3 h-3" />
                  ตำแหน่งปัจจุบัน: {v.lat}, {v.lng}
                </a>
              )}
            </label>
            <div className="text-sm">
              <span className={lbl}>สิ่งอำนวยความสะดวก</span>
              <ChipSelect options={options} value={amenities} onChange={setAmenities} />
            </div>
            {editState?.error && <p className="text-sm text-clay">{editState.error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={editPending}
                className="text-sm bg-pine text-bone rounded-lg px-5 py-2 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
              >
                {editPending ? "กำลังบันทึก…" : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setAmenities(v.amenities);
                }}
                className="text-sm border border-line rounded-lg px-5 py-2 text-taupe hover:border-brass transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function VenuesManager({ venues }: { venues: AdminVenue[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {venues.map((v) => (
        <VenueCard key={v.id} v={v} />
      ))}
    </div>
  );
}
