"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === "th" ? "en" : "th";

  return (
    <button
      onClick={() => router.replace(pathname, { locale: other })}
      className="text-[12px] border border-line rounded-full px-2.5 py-1 cursor-pointer"
      aria-label="Switch language"
    >
      <span className={locale === "th" ? "text-pine font-medium" : "text-taupe"}>
        TH
      </span>
      <span className="text-taupe"> · </span>
      <span className={locale === "en" ? "text-pine font-medium" : "text-taupe"}>
        EN
      </span>
    </button>
  );
}
