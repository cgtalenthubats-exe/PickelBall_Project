"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "ปริ้นหน้านี้" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-pine text-bone rounded-xl px-5 py-2.5 text-sm hover:bg-pine-deep transition-colors cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}
