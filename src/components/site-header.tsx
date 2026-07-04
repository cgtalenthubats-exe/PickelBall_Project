import { getTranslations } from "next-intl/server";
import { CalendarCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderMenu } from "./header-menu";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="max-w-3xl mx-auto w-full flex items-center justify-between px-5 py-4">
      <Link
        href="/"
        className="font-display text-xl font-bold text-pine tracking-tight"
      >
        {t("brand")}
      </Link>
      <div className="flex items-center gap-3.5">
        <Link
          href="/bookings"
          aria-label={t("myBookings.title")}
          className="text-ink hover:text-pine transition-colors"
        >
          <CalendarCheck className="w-5 h-5" />
        </Link>
        <LocaleSwitcher />
        <HeaderMenu authed={!!user} />
      </div>
    </header>
  );
}
