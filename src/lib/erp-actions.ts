"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireActionRole, canAccessVenue, FORBIDDEN } from "@/lib/authz";

export type ErpActionState = { error?: string } | null;

// ---------- products (menu) — manager+ of the venue ----------

export async function createProduct(
  _prev: ErpActionState,
  fd: FormData,
): Promise<ErpActionState> {
  const venueId = String(fd.get("venueId") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!venueId) return { error: "กรุณาเลือกสาขา" };
  if (!name) return { error: "กรุณากรอกชื่อสินค้า" };
  const ctx = await requireActionRole("venue_manager");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    venue_id: venueId,
    name,
    category: String(fd.get("category") ?? "drink"),
    price: Number(fd.get("price") || 0),
    reorder_point: Number(fd.get("reorderPoint") || 5),
    active: true,
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/products`);
}

export async function updateProduct(
  _prev: ErpActionState,
  fd: FormData,
): Promise<ErpActionState> {
  const id = String(fd.get("id") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  if (!id) return { error: "ไม่พบสินค้า" };
  const ctx = await requireActionRole("venue_manager");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: String(fd.get("name") ?? "").trim(),
      category: String(fd.get("category") ?? "drink"),
      price: Number(fd.get("price") || 0),
      reorder_point: Number(fd.get("reorderPoint") || 5),
      active: fd.get("active") === "on",
    })
    .eq("id", id);
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/products`);
}

// ---------- stock movements — any staff of the venue ----------

// kind: 'stock_in' (รับของเข้า, positive qty) | 'adjust' (ปรับ +/-, e.g. ของเสีย/นับใหม่)
export async function recordStockMove(
  _prev: ErpActionState,
  fd: FormData,
): Promise<ErpActionState> {
  const productId = String(fd.get("productId") ?? "");
  const venueId = String(fd.get("venueId") ?? "");
  const kind = String(fd.get("kind") ?? "stock_in");
  let qty = Number(fd.get("qty") || 0);
  if (!productId || !venueId) return { error: "ไม่พบสินค้า" };
  if (!Number.isInteger(qty) || qty === 0)
    return { error: "จำนวนต้องเป็นเลขจำนวนเต็ม และไม่เป็นศูนย์" };
  if (kind === "stock_in" && qty < 0)
    return { error: "รับของเข้า จำนวนต้องเป็นบวก" };
  if (kind !== "stock_in" && kind !== "adjust")
    return { error: "ประเภทรายการไม่ถูกต้อง" };

  const ctx = await requireActionRole("staff");
  if (!ctx || !canAccessVenue(ctx, venueId)) return { error: FORBIDDEN };

  // Adjustments can go negative but never below zero total stock.
  const supabase = await createClient();
  if (qty < 0) {
    const { data: ledger } = await supabase
      .from("stock_ledger")
      .select("change")
      .eq("product_id", productId);
    const balance = (ledger ?? []).reduce((s, l) => s + l.change, 0);
    if (balance + qty < 0) qty = -balance;
    if (qty === 0) return { error: "สต็อกเป็นศูนย์อยู่แล้ว" };
  }

  const { error } = await supabase.from("stock_ledger").insert({
    product_id: productId,
    venue_id: venueId,
    change: qty,
    reason: kind,
    note: String(fd.get("note") ?? "") || null,
    created_by: ctx.userId,
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/admin/products`);
}
