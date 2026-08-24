-- GOMP Bordeaux — Supabase schema
-- Run this once in the Supabase dashboard's SQL Editor (Project → SQL Editor → New query).
-- Every table has row-level security on: a signed-in user can only ever read/write their
-- own rows, enforced by Postgres itself (not just hidden in the UI).

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-creates a profiles row the moment someone signs up, seeded from the email/name
-- passed to supabase.auth.signUp({ options: { data: { first_name, last_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- addresses — a user's saved shipping addresses
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  street text not null,
  city text not null,
  zip text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "addresses_all_own" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- orders + order_items — a placed order and the components/parts inside it
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_number text not null unique,
  name text not null,
  status text not null default 'Building' check (status in ('Building', 'Shipped', 'Delivered')),
  total_eur numeric(10, 2) not null,
  eta timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  category text not null,
  name text not null,
  price_eur numeric(10, 2) not null
);

alter table public.order_items enable row level security;

create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );

create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- components — the PC-builder catalog (motherboards/CPUs/GPUs/coolers/RAM/
-- storage/PSUs/cases) shown on /build and managed from /admin.
--
-- Unlike every table above, this one is a shared public catalog, not a row a
-- single user owns — so its RLS shape is deliberately different: anyone
-- (including anonymous visitors) can read it, since /build has no login wall.
--
-- Writes are NOT open to the anon key: there is deliberately no insert/update/
-- delete policy on this table for anon/authenticated at all. /admin now has
-- real auth (Clerk), but that only gates the UI — the write path is
-- src/app/api/admin/components/route.ts, which checks Clerk admin status
-- server-side and writes with the service-role key (bypasses RLS). Do not add
-- a public write policy back here; that was a known, since-closed hole where
-- anyone with the client-bundled anon key could write to this table directly
-- via the Supabase REST API, bypassing admin auth entirely.
-- ---------------------------------------------------------------------------
create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case', 'fan')),
  name text not null,
  price numeric(10, 2) not null default 0,
  specs text not null default '',
  tier text check (tier is null or tier in ('S', 'A', 'B', 'C', 'D')), -- null for bulk-imported SKUs with no PassMark score to derive a tier from
  passmark integer,
  passmark_url text,
  market_price numeric(10, 2),
  case_size text, -- case only: Full Tower | Mid Tower | Mini Tower | SFF
  socket text, -- cpu + mobo only: AM5 | AM4 | LGA1700 | LGA1851
  form_factor text, -- mobo only: E-ATX | ATX | mATX | Mini-ITX
  -- Real physical dimensions (mm), sourced from buildcores-open-db (ODC-By
  -- licensed — see the attribution note on /about) for the categories where
  -- per-SKU size actually varies enough to matter: case, gpu, cooler, psu.
  -- Motherboard/CPU/RAM/storage are close enough to standardized by form
  -- factor that per-SKU dimensions wouldn't change anything visually, so
  -- those are left to the existing form_factor/socket fields instead.
  case_width_mm numeric(6, 1), -- case only
  case_height_mm numeric(6, 1), -- case only
  case_depth_mm numeric(6, 1), -- case only
  max_gpu_length_mm numeric(6, 1), -- case only: longest GPU it can fit
  max_cooler_height_mm numeric(6, 1), -- case only: tallest air cooler it can fit
  max_radiator_mm numeric(6, 1), -- case only: largest AIO radiator any mount position takes
  max_psu_length_mm numeric(6, 1), -- case only: longest PSU it can fit
  gpu_length_mm numeric(6, 1), -- gpu only
  gpu_slot_width numeric(3, 1), -- gpu only: how many expansion slots it occupies
  cooler_height_mm numeric(6, 1), -- cooler only: air towers
  cooler_radiator_mm numeric(6, 1), -- cooler only: AIO radiator size
  psu_length_mm numeric(6, 1), -- psu only
  ram_height_mm numeric(6, 1), -- ram only: per-SKU heatsink height (RAM_DIMM_SIZE_MM.height is the bare-PCB fallback)
  ram_generation smallint, -- ram only: 4 or 5 (DDR4/DDR5) — drives the /build DDR filter
  ram_speed_mhz integer, -- ram only: rated speed, e.g. 6400 for "DDR5-6400" — drives the /build min-speed slider
  ram_family text, -- ram only: groups same manufacturer+speed+per-stick-capacity rows (different stick counts of the same real product line) so /build can show them as one card with a 1x/2x/4x selector
  fan_mounts jsonb, -- case only: [{position, maxCount, sizesMm}] — real per-case fan slots, hand-sourced (not in buildcores-open-db)
  image_url text, -- admin-uploaded product shot, background already removed client-side before upload
  margin_override jsonb, -- {type: 'eur'|'pct', value: number} — overrides the site-wide margin for this one component
  is_live boolean not null default true, -- Admin can pull a SKU out of the /build catalog (Live/Hidden toggle) without deleting its row
  fan_size_mm numeric(5, 1), -- fan only: the one size this SKU comes in, matched against a case's fan_mounts[].sizesMm
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.components enable row level security;

drop policy if exists "components_select_public" on public.components;
create policy "components_select_public" on public.components
  for select using (true);

-- No write policy for anon/authenticated. Only the service-role key (used
-- exclusively by /api/admin/components, after a Clerk admin check) can write;
-- it bypasses RLS entirely, so it needs no policy of its own.
drop policy if exists "components_write_public" on public.components;

-- Bumps updated_at on every UPDATE, so Admin's "last changed" info (if ever
-- surfaced) and Realtime payloads both reflect a true modification time.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists components_set_updated_at on public.components;
create trigger components_set_updated_at
  before update on public.components
  for each row execute procedure public.set_updated_at();

-- Migration for the dimension columns above, since `create table if not
-- exists` is a no-op against the already-live components table.
alter table public.components add column if not exists case_width_mm numeric(6, 1);
alter table public.components add column if not exists case_height_mm numeric(6, 1);
alter table public.components add column if not exists case_depth_mm numeric(6, 1);
alter table public.components add column if not exists max_gpu_length_mm numeric(6, 1);
alter table public.components add column if not exists max_cooler_height_mm numeric(6, 1);
alter table public.components add column if not exists max_radiator_mm numeric(6, 1);
alter table public.components add column if not exists max_psu_length_mm numeric(6, 1);
alter table public.components add column if not exists gpu_length_mm numeric(6, 1);
alter table public.components add column if not exists gpu_slot_width numeric(3, 1);
alter table public.components add column if not exists cooler_height_mm numeric(6, 1);
alter table public.components add column if not exists cooler_radiator_mm numeric(6, 1);
alter table public.components add column if not exists psu_length_mm numeric(6, 1);
alter table public.components add column if not exists ram_height_mm numeric(6, 1);
alter table public.components add column if not exists ram_generation smallint;
alter table public.components add column if not exists ram_speed_mhz integer;
alter table public.components add column if not exists fan_mounts jsonb;
alter table public.components add column if not exists image_url text;
alter table public.components add column if not exists margin_override jsonb;
alter table public.components add column if not exists ram_family text;
alter table public.components add column if not exists is_live boolean not null default true;
alter table public.components add column if not exists fan_size_mm numeric(5, 1);

-- 'fan' added as its own catalog category (see Category in component-db-seed.ts) — the original
-- check constraint predates it and would reject every fan row's insert otherwise.
alter table public.components drop constraint if exists components_category_check;
alter table public.components add constraint components_category_check
  check (category in ('mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case', 'fan'));

-- Tier used to be not-null-default-'B', which would silently mislabel every bulk-imported SKU
-- (no PassMark score to derive a real tier from) as tier B instead of leaving it unset.
alter table public.components alter column tier drop not null;
alter table public.components alter column tier drop default;
alter table public.components drop constraint if exists components_tier_check;
alter table public.components add constraint components_tier_check check (tier is null or tier in ('S', 'A', 'B', 'C', 'D'));

-- Required for Supabase Realtime to broadcast INSERT/UPDATE/DELETE on this
-- table — without this, postgres_changes subscriptions silently receive
-- nothing. Guarded because re-adding an already-subscribed table errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'components'
  ) then
    alter publication supabase_realtime add table public.components;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- checkout_intents — demand signal from /checkout.
