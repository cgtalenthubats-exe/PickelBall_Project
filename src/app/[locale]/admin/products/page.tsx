import { PageTitle, SectionCard, StatCard, Badge } from "@/components/admin/kit";
import { requireAdminPage } from "@/lib/authz";
import { getProductsWithStock, getStockMovements, getStockValuation } from "@/lib/data/erp";
import { getDbVenues } from "@/lib/data/admin";
import { AddProductForm, ProductsTable } from "@/components/admin/products-manager";

const REASON_LABEL: Record<string, string> = {
  stock_in: "รับของเข้า",
  sale: "ขาย",
  reserved: "จองไว้ (รอชำระ)",
  reserved_void: "ยกเลิกการจอง",
  reserve_release: "คืนของที่จองไว้",
  refund_return: "คืนของ (refund)",
  adjust: "ปรับสต็อก",
};

export default async function ProductsPage() {
  const ctx = await requireAdminPage("staff");
  const isManager = ctx.role !== "staff";
  const [products, movements, venues, valuation] = await Promise.all([
    getProductsWithStock(),
    getStockMovements(),
    isManager ? getDbVenues() : Promise.resolve([]),
    getStockValuation(),
  ]);
  const lowCount = products.filter((p) => p.low).length;
  // Existing category names in this scope, to seed the datalist.
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

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
            categories={categories}
            isManager={isManager}
          />
        }
      />

      <SectionCard title="รายการสินค้า">
        <div className="overflow-x-auto">
          <ProductsTable
            products={products}
            categories={categories}
            isManager={isManager}
          />
        </div>
      </SectionCard>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <StatCard label="มูลค่าสต็อกคงเหลือรวม" value={`฿${valuation.total.toLocaleString()}`} />
      </div>

      <div className="mt-3">
        <SectionCard title="มูลค่าสต็อกคงเหลือ (ตามต้นทุนเฉลี่ยตอนรับเข้า)">
          {valuation.incomplete && (
            <p className="text-xs text-taupe px-5 pt-4">
              * มีสินค้าบางรายการที่มีสต็อกอยู่แต่ยังไม่เคยกรอกต้นทุนตอนรับเข้า มูลค่ารวมนี้จึงอาจต่ำกว่าความเป็นจริง (กรอกต้นทุนต่อหน่วยตอนรับสต็อกเพื่อความแม่นยำ)
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-taupe text-xs border-b border-line">
                  <th className="font-normal px-5 py-2.5">สินค้า</th>
                  <th className="font-normal px-3 py-2.5">สาขา</th>
                  <th className="font-normal px-3 py-2.5 text-right">คงเหลือ</th>
                  <th className="font-normal px-3 py-2.5 text-right">ต้นทุนเฉลี่ย/หน่วย</th>
                  <th className="font-normal px-5 py-2.5 text-right">มูลค่ารวม</th>
                </tr>
              </thead>
              <tbody>
                {valuation.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-taupe">
                      ยังไม่มีสต็อกคงเหลือ
                    </td>
                  </tr>
                )}
                {valuation.rows.map((r) => (
                  <tr key={r.productId} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-ink">{r.name}</td>
                    <td className="px-3 py-2.5 text-taupe">{r.venueName}</td>
                    <td className="px-3 py-2.5 text-right tnum text-ink">{r.qty.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tnum text-taupe">
                      {r.hasCost ? `฿${r.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right tnum text-ink">฿{r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

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
                  <th className="font-normal px-3 py-2.5">เอกสาร/ผู้ส่ง</th>
                  <th className="font-normal px-3 py-2.5">หมายเหตุ</th>
                  <th className="font-normal px-5 py-2.5">โดย</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-taupe">
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
                    <td className="px-3 py-2.5 text-taupe text-xs">
                      {m.docRef || m.supplier ? (
                        <>
                          {m.docRef && <div className="tnum">{m.docRef}</div>}
                          {m.supplier && <div>{m.supplier}</div>}
                          {m.receivedDate && <div className="tnum">{m.receivedDate}</div>}
                        </>
                      ) : (
                        "—"
                      )}
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
