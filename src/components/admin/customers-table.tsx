"use client";

import { useMemo, useState, useActionState } from "react";
import { Search, Tag } from "lucide-react";
import { Badge } from "@/components/admin/kit";
import { ChipSelect } from "@/components/admin/add-forms";
import { updateCustomerTags } from "@/lib/admin-actions";

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lifetimeSpend: number;
  lastVisit: string;
  noShows: number;
  tags: string[];
}

const TAG_OPTIONS = ["VIP", "ขาประจำ", "เสี่ยงหาย", "ใหม่", "Open Play"];
const FILTERS = ["ทั้งหมด", ...TAG_OPTIONS];

function tagTone(t: string): "brass" | "red" | "gray" {
  if (t === "VIP") return "brass";
  if (t === "เสี่ยงหาย") return "red";
  return "gray";
}

function TagEditor({ c }: { c: AdminCustomer }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(c.tags);
  const [state, action, pending] = useActionState(updateCustomerTags, null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {c.tags.map((t) => (
          <Badge key={t} tone={tagTone(t)}>
            {t}
          </Badge>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-taupe hover:text-pine transition-colors cursor-pointer"
        >
          <Tag className="w-3 h-3" />
          แก้ไข
        </button>
      </div>
      {open && (
        <form action={action} className="mt-2">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="tags" value={tags.join(",")} />
          <ChipSelect options={TAG_OPTIONS} value={tags} onChange={setTags} />
          {state?.error && <p className="text-[11px] text-clay mt-1">{state.error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={pending}
              className="text-xs bg-pine text-bone rounded-lg px-3 py-1.5 hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึก tag"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTags(c.tags);
              }}
              className="text-xs border border-line rounded-lg px-3 py-1.5 text-taupe hover:border-brass transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function CustomersTable({ customers }: { customers: AdminCustomer[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ทั้งหมด");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query);
      const matchF = filter === "ทั้งหมด" || c.tags.includes(filter);
      return matchQ && matchF;
    });
  }, [customers, q, filter]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 text-sm">
          <Search className="w-4 h-4 text-taupe" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ / เบอร์โทร"
            className="bg-transparent outline-none placeholder:text-taupe/70 w-44"
          />
        </div>
        {FILTERS.map((seg) => (
          <button
            key={seg}
            onClick={() => setFilter(seg)}
            className={`text-sm rounded-full px-3.5 py-1.5 transition-colors cursor-pointer ${
              filter === seg
                ? "bg-pine text-bone"
                : "border border-line text-ink hover:border-brass"
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">ลูกค้า</th>
                <th className="font-normal px-3 py-3 text-right">ครั้งที่เล่น</th>
                <th className="font-normal px-3 py-3 text-right">ยอดสะสม</th>
                <th className="font-normal px-3 py-3">มาล่าสุด</th>
                <th className="font-normal px-3 py-3 text-right">ไม่มา</th>
                <th className="font-normal px-5 py-3">กลุ่ม</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-taupe">
                    ไม่พบลูกค้า
                  </td>
                </tr>
              )}
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-5 py-3">
                    <div className="text-ink">{c.name}</div>
                    <div className="text-xs text-taupe tnum">{c.phone}</div>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink">{c.visits}</td>
                  <td className="px-3 py-3 text-right tnum text-ink">
                    ฿{c.lifetimeSpend.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-taupe">{c.lastVisit}</td>
                  <td className="px-3 py-3 text-right tnum">
                    <span className={c.noShows >= 2 ? "text-clay" : "text-taupe"}>
                      {c.noShows}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <TagEditor c={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
