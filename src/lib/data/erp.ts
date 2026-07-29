import { createClient } from "@/lib/supabase/server";
import { requireActionRole, canAccessVenue } from "@/lib/authz";

export interface ProductRow {
  id: string;
  venueId: string;
  venueName: string;
  name: string;
  category: string;
  price: number;
  reorderPoint: number;
  active: boolean;
  imageUrl: string | null;
  stock: number;        // ledger balance (physical-ish)
  safetyStock: number;  // buffer never sold
  sellable: number;     // stock - safetyStock (what customers can order)
  low: boolean;
}

// Products + live stock balances for the admin page, scoped to the caller's
// branch (super_admin sees all).
export async function getProductsWithStock(): Promise<ProductRow[]> {
  const supabase = await createClient();
  const ctx = await requireActionRole("staff");
  const scope = ctx?.venueId ?? null;

  let q = supabase
    .from("products")
    .select("id, venue_id, name, category, price, reorder_point, safety_stock, active, image_url, venues(name)")
    .order("name");
  if (scope) q = q.eq("venue_id", scope);
  const { data: products } = await q;
  const rows = (products ?? []) as unknown as {
    id: string;
    venue_id: string;
    name: string;
    category: string;
    price: number;
    reorder_point: number;
    safety_stock: number;
    active: boolean;
    image_url: string | null;
    venues: { name: string } | null;
  }[];
  if (rows.length === 0) return [];

  const { data: ledger } = await supabase
    .from("stock_ledger")
    .select("product_id, change")
    .in("product_id", rows.map((p) => p.id));
  const balance: Record<string, number> = {};
  (ledger ?? []).forEach((l) => {
    balance[l.product_id] = (balance[l.product_id] ?? 0) + l.change;
  });

  return rows.map((p) => {
    const stock = balance[p.id] ?? 0;
    return {
      id: p.id,
      venueId: p.venue_id,
      venueName: p.venues?.name ?? "—",
      name: p.name,
      category: p.category,
      price: Number(p.price),
      reorderPoint: p.reorder_point,
      active: p.active,
      imageUrl: p.image_url,
      stock,
      safetyStock: p.safety_stock ?? 0,
      sellable: stock - (p.safety_stock ?? 0),
      low: stock < p.reorder_point,
    };
  });
}

// Sellable menu of one specific venue — for the staff "New order" (POS
// counter) form, where the venue may be explicitly chosen (super_admin)
// rather than always the caller's own.
export async function getSellableProductsForVenue(venueId: string) {
  const ctx = await requireActionRole("staff");
  if (!ctx || !canAccessVenue(ctx, venueId)) return [];
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price, image_url, safety_stock")
    .eq("venue_id", venueId)
    .eq("active", true)
    .order("name");
  const ids = (products ?? []).map((p) => p.id);
  const stock: Record<string, number> = {};
  if (ids.length) {
    const { data: ledger } = await supabase
      .from("stock_ledger")
      .select("product_id, change")
      .in("product_id", ids);
    (ledger ?? []).forEach((l) => {
      stock[l.product_id] = (stock[l.product_id] ?? 0) + l.change;
    });
  }
  return (products ?? []).map((p) => {
    const sellable = (stock[p.id] ?? 0) - (p.safety_stock ?? 0);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      imageUrl: p.image_url as string | null,
      available: Math.max(0, sellable),
    };
  });
}

// Recent stock movements (for the audit trail section of the stock page).
export async function getStockMovements(limit = 30) {
  const supabase = await createClient();
  const ctx = await requireActionRole("staff");
  const scope = ctx?.venueId ?? null;

  let q = supabase
    .from("stock_ledger")
    .select("id, change, reason, note, doc_ref, supplier, received_date, created_at, products(name), profiles(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (scope) q = q.eq("venue_id", scope);
  const { data } = await q;
  return ((data ?? []) as unknown as {
    id: string;
    change: number;
    reason: string;
    note: string | null;
    doc_ref: string | null;
    supplier: string | null;
    received_date: string | null;
    created_at: string;
    products: { name: string } | null;
    profiles: { name: string | null } | null;
  }[]).map((m) => ({
    id: m.id,
    product: m.products?.name ?? "—",
    docRef: m.doc_ref ?? "",
    supplier: m.supplier ?? "",
    receivedDate: m.received_date ?? "",
    change: m.change,
    reason: m.reason,
    note: m.note ?? "",
    by: m.profiles?.name ?? "—",
    at: new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date(m.created_at)),
  }));
}
