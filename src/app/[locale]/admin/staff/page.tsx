import { Plus, Pencil } from "lucide-react";
import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { roleLabels } from "@/lib/admin-mock";
import { getStaff } from "@/lib/data/admin";

export default async function StaffPage() {
  const staff = await getStaff();
  return (
    <div>
      <PageTitle
        title="พนักงาน"
        subtitle="จัดการสิทธิ์ 3 ระดับ: ผู้ดูแลระบบ / ผู้จัดการสาขา / พนักงานหน้างาน"
        action={
          <button className="inline-flex items-center gap-2 text-sm bg-pine text-bone rounded-xl px-4 py-2 hover:bg-pine-deep transition-colors">
            <Plus className="w-4 h-4" />
            เพิ่มพนักงาน
          </button>
        }
      />

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-taupe text-xs border-b border-line">
                <th className="font-normal px-5 py-3">ชื่อ</th>
                <th className="font-normal px-3 py-3">สิทธิ์</th>
                <th className="font-normal px-3 py-3">สาขาที่ดูแล</th>
                <th className="font-normal px-3 py-3">สถานะ</th>
                <th className="font-normal px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-taupe">
                    ยังไม่มีทีมงาน — เลื่อนบัญชีเป็นแอดมินใน SQL (ดู docs/auth-setup.md)
                  </td>
                </tr>
              )}
              {staff.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line last:border-0 hover:bg-bone/50"
                >
                  <td className="px-5 py-3 text-ink">{s.name}</td>
                  <td className="px-3 py-3">
                    <Badge
                      tone={
                        s.role === "super_admin"
                          ? "pine"
                          : s.role === "venue_manager"
                            ? "brass"
                            : "gray"
                      }
                    >
                      {roleLabels[s.role]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-taupe">{s.venues}</td>
                  <td className="px-3 py-3">
                    <Badge tone={s.status === "active" ? "green" : "gray"}>
                      {s.status === "active" ? "ใช้งาน" : "ปิดใช้งาน"}
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
