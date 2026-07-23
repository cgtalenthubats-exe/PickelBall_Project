-- ============================================================
-- MIGRATION: safety stock + cart-style stock reservation
-- Requires migration-erp.sql + migration-pos-orders.sql.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Buffer that is NEVER sold — absorbs the usual physical/system drift
-- ("ของไม่ตรง"). Sellable = ledger balance - safety_stock. Different from
-- reorder_point (which only *warns* when to restock).
alter table public.products
  add column if not exists safety_stock int not null default 0;

-- Reservation hold: a picked-but-unpaid order returns its stock after this.
alter table public.orders
  add column if not exists reserve_expires_at timestamptz;

-- Atomic reservation for a whole order. Locks each product row so two
-- concurrent orders for the last unit can't both succeed (same guarantee as
-- the Open Play capacity trigger, but for a running product count).
-- p_items = jsonb array of { "product_id": uuid, "qty": int }.
-- Raises 'insufficient_stock:<name>' if any line can't be covered, which
-- rolls back every reservation made in this call.
create or replace function public.reserve_order_stock(
  p_order uuid,
  p_venue uuid,
  p_items jsonb
) returns void language plpgsql as $$
declare
  item     jsonb;
  v_prod   uuid;
  v_qty    int;
  v_safety int;
  v_name   text;
  v_bal    int;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_prod := (item->>'product_id')::uuid;
    v_qty  := (item->>'qty')::int;

    -- Serialize concurrent reservations of the same product here.
    select safety_stock, name into v_safety, v_name
      from public.products where id = v_prod for update;
    if v_name is null then
      raise exception 'product_not_found';
    end if;

    select coalesce(sum(change), 0) into v_bal
      from public.stock_ledger where product_id = v_prod;

    if v_bal - coalesce(v_safety, 0) < v_qty then
      raise exception 'insufficient_stock:%', v_name;
    end if;

    insert into public.stock_ledger(product_id, venue_id, change, reason, ref_id)
      values (v_prod, p_venue, -v_qty, 'reserved', p_order);
  end loop;
end $$;
