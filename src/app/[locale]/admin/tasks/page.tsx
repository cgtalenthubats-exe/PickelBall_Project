import { Plus, Check } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { tasks, type StaffTask } from "@/lib/admin-mock";

const categoryMeta: Record<
  StaffTask["category"],
  { label: string; tone: "green" | "brass" | "gray" }
> = {
  cleaning: { label: "ทำความสะอาด", tone: "green" },
  prep: { label: "เตรียมพื้นที่", tone: "brass" },
  check: { label: "ตรวจเช็ค", tone: "gray" },
};

export default function TasksPage() {
  const venuesList = Array.from(new Set(tasks.map((t) => t.venue)));

  return (
    <div>
      <PageTitle
        title="ตารางงาน"
        subtitle="งานเตรียมพื้นที่และคิวทำความสะอาดต่อสาขา/คอร์ท (แสดงให้พนักงานดู)"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Plus className="w-4 h-4" />
            เพิ่มงาน
          </button>
        }
      />

      <div className="space-y-3">
        {venuesList.map((venue) => (
          <SectionCard key={venue} title={venue}>
            <div className="divide-y divide-line">
              {tasks
                .filter((t) => t.venue === venue)
                .map((t) => {
                  const cat = categoryMeta[t.category];
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          t.done
                            ? "bg-pine border-pine text-bone"
                            : "border-line"
                        }`}
                      >
                        {t.done && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span className="tnum text-sm text-taupe w-12 shrink-0">
                        {t.time}
                      </span>
                      <span
                        className={`flex-1 text-sm ${t.done ? "text-taupe line-through" : "text-ink"}`}
                      >
                        {t.title}
                      </span>
                      <span className="text-xs text-taupe shrink-0 hidden sm:block">
                        คอร์ท {t.court}
                      </span>
                      <Badge tone={cat.tone}>{cat.label}</Badge>
                    </div>
                  );
                })}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
