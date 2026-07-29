import { PageTitle, SectionCard } from "@/components/admin/kit";
import { requireAdminPage } from "@/lib/authz";
import { getDbVenues } from "@/lib/data/admin";
import { getSellableProductsForVenue } from "@/lib/data/erp";
import { getTodayBookingsForQr } from "@/lib/data/orders";
import { StaffOrderForm } from "@/components/admin/staff-order-form";

// Staff counter: build a cart for a walk-in / phone-in customer, optionally
// linked to today's court booking, then hand off to the payment QR screen.
export default async function NewStaffOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const ctx = await requireAdminPage("staff");
  const sp = await searchParams;
  const venues = await getDbVenues();

  const venueId = ctx.venueId ?? sp.venueId ?? venues[0]?.id ?? "";
  const showVenuePicker = ctx.venueId === null && venues.length > 1;

  const [items, allBookings] = await Promise.all([
    venueId ? getSellableProductsForVenue(venueId) : Promise.resolve([]),
    getTodayBookingsForQr(),
  ]);
  const courts = allBookings
    .filter((b) => b.venueId === venueId)
    .map((b) => ({ id: b.id, courtName: b.courtName, customer: b.customer, time: b.time }));

  return (
    <div>
      <PageTitle
        title="สร้างออเดอร์ (หน้าเคาน์เตอร์)"
        subtitle="สำหรับลูกค้าที่ซื้อของหน้าร้าน — จะผูกกับคอร์ทที่จองไว้หรือไม่ก็ได้"
      />

      {showVenuePicker && (
        <form className="mb-4 max-w-xs flex items-end gap-2">
          <label className="text-xs text-taupe flex-1">
            สาขา
            <select
              name="venueId"
              defaultValue={venueId}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brass"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-pine text-bone px-3 py-2 text-sm hover:bg-pine-deep transition-colors cursor-pointer"
          >
            เปลี่ยนสาขา
          </button>
        </form>
      )}

      <SectionCard title="ตะกร้าสินค้า">
        {venueId ? (
          <StaffOrderForm venueId={venueId} items={items} courts={courts} />
        ) : (
          <p className="text-sm text-taupe">ยังไม่มีสาขาให้เลือก</p>
        )}
      </SectionCard>
    </div>
  );
}
