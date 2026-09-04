// Row <-> Build conversion shared between the client-side reader
// (src/lib/supabase/prebuilts.ts) and the admin-only write route
// (src/app/api/admin/prebuilts/route.ts). No 'use client' here — this file
// must be importable from server route handlers too.
import type { Build } from '@/lib/component-db-seed';
import type { Database } from './types';

export type PrebuiltRow = Database['public']['Tables']['prebuilt_pcs']['Row'];
export type PrebuiltInsert = Database['public']['Tables']['prebuilt_pcs']['Insert'];
export type PrebuiltUpdate = Database['public']['Tables']['prebuilt_pcs']['Update'];

export function rowToBuild(row: PrebuiltRow): Build {
  return {
    id: row.id,
    name: row.name,
    taglineEn: row.tagline_en,
    taglineSk: row.tagline_sk,
    taglineCz: row.tagline_cz,
    cat: row.cat,
    tier: row.tier ?? 'B',
    mobo: row.mobo,
    cpu: row.cpu,
    cooler: row.cooler,
    ram: row.ram,
    gpu: row.gpu,
    storage: row.storage,
    psu: row.psu,
    case: row.case,
    price: Number(row.price_eur),
    rating: Number(row.rating),
    isLive: row.is_live,
    sortOrder: row.sort_order,
  };
}

export function buildToRow(build: Build, sortOrder: number): PrebuiltInsert {
  return {
    name: build.name,
    tagline_en: build.taglineEn,
    tagline_sk: build.taglineSk,
    tagline_cz: build.taglineCz,
    cat: build.cat,
    tier: build.tier,
    price_eur: build.price,
    rating: build.rating,
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
