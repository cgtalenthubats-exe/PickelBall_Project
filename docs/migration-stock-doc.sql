-- ============================================================
-- MIGRATION: stock-in paper trail (invoice/document ref, supplier, date)
-- Requires migration-erp.sql. Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

alter table public.stock_ledger add column if not exists doc_ref text;
alter table public.stock_ledger add column if not exists supplier text;
alter table public.stock_ledger add column if not exists received_date date;
