import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVenue, getSlot } from "@/lib/mock";
import { equipment } from "@/lib/admin-mock";
import { SiteHeader } from "@/components/site-header";
import { BookingConfirm } from "@/components/booking-confirm";
import { Link } from "@/i18n/navigation";

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; venueId: string; slotId: string }>;
}) {
  const { locale, venueId, slotId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const venue = getVenue(venueId);
  const slot = getSlot(venueId, slotId);
  if (!venue || !slot) notFound();

  const addons = equipment.filter((e) => e.status === "active");

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-2xl mx-auto w-full px-5 pb-16">
        <Link
          href={`/venues/${venueId}`}
          className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-ink mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("bookingFlow.back")}
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-pine mt-2 mb-5">
          {t("bookingFlow.title")}
        </h1>
        <BookingConfirm venueName={venue.name} slot={slot} addons={addons} />
      </main>
    </div>
  );
}
