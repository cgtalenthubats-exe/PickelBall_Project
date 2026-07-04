import { Search } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { customers } from "@/lib/admin-mock";

export default function CustomersPage() {
  return (
    <div>
      <PageTitle
        title="ลูกค้า (CRM)"
        subtitle="ประวัติการเล่น ยอดใช้จ่ายสะสม และการแบ่งกลุ่มลูกค้า"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 text-sm">
          <Search className="w-4 h-4 text-taupe" />
          <input
            placeholder="ค้นหาชื่อ / เบอร์โทร"
            className="bg-transparent outline-none placeholder:text-taupe/70 w-44"
          />
        </div>
        {["ทั้งหมด", "VIP", "ขาประจำ", "เสี่ยงหาย", "ใหม่"].map((seg, i) => (
          <button
            key={seg}
            className={`text-sm rounded-full px-3.5 py-1.5 transition-colors ${
              i === 0
                ? "bg-pine text-bone"
                : "border border-line text-ink hover:border-brass"
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">ลูกค้า</th>
                <th className="font-normal px-3 py-3 text-right">ครั้งที่เล่น</th>
                <th className="font-normal px-3 py-3 text-right">ยอดสะสม</th>
                <th className="font-normal px-3 py-3">มาล่าสุด</th>
                <th className="font-normal px-3 py-3 text-right">ไม่มา</th>
                <th className="font-normal px-5 py-3">กลุ่ม</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line last:border-0 hover:bg-bone/50"
                >
                  <td className="px-5 py-3">
                    <div className="text-ink">{c.name}</div>
                    <div className="text-xs text-taupe tnum">{c.phone}</div>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink">
                    {c.visits}
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink">
                    ฿{c.lifetimeSpend.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-taupe">{c.lastVisit}</td>
                  <td className="px-3 py-3 text-right tnum">
                    <span className={c.noShows >= 2 ? "text-clay" : "text-taupe"}>
                      {c.noShows}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge
                          key={t}
                          tone={
                            t === "VIP"
                              ? "brass"
                              : t === "เสี่ยงหาย"
                                ? "red"
                                : "gray"
                          }
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
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
