-- ============================================================
-- MIGRATION: venue photo storage (Supabase Storage bucket)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Public bucket: venue photos are shown to customers on the branch list and
-- venue detail pages.
insert into storage.buckets (id, name, public)
values ('venues', 'venues', true)
on conflict (id) do nothing;

-- Anyone can view; only staff accounts can upload/replace/delete.
drop policy if exists "venue_images_read" on storage.objects;
create policy "venue_images_read" on storage.objects
  for select using (bucket_id = 'venues');

drop policy if exists "venue_images_write" on storage.objects;
create policy "venue_images_write" on storage.objects
  for insert with check (bucket_id = 'venues' and public.is_staff());

drop policy if exists "venue_images_update" on storage.objects;
create policy "venue_images_update" on storage.objects
  for update using (bucket_id = 'venues' and public.is_staff());

drop policy if exists "venue_images_delete" on storage.objects;
create policy "venue_images_delete" on storage.objects
  for delete using (bucket_id = 'venues' and public.is_staff());
