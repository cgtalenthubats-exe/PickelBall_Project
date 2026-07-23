"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireActionRole, canAccessVenue, FORBIDDEN } from "@/lib/authz";

export type ErpActionState = { error?: string } | null;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Uploads a menu photo to the public "products" bucket and returns its URL.
// Returns undefined when no file was attached (keep the existing image),
// or an error string when the file is unusable.
async function uploadProductImage(
  fd: FormData,
  venueId: string,
): Promise<string | undefined | { error: string }> {
  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type))
    return { error: "รูปต้องเป็น PNG / JPG / WebP" };
  if (file.size > MAX_IMAGE_BYTES)
    return { error: "รูปใหญ่เกิน 4MB — ย่อก่อนอัปโหลด" };

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from("products")
    .upload(path, file, { contentType: file.type });
  if (error)
    return {
      error: /bucket.*not.*found/i.test(error.message)
        ? "ยังไม่ได้สร้าง storage bucket — รัน docs/migration-product-images.sql ก่อน"
        : error.message,
    };
  return supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
}

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

  const image = await uploadProductImage(fd, venueId);
  if (typeof image === "object" && image !== null) return image;

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    venue_id: venueId,
    name,
    category: String(fd.get("category") ?? "drink"),
    price: Number(fd.get("price") || 0),
    reorder_point: Number(fd.get("reorderPoint") || 5),
    image_url: image ?? null,
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

  const image = await uploadProductImage(fd, venueId);
  if (typeof image === "object" && image !== null) return image;

  const patch: Record<string, unknown> = {
    name: String(fd.get("name") ?? "").trim(),
    category: String(fd.get("category") ?? "drink"),
    price: Number(fd.get("price") || 0),
    reorder_point: Number(fd.get("reorderPoint") || 5),
    active: fd.get("active") === "on",
  };
  if (image) patch.image_url = image; // only overwrite when a new file came in

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);
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
