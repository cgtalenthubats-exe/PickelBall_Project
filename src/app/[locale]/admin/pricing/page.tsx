import { Pencil } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { getPricingRules } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";
import { AddPricingForm } from "@/components/admin/add-forms";

export default async function PricingPage() {
  const pricingRules = await getPricingRules();
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
    courts: (v.courts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div>
      <PageTitle
        title="ราคาค่าเช่า"
        subtitle="ตั้งราคาต่อชั่วโมงตามช่วงเวลา (Peak / Off-peak) ของแต่ละสาขา"
      />
      <AddPricingForm venues={venueOpts} />

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">สาขา</th>
                <th className="font-normal px-3 py-3">คอร์ท</th>
                <th className="font-normal px-3 py-3">วัน</th>
                <th className="font-normal px-3 py-3">ช่วงเวลา</th>
                <th className="font-normal px-3 py-3">ประเภท</th>
                <th className="font-normal px-3 py-3 text-right">ราคา/ชม.</th>
                <th className="font-normal px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-taupe">
                    ยังไม่มีกฎราคา — ราคาปัจจุบันใช้ค่าเริ่มต้น ฿400/ชม. (Peak ฿500)
                  </td>
                </tr>
              )}
              {pricingRules.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line last:border-0 hover:bg-bone/50"
                >
                  <td className="px-5 py-3 text-ink">{r.venue}</td>
                  <td className="px-3 py-3 text-taupe">{r.court}</td>
                  <td className="px-3 py-3 text-taupe">{r.days}</td>
                  <td className="px-3 py-3 tnum text-taupe">{r.time}</td>
                  <td className="px-3 py-3">
                    <Badge tone={r.label === "peak" ? "brass" : "gray"}>
                      {r.label === "peak" ? "Peak" : "Off-peak"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink font-medium">
                    ฿{r.price.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="inline-flex items-center gap-1 text-xs text-brass hover:text-pine transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="text-xs text-taupe mt-3">
        หมายเหตุ: ราคา Open Play ตั้งแยกต่อรอบในหน้า “รอบ Open Play”
      </p>
    </div>
  );
}