--
-- This is deliberately NOT a payment table. The checkout flow takes no money:
-- a visitor picks how they *would* like to pay (card / Google Pay / Apple Pay)
-- and we record that intent plus their contact + delivery details, so we can
-- measure whether there's real interest before wiring up a payment provider.
--
-- NO CARD DATA IS STORED HERE, BY DESIGN. There is deliberately no column for
-- a card number, expiry, CVV, or any equivalent. Handling raw card data would
-- put this project in PCI DSS scope; when payments go live, the card details
-- must go straight to a payment provider (Stripe/Adyen/GoPay/Comgate) via
-- their own hosted fields or redirect, and only that provider's opaque
-- reference (e.g. a PaymentIntent id) should ever land in this database. If
-- you later add a `payment_reference text` column, that is the right shape —
-- never the card itself.
--
-- RLS shape differs from `components` on purpose: this table holds personal
-- data (name, email, phone, address), so it is WRITE-ONLY to the public.
-- Anyone may insert their own intent (that's the whole point — no signup wall
-- in front of a demand test), but nobody can read the table with the anon key.
-- Read the submissions in the Supabase dashboard's Table Editor, or add a
-- policy keyed on a real admin identity once /admin has actual auth.
-- ---------------------------------------------------------------------------
create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: an intent from a signed-out visitor is still a valid signal.
  user_id uuid references auth.users (id) on delete set null,

  -- contact
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text not null default '',

  -- delivery
  address text not null default '',
  city text not null default '',
  region text not null default '',
  zip text not null default '',

  -- what they'd have paid with, and how they'd have received it
  payment_method text not null check (payment_method in ('card', 'google_pay', 'apple_pay')),
  shipping_method text not null default 'standard' check (shipping_method in ('standard', 'express', 'overnight')),

  -- price snapshot, in EUR (the site's base currency) at submission time, so a
  -- later catalog price change doesn't rewrite history on an old intent
  parts_total_eur numeric(10, 2) not null default 0,
  shipping_eur numeric(10, 2) not null default 0,
  assembly_eur numeric(10, 2) not null default 0,
  discount_eur numeric(10, 2) not null default 0,
  total_eur numeric(10, 2) not null default 0,
  promo_code text not null default '',

  -- the configured build itself: [{ category, name, price_eur }, ...]
  build_items jsonb not null default '[]'::jsonb,

  -- provenance + consent
  display_currency text not null default 'EUR',
  lang text not null default 'en',
  contact_consent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.checkout_intents enable row level security;

-- Submission goes through src/app/api/checkout/route.ts, NOT a direct anon
-- insert: the anon key has no insert policy on this table. That route rate
-- limits by IP and recomputes parts_total_eur/shipping_eur/assembly_eur/
-- discount_eur/total_eur from the authoritative `components` catalog before
-- inserting with the service-role key (bypasses RLS). Do not add a public
-- insert policy back here — that was a known, since-closed gap where a client
-- could submit any price it wanted for a real build, with no rate limit on
-- top of it.
drop policy if exists "checkout_intents_insert_public" on public.checkout_intents;

-- A signed-in visitor may see their own submissions; anonymous rows
-- (user_id is null) stay unreadable to everyone via the anon key.
drop policy if exists "checkout_intents_select_own" on public.checkout_intents;
create policy "checkout_intents_select_own" on public.checkout_intents
  for select using (auth.uid() is not null and auth.uid() = user_id);

create index if not exists checkout_intents_created_at_idx
  on public.checkout_intents (created_at desc);

-- ---------------------------------------------------------------------------
-- gbb_requests — "Gomp Budget Builds": a customer asks for a build made from
-- secondhand parts and a price proposal, instead of configuring a new-parts
-- build themselves. Same PII/RLS shape as checkout_intents (see the note on
-- that table above) — submission goes through src/app/api/gbb/route.ts, not
-- a direct anon insert, and reads are admin-only via src/app/api/admin/gbb.
-- ---------------------------------------------------------------------------
create table if not exists public.gbb_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,

  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text not null default '',

  budget_eur numeric(10, 2),
  use_case text not null default '',
  notes text not null default '',

  -- filled in by an admin while working the request — see the "Budget
  -- Requests" admin tab, which also generates Bazoš/FB Marketplace search
  -- links per ad-hoc search term rather than scraping those sites itself.
  price_proposal_eur numeric(10, 2),
  proposal_notes text not null default '',
  status text not null default 'new' check (status in ('new', 'researching', 'quoted', 'converted', 'archived')),

  lang text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gbb_requests enable row level security;

-- Submission goes through src/app/api/gbb/route.ts (rate-limited, service-role
-- insert) — do not add a public insert policy here.
drop policy if exists "gbb_requests_insert_public" on public.gbb_requests;

drop policy if exists "gbb_requests_select_own" on public.gbb_requests;
create policy "gbb_requests_select_own" on public.gbb_requests
  for select using (auth.uid() is not null and auth.uid() = user_id);

create index if not exists gbb_requests_created_at_idx
  on public.gbb_requests (created_at desc);

create or replace function public.set_gbb_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gbb_requests_set_updated_at on public.gbb_requests;
create trigger gbb_requests_set_updated_at
  before update on public.gbb_requests
  for each row execute procedure public.set_gbb_requests_updated_at();

-- ---------------------------------------------------------------------------
-- rate_limit_hits — generic per-key request counter for public endpoints.
--
-- Used today by src/app/api/checkout/route.ts to throttle checkout
-- submissions per IP (key = 'checkout:<ip>'); any other public write route
-- can reuse it the same way with its own key prefix. Server-only: no RLS
-- policy is defined, so only the service-role key (which bypasses RLS) can
-- read or write it — there is nothing here for the anon key to see or touch.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_hits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

alter table public.rate_limit_hits enable row level security;
