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
  if (row.case_width_mm != null) comp.caseWidthMm = Number(row.case_width_mm);
  if (row.case_height_mm != null) comp.caseHeightMm = Number(row.case_height_mm);
  if (row.case_depth_mm != null) comp.caseDepthMm = Number(row.case_depth_mm);
  if (row.max_gpu_length_mm != null) comp.maxGpuLengthMm = Number(row.max_gpu_length_mm);
  if (row.max_cooler_height_mm != null) comp.maxCoolerHeightMm = Number(row.max_cooler_height_mm);
  if (row.max_radiator_mm != null) comp.maxRadiatorMm = Number(row.max_radiator_mm);
  if (row.max_psu_length_mm != null) comp.maxPsuLengthMm = Number(row.max_psu_length_mm);
  if (row.gpu_length_mm != null) comp.gpuLengthMm = Number(row.gpu_length_mm);
  if (row.gpu_slot_width != null) comp.gpuSlotWidth = Number(row.gpu_slot_width);
  if (row.cooler_height_mm != null) comp.coolerHeightMm = Number(row.cooler_height_mm);
  if (row.cooler_radiator_mm != null) comp.coolerRadiatorMm = Number(row.cooler_radiator_mm);
  if (row.psu_length_mm != null) comp.psuLengthMm = Number(row.psu_length_mm);
  if (row.ram_height_mm != null) comp.ramHeightMm = Number(row.ram_height_mm);
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
    case_width_mm: comp.caseWidthMm ?? null,
    case_height_mm: comp.caseHeightMm ?? null,
    case_depth_mm: comp.caseDepthMm ?? null,
    max_gpu_length_mm: comp.maxGpuLengthMm ?? null,
    max_cooler_height_mm: comp.maxCoolerHeightMm ?? null,
    max_radiator_mm: comp.maxRadiatorMm ?? null,
    max_psu_length_mm: comp.maxPsuLengthMm ?? null,
    gpu_length_mm: comp.gpuLengthMm ?? null,
    gpu_slot_width: comp.gpuSlotWidth ?? null,
    cooler_height_mm: comp.coolerHeightMm ?? null,
    cooler_radiator_mm: comp.coolerRadiatorMm ?? null,
    psu_length_mm: comp.psuLengthMm ?? null,
    ram_height_mm: comp.ramHeightMm ?? null,
    sort_order: sortOrder,
  };
}
