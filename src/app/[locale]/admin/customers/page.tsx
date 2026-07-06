import { PageTitle } from "@/components/admin/kit";
import { getAdminCustomers } from "@/lib/data/admin";
import { CustomersTable } from "@/components/admin/customers-table";

export default async function CustomersPage() {
  const customers = await getAdminCustomers();
  return (
    <div>
      <PageTitle
        title="ลูกค้า (CRM)"
        subtitle="ประวัติการเล่น ยอดใช้จ่ายสะสม และการแบ่งกลุ่มลูกค้า"
      />
      <CustomersTable customers={customers} />
    </div>
  );
}
