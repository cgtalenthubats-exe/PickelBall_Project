"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Flame } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { heroImage } from "@/lib/mock";

export function LandingHero() {
  const t = useTranslations();
  const [pos, setPos] = useState({ x: 60, y: 25 });

  return (
    <section
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
      className="relative overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}% ${pos.y}%, rgba(198,242,78,0.18), transparent 60%)`,
        }}
      />
      <div className="relative max-w-3xl mx-auto w-full px-5 pt-6 pb-12">
        <p className="font-display text-[11px] tracking-[0.16em] text-brass">
          {t("hero.eyebrow")}
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] text-pine mt-3 max-w-2xl">
          {t("hero.title")}
        </h1>
        <p className="text-[15px] md:text-lg text-taupe leading-relaxed mt-4 max-w-xl">
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <Link
            href="/venues/ladprao"
            className="inline-flex items-center gap-2 bg-pine text-bone text-sm font-medium rounded-xl px-5 py-3 hover:bg-pine-deep transition-colors"
          >
            {t("hero.ctaPrimary")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center text-sm font-medium text-pine border border-line rounded-xl px-5 py-3 hover:border-brass transition-colors"
          >
            {t("hero.ctaSecondary")}
          </a>
        </div>

        <div className="relative mt-8">
          <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden border border-line">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pine/40 to-transparent" />
          </div>

          <div className="max-w-xs -mt-12 ml-4 relative animate-float">
            <div className="rounded-r-xl border border-line border-l-[3px] border-l-pine bg-surface p-3.5 shadow-[0_16px_40px_-16px_rgba(33,70,58,0.45)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-[15px] tnum tracking-tight">
                    18:00 – 20:00
                  </div>
                  <div className="text-xs text-taupe mt-0.5">
                    {t("booking.openPlay")} · Legend 50+
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[15px] tnum">฿180</div>
                  <div className="text-[11px] text-taupe">
                    {t("booking.perPerson")}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs px-2.5 py-1 rounded-full tnum flex items-center gap-1 bg-clay-soft text-clay">
                  <Flame className="w-3.5 h-3.5" />
                  {t("booking.spotsLeft", { left: 2, total: 12 })}
                </span>
                <span className="text-[13px] bg-pine text-bone rounded-[10px] px-4 py-1.5">
                  {t("booking.book")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
