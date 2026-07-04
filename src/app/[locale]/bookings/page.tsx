import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { MyBookingsList } from "@/components/my-bookings-list";
import { myBookings } from "@/lib/mock";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-3xl mx-auto w-full px-5 pb-16">
        <div className="pt-4 mb-5">
          <h1 className="font-display text-3xl font-bold text-pine">
            {t("myBookings.title")}
          </h1>
          <p className="text-sm text-taupe mt-1">{t("myBookings.subtitle")}</p>
        </div>
        <MyBookingsList bookings={myBookings} />
      </main>
    </div>
  );
}
