import { PageTitle, SectionCard } from "@/components/admin/kit";
import { getDbEquipment, getDbVenues } from "@/lib/data/admin";
import { AddEquipmentForm } from "@/components/admin/add-forms";
import { EquipmentTable } from "@/components/admin/equipment-table";

export default async function EquipmentPage() {
  const [equipment, venues] = await Promise.all([
    getDbEquipment(),
    getDbVenues(),
  ]);
  const venueOpts = venues.map((v) => ({ id: v.id, name: v.name }));

  return (
    <div>
      <PageTitle
        title="อุปกรณ์เช่า"
        subtitle="จัดการรายการอุปกรณ์ ราคาเช่า และสต็อกต่อรอบเวลา (แยกต่อสาขาได้)"
      />
      <AddEquipmentForm venues={venueOpts} />

      <SectionCard>
        <div className="overflow-x-auto">
          <EquipmentTable equipment={equipment} venues={venueOpts} />
        </div>
      </SectionCard>
    </div>
  );
}
