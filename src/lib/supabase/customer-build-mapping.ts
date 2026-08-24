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
  imageUrl: string | null;
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
    imageUrl: row.image_url,
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
    image_url: build.imageUrl,
    is_live: build.isLive ?? true,
    sort_order: sortOrder,
  };
}
