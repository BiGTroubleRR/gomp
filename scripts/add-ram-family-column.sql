-- Run this once against the Supabase project's SQL editor (or via `psql`/the Supabase CLI)
-- before running `node scripts/import-ram-variants.mjs --apply` again, and before the /build
-- RAM stick-count grouping feature can find any grouped rows in production.
--
-- Adds the column the RAM picker uses to group same-product rows that only differ by stick
-- count (1x/2x/4x of the same manufacturer+speed+per-stick-capacity) into one card with a
-- stick-count selector. Rows with ram_family = NULL simply render as their own single-variant
-- group, so this is safe to run against the existing table with no backfill required.
alter table public.components
  add column if not exists ram_family text;
