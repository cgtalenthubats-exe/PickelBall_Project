"use client";

import { useRouter, usePathname } from "next/navigation";

export function DashboardDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <input
      type="date"
      defaultValue={date}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `${pathname}?date=${v}` : pathname);
      }}
      className="text-sm border border-line rounded-xl px-4 py-2 bg-surface text-ink hover:border-brass transition-colors cursor-pointer outline-none"
    />
  );
}
