"use client";

import { useActionState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markNotificationsRead } from "@/lib/notify-actions";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  at: string;
}

export function NotificationsBanner({ items }: { items: NotificationItem[] }) {
  const [, action, pending] = useActionState(markNotificationsRead, null);
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brass/40 bg-brass/5 p-4 mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <Bell className="w-4 h-4 text-brass" />
          การแจ้งเตือน ({items.length})
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-taupe hover:text-ink cursor-pointer disabled:opacity-60"
          >
            {pending ? "..." : "อ่านแล้วทั้งหมด"}
          </button>
        </form>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((n) => (
          <li key={n.id} className="text-sm">
            <span className="text-ink font-medium">{n.title}</span>
            {n.body && <span className="text-taupe"> — {n.body}</span>}
            {n.link && (
              <Link href={n.link} className="text-brass ml-1.5 whitespace-nowrap">
                ไปจองเลย →
              </Link>
            )}
            <span className="text-[11px] text-taupe/70 ml-1.5 tnum">{n.at}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
