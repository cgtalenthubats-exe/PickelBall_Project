-- ============================================================
-- MIGRATION: product image storage (Supabase Storage bucket)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Public bucket: menu images are shown to customers on the QR order page.
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Anyone can view; only staff accounts can upload/replace/delete.
drop policy if exists "products_images_read" on storage.objects;
create policy "products_images_read" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "products_images_write" on storage.objects;
create policy "products_images_write" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_staff());

drop policy if exists "products_images_update" on storage.objects;
create policy "products_images_update" on storage.objects
  for update using (bucket_id = 'products' and public.is_staff());

drop policy if exists "products_images_delete" on storage.objects;
create policy "products_images_delete" on storage.objects
  for delete using (bucket_id = 'products' and public.is_staff());
