import { requireAdminPage } from "@/lib/authz";
import { PageTitle } from "@/components/admin/kit";
import { getStaff, getDbVenues } from "@/lib/data/admin";
import { StaffManager } from "@/components/admin/staff-manager";

export default async function StaffPage() {
  await requireAdminPage("venue_manager");
  const [staff, venues] = await Promise.all([getStaff(), getDbVenues()]);
  const venueOpts = venues.map((v) => ({ id: v.id, name: v.name }));

  return (
    <div>
      <PageTitle
        title="พนักงาน"
        subtitle="จัดการสิทธิ์ 3 ระดับ: ผู้ดูแลระบบ / ผู้จัดการสาขา / พนักงานหน้างาน"
      />
      <StaffManager staff={staff} venues={venueOpts} />
    </div>
  );
}
