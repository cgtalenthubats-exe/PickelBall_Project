import { Plus, Pencil } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { getDbEquipment } from "@/lib/data/admin";

export default async function EquipmentPage() {
  const equipment = await getDbEquipment();

  return (
    <div>
      <PageTitle
        title="อุปกรณ์เช่า"
        subtitle="จัดการรายการอุปกรณ์ ราคาเช่า และสต็อกต่อรอบเวลา"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Plus className="w-4 h-4" />
            เพิ่มอุปกรณ์
          </button>
        }
      />

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">อุปกรณ์</th>
                <th className="font-normal px-3 py-3">สาขา</th>
                <th className="font-normal px-3 py-3 text-right">ราคาเช่า</th>
                <th className="font-normal px-3 py-3 text-right">สต็อก/รอบ</th>
                <th className="font-normal px-3 py-3">สถานะ</th>
                <th className="font-normal px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-line last:border-0 hover:bg-bone/50"
                >
                  <td className="px-5 py-3 text-ink">
                    {e.name}
                    {e.includedFree && (
                      <span className="ml-2">
                        <Badge tone="green">แถมฟรีในตัวจอง</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-taupe">{e.venueName}</td>
                  <td className="px-3 py-3 text-right tnum text-ink">
                    {e.includedFree ? "—" : `฿${e.price}`}
                  </td>
                  <td className="px-3 py-3 text-right tnum text-taupe">
                    {e.stockPerSlot}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={e.status === "active" ? "green" : "gray"}>
                      {e.status === "active" ? "พร้อมให้เช่า" : "ปิดชั่วคราว"}
                    </Badge>
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
    </div>
  );
}
