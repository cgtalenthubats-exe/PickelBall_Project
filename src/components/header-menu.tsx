"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { signout } from "@/lib/auth-actions";

export function HeaderMenu({ authed = false }: { authed?: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/", label: t("menu.home") },
    { href: "/venues", label: t("menu.findCourts") },
    { href: "/bookings", label: t("menu.myBookings") },
    ...(authed
      ? []
      : [
          { href: "/login", label: t("menu.signIn") },
          { href: "/register", label: t("menu.register") },
        ]),
    { href: "/admin", label: t("menu.admin") },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.menu")}
        className="cursor-pointer flex items-center"
      >
        {open ? (
          <X className="w-5 h-5 text-ink" />
        ) : (
          <Menu className="w-5 h-5 text-ink" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-52 rounded-2xl bg-surface border border-line shadow-[0_16px_40px_-16px_rgba(33,70,58,0.35)] py-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-ink hover:bg-bone transition-colors"
              >
                {it.label}
              </Link>
            ))}
            {authed && (
              <form action={signout} className="border-t border-line mt-1 pt-1">
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 text-sm text-clay hover:bg-bone transition-colors cursor-pointer"
                >
                  {t("menu.signOut")}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
