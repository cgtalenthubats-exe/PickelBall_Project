import { requireAdminPage } from "@/lib/authz";
import { PageTitle } from "@/components/admin/kit";
import { getDbVenues } from "@/lib/data/admin";
import { AddVenueForm } from "@/components/admin/add-forms";
import { VenuesManager } from "@/components/admin/venues-manager";

export default async function VenuesPage() {
  await requireAdminPage("venue_manager");
  const venues = await getDbVenues();

  return (
    <div>
      <PageTitle
        title="จัดการสาขา"
        subtitle="เพิ่ม แก้ไข และปักหมุดตำแหน่งของแต่ละสาขา"
      />
      <AddVenueForm />
      <VenuesManager venues={venues} />
    </div>
  );
}
