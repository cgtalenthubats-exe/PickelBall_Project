"use client";

import { useState, useActionState } from "react";
import { Users, X } from "lucide-react";
import { removeFromWaitlist } from "@/lib/admin-actions";

export interface WaitlistEntry {
  id: string;
  name: string;
  phone: string;
  joinedAt: string;
}

function RemoveButton({ id }: { id: string }) {
  const [, action, pending] = useActionState(removeFromWaitlist, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="เอาออกจากคิว"
        className="text-taupe hover:text-clay transition-colors cursor-pointer disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

export function SessionWaitlist({ entries }: { entries: WaitlistEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-brass hover:text-pine transition-colors cursor-pointer"
      >
        <Users className="w-3.5 h-3.5" />
        คิวรอ ({entries.length}) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {entries.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between text-xs bg-bone rounded-lg px-3 py-2"
            >
              <div>
                <span className="text-ink">{w.name}</span>
                <span className="text-taupe tnum ml-2">{w.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-taupe">{w.joinedAt}</span>
                <RemoveButton id={w.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
