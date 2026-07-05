"use client";

import { useEffect, useState } from "react";
import { Search, CalendarClock, CreditCard, type LucideIcon } from "lucide-react";

// Icon keys are used instead of component references so a server component can
// pass plain, serializable step data across the client boundary.
const ICONS: Record<string, LucideIcon> = {
  search: Search,
  calendar: CalendarClock,
  card: CreditCard,
};

export type SelectorIcon = keyof typeof ICONS;

export interface SelectorStep {
  /** Step label, e.g. "01" */
  number: string;
  title: string;
  desc: string;
  /** Path to a real app screenshot in /public */
  image: string;
  icon: SelectorIcon;
}

/**
 * Expanding-panel selector. Click / tap a panel to expand it and reveal the
 * step detail. Adapted from the "interactive selector" pattern to the project
 * design system (tokens, lucide icons, mobile-first, reduced-motion aware).
 */
export function InteractiveSelector({ steps }: { steps: SelectorStep[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [entered, setEntered] = useState<number[]>([]);

  // Staggered entrance. When the user prefers reduced motion the panels still
  // appear via the same timers but with no delay (all on the next tick), which
  // keeps every state update asynchronous.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduce ? 0 : 160;

    const timers = steps.map((_, i) =>
      setTimeout(() => setEntered((prev) => [...prev, i]), step * i),
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  return (
    <div className="flex w-full h-[340px] sm:h-[440px] gap-2 items-stretch">
      {steps.map((step, index) => {
        const active = activeIndex === index;
        const isIn = entered.includes(index);
        const Icon = ICONS[step.icon];
        return (
          <button
            key={step.number}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-pressed={active}
            aria-label={`${step.number} — ${step.title}`}
            className={`group relative flex flex-col justify-end overflow-hidden rounded-xl border text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-bone transition-[flex-grow,border-color,box-shadow,opacity,transform] duration-700 ease-in-out ${
              active
                ? "border-brass shadow-[0_20px_50px_-20px_rgba(22,48,39,0.55)]"
                : "border-line shadow-[0_10px_30px_-20px_rgba(22,48,39,0.4)]"
            }`}
            style={{
              flexGrow: active ? 5 : 1,
              flexBasis: 0,
              minWidth: 56,
              backgroundColor: "var(--color-pine-deep)",
              backgroundImage: `url('${step.image}')`,
              backgroundSize: active ? "cover" : "auto 118%",
              backgroundPosition: "top center",
              backgroundRepeat: "no-repeat",
              opacity: isIn ? 1 : 0,
              transform: isIn ? "translateX(0)" : "translateX(-40px)",
              willChange: "flex-grow, opacity, transform",
            }}
          >
            {/* Legibility gradient — stronger on the active panel */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-opacity duration-700"
              style={{
                background:
                  "linear-gradient(to top, rgba(22,32,27,0.92) 0%, rgba(22,32,27,0.35) 42%, rgba(22,32,27,0) 72%)",
                opacity: active ? 1 : 0.85,
              }}
            />

            {/* Step number — always visible */}
            <span className="absolute top-3 left-3 z-10 font-display text-sm font-bold text-bone/90 tnum">
              {step.number}
            </span>

            {/* Bottom label */}
            <span className="relative z-10 flex items-end gap-3 p-3 sm:p-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-pine-deep/70 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-lime" />
              </span>
              <span
                className="min-w-0 transition-all duration-700 ease-in-out"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? "translateX(0)" : "translateX(16px)",
                }}
              >
                <span className="block font-display text-base sm:text-lg font-semibold text-bone leading-tight whitespace-nowrap">
                  {step.title}
                </span>
                <span className="block text-xs sm:text-sm text-bone/75 leading-snug mt-0.5">
                  {step.desc}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
