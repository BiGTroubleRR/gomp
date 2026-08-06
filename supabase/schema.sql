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
-- Writes are also left open to the anon key for now. /admin's own gate is a
-- client-side password check (not real auth), so there is currently no
-- server-side identity to key a write policy on — locking writes down to
-- `authenticated` would just make /admin unable to save anything. This is a
-- known, deliberate gap: anyone with the (public, client-bundled) anon key
-- could write to this table directly via the Supabase REST API, bypassing
-- the admin password entirely. Tighten this once /admin has real auth
-- (Supabase Auth or Clerk) to check against, by replacing the write policy's
-- `using (true)` with an auth-based condition.
-- ---------------------------------------------------------------------------
create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case')),
  name text not null,
  price numeric(10, 2) not null default 0,
  specs text not null default '',
  tier text not null default 'B' check (tier in ('S', 'A', 'B', 'C', 'D')),
  passmark integer,
  passmark_url text,
  market_price numeric(10, 2),
  case_size text, -- case only: Full Tower | Mid Tower | Mini Tower | SFF
  socket text, -- cpu + mobo only: AM5 | AM4 | LGA1700 | LGA1851
  form_factor text, -- mobo only: E-ATX | ATX | mATX | Mini-ITX
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.components enable row level security;

drop policy if exists "components_select_public" on public.components;
create policy "components_select_public" on public.components
  for select using (true);

drop policy if exists "components_write_public" on public.components;
create policy "components_write_public" on public.components
  for all using (true) with check (true);

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
