import { PageTitle, SectionCard } from "@/components/admin/kit";
import { requireAdminPage } from "@/lib/authz";
import { getExpenses, getDbVenues } from "@/lib/data/admin";
import { AddExpenseForm, ExpensesTable } from "@/components/admin/expenses-manager";

export default async function ExpensesPage() {
  const ctx = await requireAdminPage("venue_manager");
  const [expenses, venues] = await Promise.all([getExpenses(), getDbVenues()]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageTitle
        title="รายจ่าย"
        subtitle="บันทึกค่าใช้จ่ายของแต่ละสาขา (ค่าเช่า ค่าน้ำค่าไฟ ค่าจ้าง ฯลฯ) — ใช้คำนวณงบกำไรขาดทุนในหน้ารายงาน"
        action={
          <AddExpenseForm
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            isSuperAdmin={ctx.role === "super_admin"}
          />
        }
      />

      <SectionCard title={`รายการรายจ่าย (รวม ฿${total.toLocaleString()})`}>
        <div className="overflow-x-auto">
          <ExpensesTable expenses={expenses} />
        </div>
      </SectionCard>
    </div>
  );
}
