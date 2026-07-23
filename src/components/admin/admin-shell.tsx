"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Tag,
  Package,
  Boxes,
  Users,
  ClipboardList,
  Contact,
  Shield,
  BarChart3,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

// minRole: "staff" = everyone; "venue_manager" hides the item from
// floor-operation accounts (they only run the counter, not the branch).
const nav = [
  { href: "/admin", label: "แดชบอร์ด", Icon: LayoutDashboard, minRole: "staff" },
  { href: "/admin/venues", label: "สาขา", Icon: Building2, minRole: "venue_manager" },
  { href: "/admin/pricing", label: "ราคาค่าเช่า", Icon: Tag, minRole: "venue_manager" },
  { href: "/admin/equipment", label: "อุปกรณ์เช่า", Icon: Package, minRole: "staff" },
  { href: "/admin/products", label: "สินค้า & สต็อก", Icon: Boxes, minRole: "staff" },
  { href: "/admin/sessions", label: "รอบ Open Play", Icon: Users, minRole: "staff" },
  { href: "/admin/tasks", label: "ตารางงาน", Icon: ClipboardList, minRole: "staff" },
  { href: "/admin/customers", label: "ลูกค้า", Icon: Contact, minRole: "venue_manager" },
  { href: "/admin/staff", label: "พนักงาน", Icon: Shield, minRole: "venue_manager" },
  { href: "/admin/reports", label: "รายงาน", Icon: BarChart3, minRole: "venue_manager" },
] as const;

export function AdminShell({
  role = "staff",
  children,
}: {
  role?: "staff" | "venue_manager" | "super_admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNav = nav.filter(
    (n) => n.minRole === "staff" || role !== "staff",
  );

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const navList = (
    <nav className="flex flex-col gap-1 px-3">
      {visibleNav.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-pine text-bone"
                : "text-taupe hover:bg-bone hover:text-ink"
            }`}
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="px-5 py-4">
      <div className="font-display text-xl font-bold text-pine">PickleBall</div>
      <div className="text-[11px] text-taupe mt-0.5">ระบบหลังบ้าน</div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bone">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-surface border-r border-line">
        {brand}
        {navList}
        <div className="mt-auto px-3 pb-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-taupe hover:text-ink px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าเว็บลูกค้า
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-surface border-b border-line px-4 py-3">
        <div className="font-display text-lg font-bold text-pine">
          PickleBall
          <span className="text-[11px] font-normal text-taupe"> · หลังบ้าน</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          className="cursor-pointer"
        >
          <Menu className="w-6 h-6 text-ink" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface flex flex-col">
            <div className="flex items-center justify-between pr-4">
              {brand}
              <button
                onClick={() => setOpen(false)}
                aria-label="ปิดเมนู"
                className="cursor-pointer"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            {navList}
            <div className="mt-auto px-3 pb-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-xs text-taupe px-3 py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                กลับหน้าเว็บลูกค้า
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="lg:ml-60 px-5 py-6 md:px-8 md:py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
