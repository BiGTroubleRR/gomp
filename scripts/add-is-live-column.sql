-- Run this once against the Supabase project's SQL editor (or via `psql`/the Supabase CLI).
--
-- Adds the column Admin uses to pull a SKU out of (or back into) the /build catalog without
-- deleting its row — see the "Live"/"Hidden" toggle on each component card in the Admin
-- Components tab. Defaulting to true means every existing row stays visible with no backfill
-- needed; /build filters out is_live = false rows client-side, Admin still sees everything.
alter table public.components
  add column if not exists is_live boolean not null default true;
