// Row <-> CustomerBuild conversion shared between the client-side reader
// (src/lib/supabase/customer-builds.ts) and the admin-only write route
// (src/app/api/admin/customer-builds/route.ts). No 'use client' here — this file
// must be importable from server route handlers too.
import type { Database } from './types';

export type CustomerBuildRow = Database['public']['Tables']['customer_builds']['Row'];
export type CustomerBuildInsert = Database['public']['Tables']['customer_builds']['Insert'];
export type CustomerBuildUpdate = Database['public']['Tables']['customer_builds']['Update'];

export type CustomerBuild = {
  id: string;
  title: string;
  customerLabel: string;
  specs: string;
  priceEur: number | null;
  builtOn: string | null;
  imageUrls: string[];
  // Optional structured component references, additive to `specs` — an exact
  // components.name per slot when set, used only to compute this build's tier (see
  // computeBuildTier in component-db-seed.ts). `specs` stays the source of the public
  // spec-line display; these are never shown as text directly.
  mobo: string | null;
  cpu: string | null;
  cooler: string | null;
  ram: string | null;
  gpu: string | null;
  storage: string | null;
  psu: string | null;
  case: string | null;
  isLive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function rowToCustomerBuild(row: CustomerBuildRow): CustomerBuild {
  return {
    id: row.id,
    title: row.title,
    customerLabel: row.customer_label,
    specs: row.specs,
    priceEur: row.price_eur != null ? Number(row.price_eur) : null,
    builtOn: row.built_on,
    // image_urls is the source of truth going forward; rows saved before this column
    // existed only have the legacy single image_url, so fall back to that as a one-photo
    // album rather than requiring a data backfill.
    imageUrls: row.image_urls?.length ? row.image_urls : row.image_url ? [row.image_url] : [],
    mobo: row.mobo,
    cpu: row.cpu,
    cooler: row.cooler,
    ram: row.ram,
    gpu: row.gpu,
    storage: row.storage,
    psu: row.psu,
    case: row.case,
    isLive: row.is_live,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function customerBuildToRow(build: CustomerBuild, sortOrder: number): CustomerBuildInsert {
  return {
    title: build.title,
    customer_label: build.customerLabel,
    specs: build.specs,
    price_eur: build.priceEur,
    built_on: build.builtOn,
    image_urls: build.imageUrls,
    // Kept in sync as a "cover photo" for anything still reading the legacy single column.
    image_url: build.imageUrls[0] ?? null,
    mobo: build.mobo,
    cpu: build.cpu,
    cooler: build.cooler,
    ram: build.ram,
    gpu: build.gpu,
    storage: build.storage,
    psu: build.psu,
    case: build.case,
    is_live: build.isLive ?? true,
    sort_order: sortOrder,
  };
}
