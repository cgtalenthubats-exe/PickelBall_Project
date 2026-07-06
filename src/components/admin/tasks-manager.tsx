"use client";

import { useState, useActionState } from "react";
import { Plus, X, Check, Trash2 } from "lucide-react";
import { SectionCard, Badge } from "@/components/admin/kit";
import { createTask, toggleTask, deleteTask } from "@/lib/admin-actions";

export interface AdminTask {
  id: string;
  venueId: string;
  venueName: string;
  courtName: string;
  title: string;
  time: string;
  category: "cleaning" | "prep" | "check";
  done: boolean;
}

interface VenueOpt {
  id: string;
  name: string;
  courts: { id: string; name: string }[];
}

const categoryMeta: Record<
  AdminTask["category"],
  { label: string; tone: "green" | "brass" | "gray" }
> = {
  cleaning: { label: "ทำความสะอาด", tone: "green" },
  prep: { label: "เตรียมพื้นที่", tone: "brass" },
  check: { label: "ตรวจเช็ค", tone: "gray" },
};

const inp =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass";
const lbl = "text-xs text-taupe";

function AddTask({ venues }: { venues: VenueOpt[] }) {
  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [state, action, pending] = useActionState(createTask, null);
  const courts = venues.find((v) => v.id === venueId)?.courts ?? [];

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
          {open ? "ปิด" : "เพิ่มงาน"}
        </button>
      </div>
      {open && (
        <form
          action={action}
          className="rounded-2xl bg-surface border border-line p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <label className="text-sm md:col-span-3">
            <span className={lbl}>ชื่องาน *</span>
            <input name="title" required className={inp} placeholder="เช่น เช็ดพื้นคอร์ท + เก็บขยะ" />
          </label>
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
            <span className={lbl}>คอร์ท</span>
            <select name="courtId" defaultValue="" className={inp}>
              <option value="">ทั้งสาขา</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  คอร์ท {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={lbl}>เวลา</span>
            <input name="time" type="time" defaultValue="08:00" className={inp} />
          </label>
          <label className="text-sm md:col-span-3">
            <span className={lbl}>ประเภทงาน</span>
            <select name="category" defaultValue="cleaning" className={inp}>
              <option value="cleaning">ทำความสะอาด</option>
              <option value="prep">เตรียมพื้นที่</option>
              <option value="check">ตรวจเช็ค</option>
            </select>
          </label>
          {state?.error && <p className="text-sm text-clay md:col-span-3">{state.error}</p>}
          <div className="md:col-span-3">
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

function TaskRow({ t }: { t: AdminTask }) {
  const [, toggleAction] = useActionState(toggleTask, null);
  const [, delAction] = useActionState(deleteTask, null);
  const cat = categoryMeta[t.category];
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <form action={toggleAction} className="shrink-0">
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="done" value={t.done ? "false" : "true"} />
        <button
          type="submit"
          aria-label={t.done ? "ทำเครื่องหมายยังไม่เสร็จ" : "ทำเครื่องหมายเสร็จ"}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
            t.done ? "bg-pine border-pine text-bone" : "border-line hover:border-pine"
          }`}
        >
          {t.done && <Check className="w-3.5 h-3.5" />}
        </button>
      </form>
      <span className="tnum text-sm text-taupe w-12 shrink-0">{t.time}</span>
      <span className={`flex-1 text-sm ${t.done ? "text-taupe line-through" : "text-ink"}`}>
        {t.title}
      </span>
      {t.courtName && (
        <span className="text-xs text-taupe shrink-0 hidden sm:block">
          คอร์ท {t.courtName}
        </span>
      )}
      <Badge tone={cat.tone}>{cat.label}</Badge>
      <form action={delAction} className="shrink-0">
        <input type="hidden" name="id" value={t.id} />
        <button
          type="submit"
          aria-label="ลบงาน"
          className="text-taupe hover:text-clay transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

export function TasksManager({
  tasks,
  venues,
}: {
  tasks: AdminTask[];
  venues: VenueOpt[];
}) {
  const venueNames = Array.from(new Set(tasks.map((t) => t.venueName)));

  return (
    <div>
      <AddTask venues={venues} />
      {tasks.length === 0 ? (
        <div className="text-center text-taupe text-sm py-16 border border-line rounded-2xl bg-surface">
          ยังไม่มีงาน — กด “เพิ่มงาน” เพื่อสร้างคิวงานให้พนักงาน
        </div>
      ) : (
        <div className="space-y-3">
          {venueNames.map((venue) => (
            <SectionCard key={venue} title={venue}>
              <div className="divide-y divide-line">
                {tasks
                  .filter((t) => t.venueName === venue)
                  .map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
