import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Navigation, ArrowRight, LayoutGrid } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import {
  getCustomerVenues,
  type CustomerVenueSummary,
} from "@/lib/data/customer";
import { venues as mockVenues } from "@/lib/mock";

// Build a Google Maps link that works from the visitor's browser without an
// API key — coordinates when available, otherwise a name/address text search.
function mapsHref(v: CustomerVenueSummary) {
  const q =
    v.lat != null && v.lng != null
      ? `${v.lat},${v.lng}`
      : `${v.name} ${v.address ?? v.area}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// Fallback used when Supabase has no venues yet (e.g. fresh env / preview).
function mockSummaries(): CustomerVenueSummary[] {
  return mockVenues.map((v) => ({
    id: v.id,
    slug: v.id,
    name: v.name,
    area: v.area,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    image: v.image,
    amenities: v.amenities,
    courtCount: new Set(v.slots.map((s) => s.court)).size,
  }));
}

export default async function VenuesIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const fetched = await getCustomerVenues();
  const list = fetched.length > 0 ? fetched : mockSummaries();

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-3xl mx-auto w-full px-5 pb-16">
        <Reveal>
          <div className="pt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-brass bg-bone rounded-full px-2.5 py-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("branches.count", { count: list.length })}
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-pine mt-3">
              {t("branches.title")}
            </h1>
            <p className="text-taupe text-sm mt-2 max-w-lg">
              {t("branches.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
          {list.map((v, i) => (
            <Reveal key={v.id} delay={i * 80}>
              <div className="group flex flex-col h-full rounded-2xl bg-surface border border-line overflow-hidden hover:border-brass transition-colors">
                <Link
                  href={`/venues/${v.slug}`}
                  className="relative block h-40 bg-pine/10 overflow-hidden"
                >
                  {v.image ? (
                    <Image
                      src={v.image}
                      alt={v.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pine to-pine-deep" />
                  )}
                  <span className="absolute bottom-3 left-3 text-bone/95 text-xs bg-black/30 rounded-full px-2.5 py-1 backdrop-blur-sm">
                    {t("branches.courts", { count: v.courtCount })}
                  </span>
                </Link>

                <div className="flex flex-col flex-1 p-4">
                  <Link href={`/venues/${v.slug}`}>
                    <h2 className="font-display text-lg text-pine leading-tight group-hover:text-pine-deep transition-colors">
                      {v.name}
                    </h2>
                  </Link>
                  <p className="flex items-start gap-1.5 text-taupe text-xs mt-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{v.address ?? v.area}</span>
                  </p>

                  {v.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {v.amenities.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="text-[11px] text-taupe bg-bone rounded-full px-2 py-0.5"
                        >
                          {a}
                        </span>
                      ))}
                      {v.amenities.length > 4 && (
                        <span className="text-[11px] text-taupe px-1 py-0.5">
                          +{v.amenities.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                    <a
                      href={mapsHref(v)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-taupe hover:text-pine transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {t("branches.navigate")}
                    </a>
                    <Link
                      href={`/venues/${v.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-pine font-medium group-hover:gap-2 transition-all"
                    >
                      {t("branches.viewAndBook")}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
