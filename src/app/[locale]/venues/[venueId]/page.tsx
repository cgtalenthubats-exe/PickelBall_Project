import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { getCustomerVenue } from "@/lib/data/customer";
import { Link } from "@/i18n/navigation";
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
  const t = await getTranslations();

  const venue = await getCustomerVenue(venueId);
  if (!venue) notFound();

  const gallery =
    venue.gallery.length > 0
      ? venue.gallery
      : [
          "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1100&q=80",
        ];

  const hasCoords = venue.lat != null && venue.lng != null;
  const mapQuery = hasCoords
    ? `${venue.lat},${venue.lng}`
    : `${venue.name} ${venue.address ?? venue.area}`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&z=15&hl=${locale}&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapQuery,
  )}`;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-3xl mx-auto w-full px-5 pb-16">
        <Link
          href="/venues"
          className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-pine transition-colors pt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("branches.allBranches")}
        </Link>
        <div className="pt-3">
          <Gallery images={gallery} alt={venue.name} />
        </div>

        <div className="mt-4 mb-6">
          <h1 className="font-display text-2xl md:text-3xl text-pine">
            {venue.name}
          </h1>
          <div className="flex items-start gap-1.5 text-taupe text-sm mt-1.5">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{venue.address ?? venue.area}</span>
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

        {/* Location map */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-ink">{t("branches.map")}</h2>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-pine font-medium hover:text-pine-deep transition-colors"
            >
              <Navigation className="w-4 h-4" />
              {t("branches.navigate")}
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden border border-line h-56 bg-bone">
            <iframe
              title={`${venue.name} — ${t("branches.map")}`}
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0"
            />
          </div>
        </section>

        <BookingSection venue={venue} />
      </main>
    </div>
  );
}
