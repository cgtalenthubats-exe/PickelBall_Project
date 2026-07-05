import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bkkTime } from "@/lib/fmt";
import { SiteHeader } from "@/components/site-header";
import { BookingConfirm } from "@/components/booking-confirm";
import { Link } from "@/i18n/navigation";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; venueId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale, venueId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  let display;
  let booking;

  if (sp.type === "open_play") {
    const { data: s } = await supabase
      .from("open_play_sessions")
      .select(
        "id, start_time, end_time, capacity, price_per_person, skill_level, venues(name), courts(name)",
      )
      .eq("id", sp.sessionId)
      .single();
    if (!s) notFound();
    const row = s as unknown as {
      id: string;
      start_time: string;
      end_time: string;
      capacity: number;
      price_per_person: number;
      skill_level: string | null;
      venues: { name: string } | null;
      courts: { name: string } | null;
    };
    display = {
      type: "open_play" as const,
      venueName: row.venues?.name ?? "",
      start: bkkTime(row.start_time),
      end: bkkTime(row.end_time),
      court: row.courts?.name ?? "",
      level: row.skill_level ?? "All Level",
      price: Number(row.price_per_person),
      maxSeats: row.capacity,
    };
    booking = { type: "open_play", venueId: sp.venueId, sessionId: row.id };
  } else {
    const { data: v } = await supabase
      .from("venues")
      .select("name")
      .eq("id", sp.venueId)
      .single();
    display = {
      type: "private" as const,
      venueName: v?.name ?? "",
      start: sp.start,
      end: sp.end,
      court: decodeURIComponent(sp.courtName ?? ""),
      level: null,
      price: Number(sp.price),
      maxSeats: 1,
    };
    booking = {
      type: "private",
      venueId: sp.venueId,
      courtId: sp.courtId,
      date: sp.date,
      start: sp.start,
      end: sp.end,
      price: sp.price,
    };
  }

  const { data: eq } = await supabase
    .from("equipment")
    .select("id, name, rental_price, is_included_free, stock_per_slot")
    .eq("status", "active")
    .order("name");
  const addons = (eq ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    price: Number(e.rental_price),
    includedFree: e.is_included_free as boolean,
    stockPerSlot: e.stock_per_slot as number,
  }));

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
        <BookingConfirm display={display} addons={addons} booking={booking} />
      </main>
    </div>
  );
}
