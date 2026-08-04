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
