import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCustomerVenue } from "@/lib/data/customer";
import { SiteHeader } from "@/components/site-header";
import { BookingSection } from "@/components/booking-section";
import { Gallery } from "@/components/gallery";

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; venueId: string }>;
}) {
  const { locale, venueId } = await params;
  setRequestLocale(locale);
  await getTranslations();

  const venue = await getCustomerVenue(venueId);
  if (!venue) notFound();

  const gallery =
    venue.gallery.length > 0
      ? venue.gallery
      : [
          "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1100&q=80",
        ];

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-3xl mx-auto w-full px-5 pb-16">
        <div className="pt-4">
          <Gallery images={gallery} alt={venue.name} />
        </div>

        <div className="mt-4 mb-6">
          <h1 className="font-display text-2xl md:text-3xl text-pine">
            {venue.name}
          </h1>
          <div className="flex items-center gap-4 text-taupe text-sm mt-1.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {venue.area}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {venue.amenities.map((a) => (
              <span
                key={a}
                className="text-xs text-taupe bg-bone rounded-full px-2.5 py-1"
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        <BookingSection venue={venue} />
      </main>
    </div>
  );
}
