// Row <-> Component conversion shared between the client-side catalog reader
// (src/lib/supabase/components.ts) and the admin-only write route
// (src/app/api/admin/components/route.ts). No 'use client' here — this file
// must be importable from server route handlers too.
import { type Category, type Component, type Tier, type FormFactor } from '@/lib/component-db-seed';
import type { Database } from './types';

export type ComponentRow = Database['public']['Tables']['components']['Row'];
export type ComponentInsert = Database['public']['Tables']['components']['Insert'];
export type ComponentUpdate = Database['public']['Tables']['components']['Update'];

export function rowToComponent(row: ComponentRow): Component {
  const comp: Component = {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    specs: row.specs,
    tier: row.tier as Tier,
  };
  if (row.passmark != null) comp.passmark = row.passmark;
  if (row.passmark_url) comp.passmarkUrl = row.passmark_url;
  if (row.market_price != null) comp.marketPrice = Number(row.market_price);
  if (row.case_size) comp.category = row.case_size;
  if (row.socket) comp.socket = row.socket;
  if (row.form_factor) comp.formFactor = row.form_factor as FormFactor;
  return comp;
}

export function componentToRow(category: Category, comp: Component, sortOrder: number): ComponentInsert {
  return {
    category,
    name: comp.name,
    price: comp.price,
    specs: comp.specs,
    tier: comp.tier,
    passmark: comp.passmark ?? null,
    passmark_url: comp.passmarkUrl ?? null,
    market_price: comp.marketPrice ?? null,
    case_size: category === 'case' ? comp.category ?? null : null,
    socket: comp.socket ?? null,
    form_factor: comp.formFactor ?? null,
    sort_order: sortOrder,
  };
}
