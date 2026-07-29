import { getTranslations } from "next-intl/server";
import { CalendarCheck, Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { HeaderMenu } from "./header-menu";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credit";

export async function SiteHeader() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let credit = 0;
  if (user) {
    const [{ data: profile }, balance] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).single(),
      getCreditBalance(supabase, user.id),
    ]);
    firstName = (profile?.name as string | null)?.split(" ")[0] ?? null;
    credit = balance;
  }

  return (
    <header className="max-w-3xl mx-auto w-full px-5 py-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold text-pine tracking-tight"
        >
          {t("brand")}
        </Link>
        <div className="flex items-center gap-3.5">
          {user && credit > 0 && (
            <Link
              href="/bookings"
              className="flex items-center gap-1 text-xs text-brass border border-brass/40 rounded-full px-2.5 py-1 hover:bg-brass/5 transition-colors"
              title="เครดิตคงเหลือ ใช้จ่ายครั้งถัดไปได้"
            >
              <Coins className="w-3.5 h-3.5" />
              <span className="tnum">฿{credit.toLocaleString()}</span>
            </Link>
          )}
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
      </div>
      {user && firstName && (
        <p className="text-xs text-taupe mt-1.5">
          สวัสดี, {firstName}
          {credit > 0 && ` · มีเครดิต ฿${credit.toLocaleString()}`}
        </p>
      )}
    </header>
  );
}
