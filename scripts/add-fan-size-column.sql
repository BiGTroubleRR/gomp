-- Run this once against the Supabase project's SQL editor (or via `psql`/the Supabase CLI).
--
-- Adds the size column for the new 'fan' catalog category (see Category in
-- src/lib/component-db-seed.ts) — a fan SKU comes in exactly one physical size, matched against
-- a case's fan_mounts[].sizesMm to decide which mount positions it fits. No backfill needed:
-- existing rows are all non-fan categories, where this column is simply unused (null).
alter table public.components
  add column if not exists fan_size_mm numeric(5, 1);

-- The original category check constraint predates the new 'fan' category and would reject
-- every fan row's insert without this.
alter table public.components drop constraint if exists components_category_check;
alter table public.components add constraint components_category_check
  check (category in ('mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case', 'fan'));
