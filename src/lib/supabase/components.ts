// Data-access layer for the shared PC-component catalog (the `components` table added in
// supabase/schema.sql). This replaces the old localStorage-only `gomp_components_db` used by
// Build and Admin: the catalog now lives in Supabase, so an Admin edit is visible to every
// visitor immediately (via fetch on load) and live (via the Realtime subscription below),
// instead of being trapped in whichever single browser made the edit.
'use client';

import { createClient } from './client';
import { defaultComponentDb, type Category, type Component, type ComponentDb, type Tier, type FormFactor } from '@/lib/component-db-seed';
import type { Database } from './types';

type ComponentRow = Database['public']['Tables']['components']['Row'];
type ComponentInsert = Database['public']['Tables']['components']['Insert'];
type ComponentUpdate = Database['public']['Tables']['components']['Update'];

function rowToComponent(row: ComponentRow): Component {
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

function componentToRow(category: Category, comp: Component, sortOrder: number): ComponentInsert {
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

// Reads the whole catalog, grouped back into the same ComponentDb shape Build/Admin already
// work with. Falls back to the static seed on any error (offline, RLS misconfigured, table
// not migrated yet) so a Supabase hiccup degrades to "last known good" instead of a blank page.
export async function fetchComponentDb(): Promise<ComponentDb> {
  const supabase = createClient();
  const { data, error } = await supabase.from('components').select('*').order('sort_order', { ascending: true });
  if (error || !data) {
    if (error) console.error('fetchComponentDb: falling back to seed data —', error.message);
    return defaultComponentDb();
  }
  const db = { mobo: [], cpu: [], cooler: [], ram: [], gpu: [], storage: [], psu: [], case: [] } as ComponentDb;
  data.forEach((row) => {
    const cat = row.category as Category;
    if (!db[cat]) return;
    db[cat].push(rowToComponent(row));
  });
  return db;
}

// Subscribes to every change on the components table and calls `onChange` (no payload — the
// caller just refetches) whenever a row is inserted, updated, or deleted anywhere, by anyone.
// This is what makes an Admin edit show up on someone else's already-open /build tab without
// them reloading. Returns an unsubscribe function.
export function subscribeComponents(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('components-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function insertComponent(category: Category, comp: Component, sortOrder: number): Promise<Component> {
  const supabase = createClient();
  const { data, error } = await supabase.from('components').insert(componentToRow(category, comp, sortOrder)).select().single();
  if (error || !data) throw error ?? new Error('insertComponent: no row returned');
  return rowToComponent(data);
}

export async function updateComponentRow(id: string, category: Category, comp: Component): Promise<Component> {
  const supabase = createClient();
  const patch: ComponentUpdate = componentToRow(category, comp, 0);
  delete (patch as { sort_order?: number }).sort_order; // never touch ordering on a content edit
  const { data, error } = await supabase.from('components').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('updateComponentRow: no row returned');
  return rowToComponent(data);
}

export async function deleteComponentRow(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('components').delete().eq('id', id);
  if (error) throw error;
}
