import { Plus, Pencil } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { pricingRules } from "@/lib/admin-mock";

export default function PricingPage() {
  return (
    <div>
      <PageTitle
        title="ราคาค่าเช่า"
        subtitle="ตั้งราคาต่อชั่วโมงตามช่วงเวลา (Peak / Off-peak) ของแต่ละสาขา"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Plus className="w-4 h-4" />
            เพิ่มกฎราคา
          </button>
        }
      />

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
