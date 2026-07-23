import { PageTitle, SectionCard, Badge } from "@/components/admin/kit";
import { requireAdminPage } from "@/lib/authz";
import { getProductsWithStock, getStockMovements } from "@/lib/data/erp";
import { getDbVenues } from "@/lib/data/admin";
import { AddProductForm, ProductsTable } from "@/components/admin/products-manager";

const REASON_LABEL: Record<string, string> = {
  stock_in: "รับของเข้า",
  sale: "ขาย",
  refund_return: "คืนของ (refund)",
  adjust: "ปรับสต็อก",
};

export default async function ProductsPage() {
  const ctx = await requireAdminPage("staff");
  const isManager = ctx.role !== "staff";
  const [products, movements, venues] = await Promise.all([
    getProductsWithStock(),
    getStockMovements(),
    isManager ? getDbVenues() : Promise.resolve([]),
  ]);
  const lowCount = products.filter((p) => p.low).length;

  return (
    <div>
      <PageTitle
        title="สินค้า & สต็อก"
        subtitle={
          lowCount > 0
            ? `มีสินค้าใกล้หมด ${lowCount} รายการ — ควรสั่งเพิ่ม`
            : "เมนูขายหน้าสนาม + สต็อกคงเหลือ (อัปเดตอัตโนมัติเมื่อขาย/รับของ)"
        }
        action={
          <AddProductForm
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            isManager={isManager}
          />
        }
      />

      <SectionCard title="รายการสินค้า">
        <div className="overflow-x-auto">
          <ProductsTable products={products} isManager={isManager} />
        </div>
      </SectionCard>

      <div className="mt-3">
        <SectionCard title="ความเคลื่อนไหวสต็อกล่าสุด">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">เวลา</th>
                  <th className="font-normal px-3 py-2.5">สินค้า</th>
                  <th className="font-normal px-3 py-2.5">ประเภท</th>
                  <th className="font-normal px-3 py-2.5 text-right">จำนวน</th>
                  <th className="font-normal px-3 py-2.5">หมายเหตุ</th>
                  <th className="font-normal px-5 py-2.5">โดย</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-taupe">
                      ยังไม่มีความเคลื่อนไหว
                    </td>
                  </tr>
                )}
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-taupe tnum">{m.at}</td>
                    <td className="px-3 py-2.5 text-ink">{m.product}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={m.change > 0 ? "green" : "gray"}>
                        {REASON_LABEL[m.reason] ?? m.reason}
                      </Badge>
                    </td>
                    <td className={`px-3 py-2.5 text-right tnum ${m.change > 0 ? "text-pine" : "text-clay"}`}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </td>
                    <td className="px-3 py-2.5 text-taupe">{m.note || "—"}</td>
                    <td className="px-5 py-2.5 text-taupe">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
