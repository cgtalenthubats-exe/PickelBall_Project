import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CalendarClock,
  Users,
  CreditCard,
  MessageCircle,
  Star,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { LandingHero } from "@/components/landing-hero";
import { Reveal } from "@/components/reveal";
import {
  InteractiveSelector,
  type SelectorStep,
} from "@/components/ui/interactive-selector";
import { venues } from "@/lib/mock";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const features = [
    { Icon: CalendarClock, id: "realtime" },
    { Icon: Users, id: "modes" },
    { Icon: CreditCard, id: "pay" },
    { Icon: MessageCircle, id: "notify" },
  ] as const;

  const steps: SelectorStep[] = [
    {
      number: "01",
      title: t("how.step1.title"),
      desc: t("how.step1.desc"),
      image: "/how/step1.png",
      icon: "search",
    },
    {
      number: "02",
      title: t("how.step2.title"),
      desc: t("how.step2.desc"),
      image: "/how/step2.png",
      icon: "calendar",
    },
    {
      number: "03",
      title: t("how.step3.title"),
      desc: t("how.step3.desc"),
      image: "/how/step3.png",
      icon: "card",
    },
  ];

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <LandingHero />

      {/* Stats strip */}
      <Reveal>
        <div className="max-w-3xl mx-auto w-full px-5">
          <div className="grid grid-cols-3 rounded-2xl bg-pine text-bone divide-x divide-white/10 overflow-hidden">
            {[
              { n: "28", label: t("hero.statCourts") },
              { n: "1,240", label: t("hero.statGames") },
              { n: "4.8", label: t("hero.statRating") },
            ].map((s) => (
              <div key={s.label} className="px-4 py-5 text-center">
                <div className="font-display text-2xl font-bold tnum">{s.n}</div>
                <div className="text-[11px] text-bone/70 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Features */}
      <section className="max-w-3xl mx-auto w-full px-5 pt-16">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center">
            {t("features.title")}
          </h2>
          <p className="text-taupe text-center text-sm mt-2">
            {t("features.subtitle")}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
          {features.map(({ Icon, id }, i) => (
            <Reveal key={id} delay={i * 80}>
              <div className="h-full rounded-2xl bg-surface border border-line p-5 hover:border-brass transition-colors">
                <div className="w-10 h-10 rounded-xl bg-bone flex items-center justify-center">
                  <Icon className="w-5 h-5 text-pine" />
                </div>
                <h3 className="font-display text-lg text-ink mt-3">
                  {t(`features.${id}.title`)}
                </h3>
                <p className="text-sm text-taupe leading-relaxed mt-1">
                  {t(`features.${id}.desc`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section className="max-w-3xl mx-auto w-full px-5 pt-16">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center">
            {t("modes.title")}
          </h2>
          <p className="text-taupe text-center text-sm mt-2">
            {t("modes.subtitle")}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
          <Reveal>
            <div className="rounded-2xl bg-surface border border-line border-t-[3px] border-t-brass p-5 h-full">
              <span className="text-[11px] text-brass bg-bone rounded-full px-2.5 py-1">
                {t("modes.private.tag")}
              </span>
              <h3 className="font-display text-xl text-pine mt-3">
                {t("modes.private.title")}
              </h3>
              <p className="text-sm text-taupe leading-relaxed mt-1.5">
                {t("modes.private.desc")}
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="rounded-2xl bg-surface border border-line border-t-[3px] border-t-pine p-5 h-full">
              <span className="text-[11px] text-pine bg-lime-soft rounded-full px-2.5 py-1">
                {t("modes.open.tag")}
              </span>
              <h3 className="font-display text-xl text-pine mt-3">
                {t("modes.open.title")}
              </h3>
              <p className="text-sm text-taupe leading-relaxed mt-1.5">
                {t("modes.open.desc")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-3xl mx-auto w-full px-5 pt-16 scroll-mt-6">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center">
            {t("how.title")}
          </h2>
          <p className="text-taupe text-center text-sm mt-2">
            {t("how.hint")}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-7">
            <InteractiveSelector steps={steps} />
          </div>
        </Reveal>
      </section>

      {/* Featured venues */}
      <section className="max-w-3xl mx-auto w-full px-5 pt-16">
        <Reveal>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink text-center">
            {t("featured.title")}
          </h2>
          <p className="text-taupe text-center text-sm mt-2">
            {t("featured.subtitle")}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
          {venues.map((v, i) => (
            <Reveal key={v.id} delay={i * 80}>
              <Link
                href={`/venues/${v.id}`}
                className="group block rounded-2xl bg-surface border border-line overflow-hidden hover:border-brass transition-colors h-full"
              >
                <div className="relative h-32 bg-pine/10 overflow-hidden">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 240px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base text-pine leading-tight">
                    {v.name}
                  </h3>
                  <div className="flex items-center gap-3 text-taupe text-xs mt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {v.area}
                    </span>
                    <span className="flex items-center gap-1 tnum">
                      <Star className="w-3.5 h-3.5 text-brass" />
                      {v.rating}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-pine font-medium mt-3 group-hover:gap-2 transition-all">
                    {t("featured.viewSlots")}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-3xl mx-auto w-full px-5 pt-16 pb-16">
        <Reveal>
          <div className="rounded-3xl bg-pine text-bone px-6 py-10 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              {t("cta.title")}
            </h2>
            <p className="text-bone/75 text-sm mt-2 max-w-md mx-auto">
              {t("cta.subtitle")}
            </p>
            <Link
              href="/venues/ladprao"
              className="inline-flex items-center gap-2 bg-bone text-pine text-sm font-medium rounded-xl px-6 py-3 mt-6 hover:bg-white transition-colors"
            >
              {t("cta.button")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-3xl mx-auto w-full px-5 py-8 flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-bold text-pine">
              {t("brand")}
            </div>
            <div className="text-xs text-taupe mt-0.5">{t("footer.tagline")}</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-taupe">
            <Link href="/bookings" className="hover:text-pine">
              การจองของฉัน
            </Link>
            <Link href="/admin" className="hover:text-pine">
              ระบบหลังบ้าน
            </Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
