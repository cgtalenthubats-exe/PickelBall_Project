import { Clock, MapPin } from "lucide-react";
import { PageTitle, Badge } from "@/components/admin/kit";
import { getDbSessions, getSessionWaitlist } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";
import { AddSessionForm } from "@/components/admin/add-forms";
import { SessionWaitlist } from "@/components/admin/session-waitlist";

export default async function SessionsPage() {
  const sessions = await getDbSessions();
  const waitlists = Object.fromEntries(
    await Promise.all(
      sessions
        .filter((s) => s.waitlistCount > 0)
        .map(async (s) => [s.id, await getSessionWaitlist(s.id)] as const),
    ),
  );
  const supabase = await createClient();
  const { data: vs } = await supabase
    .from("venues")
    .select("id, name, courts(id,name)")
    .order("name");
  const venueOpts = (
    (vs ?? []) as unknown as {
      id: string;
      name: string;
      courts: { id: string; name: string }[];
    }[]
  ).map((v) => ({
    id: v.id,
    name: v.name,
    courts: (v.courts ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div>
      <PageTitle
        title="รอบ Open Play"
        subtitle="ตั้งรอบเล่นรวม กำหนดจำนวนที่รับ ระดับ และราคาต่อคน"
      />
      <AddSessionForm venues={venueOpts} />

      {sessions.length === 0 ? (
        <div className="text-center text-taupe text-sm py-16 border border-line rounded-2xl bg-surface">
          ยังไม่มีรอบ Open Play
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessions.map((s) => {
            const pct = Math.round((s.taken / s.capacity) * 100);
            const full = s.status === "full";
            return (
              <div
                key={s.id}
                className="rounded-2xl bg-surface border border-line p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-ink font-medium">
                      <Clock className="w-4 h-4 text-pine" />
                      <span className="tnum">
                        {s.dateLabel} · {s.timeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-taupe mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {s.venueName} · คอร์ท {s.courtName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-ink tnum">
                      ฿{s.price}
                    </div>
                    <div className="text-[11px] text-taupe">/ คน</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge tone="brass">{s.level}</Badge>
                  <Badge tone={full ? "red" : "green"}>
                    {full ? "เต็มแล้ว" : "เปิดรับ"}
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-taupe mb-1">
                    <span>จำนวนผู้เล่น</span>
                    <span className="tnum">
                      {s.taken}/{s.capacity}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bone overflow-hidden">
                    <div
                      className={`h-full rounded-full ${full ? "bg-clay" : "bg-pine"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 text-sm border border-line rounded-lg py-2 text-ink hover:border-brass transition-colors">
                    แก้ไข
                  </button>
                  <button className="flex-1 text-sm border border-line rounded-lg py-2 text-clay hover:border-clay transition-colors">
                    ยกเลิกรอบ
                  </button>
                </div>

                <SessionWaitlist entries={waitlists[s.id] ?? []} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
