'use client';

import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile } from '@/lib/use-media-query';
import TransitionLink from '@/components/TransitionLink';
import DeviceViewToggle from '@/components/DeviceViewToggle';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { readJSON, writeJSON } from '@/lib/gomp-storage';
import { fetchIntents, updateIntentStatus, type CheckoutIntent, type IntentStatus } from '@/lib/admin-intents';
import { fetchGbbRequests, updateGbbRequest, type GbbRequest, type GbbStatus } from '@/lib/admin-gbb';
import { marketplaceSearchLinks } from '@/lib/gbb-links';
import { GBB_GREEN, GBB_GREEN_TINT } from '@/lib/gbb-theme';
import { fetchComponentDb, subscribeComponents, insertComponent, updateComponentRow, deleteComponentRow } from '@/lib/supabase/components';
import {
  fetchCustomerBuilds,
  subscribeCustomerBuilds,
  insertCustomerBuild,
  updateCustomerBuild,
  deleteCustomerBuild,
} from '@/lib/supabase/customer-builds';
import type { CustomerBuild } from '@/lib/supabase/customer-build-mapping';
import { passmarkLookup, tierFromPassmark, TIER_COLORS } from '@/lib/passmark';
import {
  defaultComponentDb,
  defaultBuilds,
  defaultMargin,
  computePrice,
  type Category,
  type Component,
  type ComponentDb,
  type Build,
  type Margin,
  type Tier,
  type FanMountPosition,
} from '@/lib/component-db-seed';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

type Suggestion = { name: string; passmark?: number; passmarkUrl?: string; specs?: string };

// Visual tab order on the Components tab (matches the original site; differs from the
// shared CATEGORIES export's declaration order, which isn't meant to dictate UI order).
const CATEGORY_TAB_ORDER: Category[] = ['gpu', 'cpu', 'ram', 'storage', 'mobo', 'cooler', 'psu', 'case', 'fan'];

const CAT_LABELS: Record<'en' | 'sk', Record<Category, string>> = {
  en: { gpu: 'GPU', cpu: 'CPU', ram: 'RAM', storage: 'Storage', mobo: 'Motherboard', cooler: 'Cooler', psu: 'PSU', case: 'Case', fan: 'Fan' },
  sk: { gpu: 'GPU', cpu: 'CPU', ram: 'RAM', storage: 'Úložisko', mobo: 'Základná doska', cooler: 'Chladič', psu: 'PSU', case: 'Skriňa', fan: 'Ventilátor' },
};

const CASE_CATS = ['Full Tower', 'Mid Tower', 'Mini Tower', 'SFF'];

// Tier badge palette used ONLY on the Builds tab. The Components tab uses TIER_COLORS
// imported from @/lib/passmark. This is a deliberate, preserved quirk of the original site,
// which really does use two different tier-badge palettes across its two tabs.
const BUILD_TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  S: { bg: '#FFF5CC', text: '#876400', border: '#D4A017' },
  A: { bg: '#FFE8E8', text: '#8B1A00', border: '#CC3333' },
  B: { bg: '#E8F0FF', text: '#1A3080', border: '#3366CC' },
  C: { bg: '#E8FFF0', text: '#1A5030', border: '#339966' },
  D: { bg: '#F2F2F6', text: '#505060', border: '#9090A0' },
};

// Autocomplete suggestions per category, shown while adding/editing a component. Exact
// PassMark scores/URLs ported verbatim from the original site's SUGGESTIONS table.
const SUGGESTIONS: Record<Category, Suggestion[]> = {
  gpu: [
    { name: 'NVIDIA RTX 5090', passmark: 38960, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725' },
    { name: 'NVIDIA RTX 5080', passmark: 35665, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5080&id=5721' },
    { name: 'NVIDIA RTX 5070 Ti', passmark: 32375, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070+Ti&id=5878' },
    { name: 'NVIDIA RTX 5070', passmark: 28687, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070&id=5940' },
    { name: 'NVIDIA RTX 5060 Ti 16GB', passmark: 22630, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060+Ti+16GB&id=6160' },
    { name: 'NVIDIA RTX 5060', passmark: 20700, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060&id=5602' },
    { name: 'NVIDIA RTX 5050', passmark: 16957, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5050&id=6668' },
    { name: 'NVIDIA RTX 4090', passmark: 38054, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606' },
    { name: 'NVIDIA RTX 4080 Super', passmark: 34238, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984' },
    { name: 'NVIDIA RTX 4080', passmark: 34451, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080&id=4622' },
    { name: 'NVIDIA RTX 4070 Ti Super', passmark: 31851, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti+SUPER&id=4980' },
    { name: 'NVIDIA RTX 4070 Ti', passmark: 31545, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti&id=4699' },
    { name: 'NVIDIA RTX 4070 Super', passmark: 29947, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+SUPER&id=4973' },
    { name: 'NVIDIA RTX 4070', passmark: 26881, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070&id=4795' },
    { name: 'NVIDIA RTX 4060 Ti 16GB', passmark: 22592, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060+Ti+16GB&id=4898' },
    { name: 'NVIDIA RTX 4060', passmark: 19494, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060&id=4850' },
    { name: 'NVIDIA RTX 3080 Ti', passmark: 26749, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3080+Ti&id=4409' },
    { name: 'NVIDIA RTX 3080', passmark: 25000, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3080&id=4282' },
    { name: 'NVIDIA RTX 3070 Ti', passmark: 23197, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3070+Ti&id=4413' },
    { name: 'NVIDIA RTX 3070', passmark: 22097, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3070&id=4283' },
    { name: 'NVIDIA RTX 3060 Ti', passmark: 20241, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3060+Ti&id=4318' },
    { name: 'NVIDIA RTX 3060 12GB', passmark: 16716, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3060+12GB&id=4345' },
    { name: 'AMD Radeon RX 9070 XT', passmark: 26907, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070+XT&id=5956' },
    { name: 'AMD Radeon RX 9070', passmark: 25395, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070&id=5958' },
    { name: 'AMD Radeon RX 9060 XT 16GB', passmark: 20085, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9060+XT+16GB&id=5957' },
    { name: 'AMD Radeon RX 7900 XTX', passmark: 31424, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XTX&id=4644' },
    { name: 'AMD Radeon RX 7900 XT', passmark: 29065, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XT&id=4646' },
    { name: 'AMD Radeon RX 7800 XT', passmark: 24402, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7800+XT&id=4917' },
    { name: 'AMD Radeon RX 7700 XT', passmark: 22687, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7700+XT&id=4919' },
    { name: 'AMD Radeon RX 7600', passmark: 16465, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7600&id=4832' },
    { name: 'AMD Radeon RX 6800 XT', passmark: 25064, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6800+XT&id=4312' },
    { name: 'AMD Radeon RX 6700 XT', passmark: 19731, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6700+XT&id=4369' },
    { name: 'AMD Radeon RX 6600 XT', passmark: 16440, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6600+XT&id=4444' },
    { name: 'Intel Arc B580', passmark: 16026, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Intel+Arc+B580&id=5306' },
    { name: 'Intel Arc B570', passmark: 14116, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Intel+Arc+B570&id=5652' },
    { name: 'Intel Arc A770', passmark: 13351, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Intel+Arc+A770&id=4605' },
    { name: 'Intel Arc A750', passmark: 12631, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Intel+Arc+A750&id=4612' },
  ],
  cpu: [
    { name: 'AMD Ryzen 9 9950X3D', passmark: 70175, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X3D&id=6549' },
    { name: 'AMD Ryzen 9 9950X', passmark: 65758, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211' },
    { name: 'AMD Ryzen 9 9900X3D', passmark: 56190, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9900X3D&id=6548' },
    { name: 'AMD Ryzen 9 9900X', passmark: 54413, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9900X&id=6171' },
    { name: 'AMD Ryzen 7 9800X3D', passmark: 39967, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9800X3D&id=6344' },
    { name: 'AMD Ryzen 9 7950X3D', passmark: 62317, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X3D&id=5234' },
    { name: 'AMD Ryzen 9 7950X', passmark: 62182, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X&id=5031' },
    { name: 'AMD Ryzen 7 7800X3D', passmark: 34290, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7800X3D&id=5299' },
    { name: 'AMD Ryzen 9 7900X3D', passmark: 50212, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7900X3D&id=5240' },
    { name: 'Intel Core Ultra 9 285K', passmark: 67283, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+9+285K&id=6296' },
    { name: 'Intel Core i9-14900KS', passmark: 60060, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900KS&id=5957' },
    { name: 'Intel Core i9-14900K', passmark: 58312, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717' },
    { name: 'Intel Core i9-14900KF', passmark: 58200, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900KF&id=5684' },
    { name: 'Intel Core i9-13900K', passmark: 58167, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-13900K&id=5022' },
    { name: 'Intel Core i7-14700K', passmark: 51995, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-14700K&id=5719' },
    { name: 'Intel Core i9-13900KS', passmark: 60486, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-13900KS&id=5160' },
  ],
  ram: [
    { name: 'G.Skill Trident Z5 32GB DDR5 6400', specs: '2×16GB · CL32 · EXPO/XMP3' },
    { name: 'Corsair Dominator 32GB DDR5 5600', specs: '2×16GB · CL36' },
    { name: 'Kingston Fury Beast 32GB DDR5 6000', specs: '2×16GB · CL36 · EXPO/XMP3' },
    { name: 'Kingston Fury Beast 16GB DDR5 6000', specs: '2×8GB · CL36 · EXPO/XMP3' },
    { name: 'G.Skill Trident Z5 64GB DDR5 6000', specs: '2×32GB · CL30 · EXPO/XMP3' },
    { name: 'Corsair Vengeance 64GB DDR5 6000', specs: '2×32GB · CL30' },
    { name: 'Corsair Vengeance 32GB DDR4 3600', specs: '2×16GB · CL18' },
    { name: 'Crucial Pro 32GB DDR5 5600', specs: '2×16GB · CL46' },
  ],
  storage: [
    { name: 'Samsung 990 Pro 2TB NVMe', specs: 'PCIe 4.0 · 7450MB/s read' },
    { name: 'WD Black SN850X 2TB NVMe', specs: 'PCIe 4.0 · 7300MB/s read' },
    { name: 'Samsung 9100 Pro 2TB NVMe', specs: 'PCIe 5.0 · 14800MB/s read' },
    { name: 'Crucial T500 1TB NVMe', specs: 'PCIe 4.0 · 7400MB/s read' },
    { name: 'Crucial P3 Plus 1TB NVMe', specs: 'PCIe 4.0 · 5000MB/s read' },
    { name: 'Samsung 990 EVO Plus 1TB NVMe', specs: 'PCIe 4.0/5.0 · 7150MB/s read' },
    { name: 'Seagate FireCuda 530 2TB NVMe', specs: 'PCIe 4.0 · 7300MB/s read' },
    { name: 'WD Blue SN580 1TB NVMe', specs: 'PCIe 4.0 · 4150MB/s read' },
  ],
  mobo: [
    { name: 'ASUS ROG STRIX X870E-E', specs: 'AM5 · DDR5 · PCIe 5.0 · 4×M.2' },
    { name: 'MSI MAG Z790 TOMAHAWK', specs: 'LGA1700 · DDR5 · PCIe 5.0' },
    { name: 'Gigabyte X870 AORUS Elite', specs: 'AM5 · DDR5 · PCIe 5.0' },
    { name: 'ASUS TUF Gaming Z890-Plus', specs: 'LGA1851 · DDR5 · PCIe 5.0' },
    { name: 'MSI PRO B650-P WiFi', specs: 'AM5 · DDR5 · PCIe 4.0' },
    { name: 'ASUS ROG STRIX B760-F', specs: 'LGA1700 · DDR5 · PCIe 5.0' },
  ],
  cooler: [
    { name: 'NZXT Kraken 360 RGB', specs: '360mm AIO · LCD head · AM5/LGA1700' },
    { name: 'Noctua NH-D15 chromax', specs: 'Dual tower · 165mm' },
    { name: 'Corsair iCUE LINK Titan 360 RX', specs: '360mm AIO · LCD head' },
    { name: 'ARCTIC Liquid Freezer III 360', specs: '360mm AIO · VRM fan' },
    { name: 'Deepcool AK620', specs: 'Dual tower air · 160mm' },
    { name: 'Cooler Master Hyper 212 Black Edition', specs: 'Single tower air · 155mm' },
  ],
  psu: [
    { name: 'Corsair HX1200i ATX 3.0', specs: '1200W · 80+ Platinum · Modular' },
    { name: 'Seasonic FOCUS GX-850', specs: '850W · 80+ Gold · Modular' },
    { name: 'be quiet! Dark Power 13 1000W', specs: '1000W · 80+ Titanium · Modular' },
    { name: 'MSI MPG A1000G', specs: '1000W · 80+ Gold · ATX 3.0 · Modular' },
    { name: 'Corsair RM850x', specs: '850W · 80+ Gold · Modular' },
    { name: 'EVGA SuperNOVA 650 GT', specs: '650W · 80+ Gold · Modular' },
  ],
  case: [
    { name: 'NZXT H1 V2', specs: 'Mini-ITX · Tempered Glass · 280mm AIO Ready' },
    { name: 'Fractal Design Pop Air', specs: 'Micro-ATX · Mesh Front · 360mm AIO Ready' },
    { name: 'Fractal Design Meshify 2', specs: 'Mid-Tower ATX · Mesh Front · 360mm AIO Ready' },
    { name: 'Lian Li O11D EVO XL', specs: 'Full-Tower E-ATX · Tempered Glass · 420mm AIO Ready' },
    { name: 'Corsair 6500X', specs: 'Mid-Tower ATX · Dual Chamber · Tempered Glass' },
    { name: 'Cooler Master MasterBox Q300L', specs: 'Micro-ATX · Mesh Front · Compact' },
    { name: 'Phanteks Eclipse G360A', specs: 'Mid-Tower ATX · Mesh Front · 360mm AIO Ready' },
  ],
  fan: [
    { name: 'Noctua NF-A12x25', specs: '2000 RPM · 60.1 CFM · 22.6 dBA · 4-pin PWM' },
    { name: 'Noctua NF-A14', specs: '1500 RPM · 82.5 CFM · 24.6 dBA · 4-pin PWM' },
    { name: 'Corsair ML120', specs: '2000 RPM · 75.0 CFM · 25.5 dBA · 4-pin PWM' },
    { name: 'Corsair ML140', specs: '1600 RPM · 75.0 CFM · 24.7 dBA · 4-pin PWM' },
    { name: 'Lian Li Uni Fan SL120', specs: '1900 RPM · 68.1 CFM · 27.5 dBA · ARGB · 4-pin PWM' },
    { name: 'Arctic P12 PWM PST', specs: '1800 RPM · 56.3 CFM · 22.5 dBA · 4-pin PWM' },
  ],
};

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

type Translations = {
  admin_panel: string; sign_in: string;
  admin_crumb: string; view_shop: string;
  manage: string; builds_tab: string; components_tab: string;
  database: string; builds_listed: string; components_word: string;
  pc_builds: string; add_build: string;
  name_label: string; tagline_label: string; storage_label: string;
  mobo_label: string; cooler_label: string;
  category_label: string; cat_flagship: string; cat_performance: string; cat_midrange: string; cat_entry: string;
  tier_label: string; tier_s: string; tier_a: string; tier_b: string; tier_c: string; tier_d: string;
  price_eur_label: string; price_eur_short: string; rating_label: string;
  cancel: string; save_build: string; edit: string; del: string;
  col_build: string; col_price: string; col_rating: string; col_status: string;
  live: string; hidden: string;
  edit_build: string; new_build: string; saved_ok: string;
  components_db: string; components_db_desc: string;
  suggestions_search_placeholder: string; already_added: string; no_suggestions: string;
  margin_title: string; margin_desc: string;
  margin_eur: string; margin_pct: string;
  market_price_label: string; market_price_placeholder: string;
  original_price_label: string; web_price_label: string;
  image_label: string; image_uploading: string; image_replace: string; image_remove: string;
  apply_margin: string; margin_override_badge: string; margin_override_label: string; margin_override_desc: string; margin_override_use_global: string;
  specs_notes: string; tier_rating: string; tower_category: string; tower_category_help: string;
  ram_generation: string; ram_speed_mhz: string; ram_generation_help: string;
  fan_size_mm: string; preinstalled_fans: string; preinstalled_fans_help: string; fan_none: string;
  update_arrow: string; add_prefix: string; edit_prefix: string;
  select_prefix: string; select_suffix: string;
  listings: (n: number) => string;
  price_auto_note: (mp: number, m: number) => string;
  // Clerk-based admin gate
  checking_access: string; sign_in_clerk_desc: string; not_admin_desc: string;
  not_admin_hint: string; switch_account: string;
  // Order requests tab
  requests_tab: string; order_requests: string; refresh: string; loading: string;
  no_requests: string; setup_needed: string; error_word: string; no_name: string;
  contact_word: string; deliver_to_word: string; totals_word: string; meta_word: string;
  parts_word: string; shipping_word: string; assembly_word: string; discount_word: string;
  total_word: string; consent_word: string; signed_in_word: string; build_word: string;
  set_status: string;
  status_labels: Record<IntentStatus, string>;
  method_labels: Record<'card' | 'google_pay' | 'apple_pay', string>;
  requests_count: (total: number, fresh: number) => string;
  // Gomp Budget Builds tab
  gbb_tab: string; gbb_title: string; gbb_no_requests: string;
  gbb_status_labels: Record<GbbStatus, string>;
  gbb_use_case_labels: Record<string, string>;
  gbb_budget_word: string; gbb_use_case_word: string; gbb_notes_word: string;
  gbb_search_helper: string; gbb_search_placeholder: string; gbb_add_search: string;
  gbb_proposal_price: string; gbb_proposal_notes: string; gbb_save_proposal: string;
  gbb_count: (total: number, fresh: number) => string;
  // Zákaznícke GOMPy (customer_builds) tab
  customer_gomps_tab: string; customer_gomps_title: string; add_customer_gomp: string;
  cg_title_label: string; cg_customer_label: string; cg_customer_placeholder: string;
  cg_specs_label: string; cg_specs_help: string; cg_price_label: string; cg_built_on_label: string;
  cg_listed: (n: number) => string;
};

const TRANSLATIONS: Record<'en' | 'sk', Translations> = {
  en: {
    admin_panel: 'Admin Panel', sign_in: 'Sign In →',
    admin_crumb: 'Admin', view_shop: 'View Shop ↗',
    manage: 'Manage', builds_tab: 'Builds', components_tab: 'Components',
    database: 'Database', builds_listed: 'Builds listed', components_word: 'Components',
    pc_builds: 'PC Builds', add_build: '+ Add Build',
    name_label: 'Name *', tagline_label: 'Tagline', storage_label: 'Storage',
    mobo_label: 'Motherboard', cooler_label: 'Cooler',
    category_label: 'Category', cat_flagship: 'Flagship', cat_performance: 'Performance', cat_midrange: 'Mid-Range', cat_entry: 'Entry',
    tier_label: 'Tier', tier_s: 'S — Legendary', tier_a: 'A — Excellent', tier_b: 'B — Great', tier_c: 'C — Good', tier_d: 'D — Decent',
    price_eur_label: 'Price (EUR)', price_eur_short: 'Price (€)', rating_label: 'Rating (0–5)',
    cancel: 'Cancel', save_build: 'Save Build →', edit: 'Edit', del: 'Del',
    col_build: 'Build', col_price: 'Price', col_rating: 'Rating', col_status: 'Status',
    live: 'Live', hidden: 'Hidden',
    edit_build: 'Edit Build', new_build: 'New Build', saved_ok: '✓ Saved successfully',
    components_db: 'Components Database', components_db_desc: 'Parts available in the 3D PC Builder configurator',
    suggestions_search_placeholder: 'Search suggestions…', already_added: 'Added', no_suggestions: 'No matches — type a custom name.',
    margin_title: 'Pricing Margin',
    margin_desc: 'Paste in the cheapest current price you find on Alza / Heureka as "Market Price" below — the sell price is derived automatically from this margin and updates across the site.',
    margin_eur: '€ Flat', margin_pct: '% Markup',
    market_price_label: 'Market Price (Alza/Heureka)', market_price_placeholder: 'e.g. 1650',
    original_price_label: 'Original', web_price_label: 'Web price',
    image_label: 'Product Image', image_uploading: 'Uploading…',
    image_replace: 'Replace image', image_remove: 'Remove',
    apply_margin: 'Apply margin →', margin_override_badge: 'Custom margin',
    margin_override_label: 'Margin Override', margin_override_desc: 'Give this one component its own margin instead of the site-wide one above.',
    margin_override_use_global: 'Use site-wide margin',
    specs_notes: 'Specs / Notes', tier_rating: 'Tier Rating', tower_category: 'Tower Category',
    tower_category_help: 'Full Tower 55–75 cm · Mid Tower 35–55 cm · Mini Tower 30–45 cm · SFF <35 cm',
    ram_generation: 'DDR Generation', ram_speed_mhz: 'Speed (MHz)',
    ram_generation_help: 'Drives the DDR4/DDR5 filter and the speed slider on the Build page — leave blank to hide this kit from both.',
    fan_size_mm: 'Fan size (mm)',
    preinstalled_fans: 'Pre-installed fans',
    preinstalled_fans_help: 'Which fan (if any) ships in each mount out of the box — keeping it is free; swapping to another fan on Build charges that fan’s price.',
    fan_none: 'None (bundled, unbranded)',
    update_arrow: 'Update →', add_prefix: 'Add ', edit_prefix: 'Edit ',
    select_prefix: '— Select ', select_suffix: ' —',
    listings: (n) => `${n} listings · changes save to localStorage and sync to Shop`,
    price_auto_note: (mp, m) => `Auto: €${mp} market + margin = €${m} sell price`,
    checking_access: 'Checking access…',
    sign_in_clerk_desc: 'Sign in with your GOMP account. Admin access is granted per account.',
    not_admin_desc: 'You are signed in, but this account does not have admin access.',
    not_admin_hint: 'To grant access: in the Clerk dashboard open this user and set Public metadata to {"role":"admin"} — or add the email to ADMIN_EMAILS.',
    switch_account: 'Switch account',
    requests_tab: 'Requests', order_requests: 'Order Requests', refresh: 'Refresh', loading: 'Loading…',
    no_requests: 'No order requests yet. They appear here as soon as someone submits one at checkout.',
    setup_needed: 'Setup needed', error_word: 'Error', no_name: '(no name given)',
    contact_word: 'Contact', deliver_to_word: 'Deliver to', totals_word: 'Totals', meta_word: 'Details',
    parts_word: 'Parts', shipping_word: 'Shipping', assembly_word: 'Assembly', discount_word: 'Discount',
    total_word: 'Total', consent_word: 'Contact consent', signed_in_word: 'Submitted while signed in',
    build_word: 'Configured build', set_status: 'Set status',
    status_labels: { new: 'New', contacted: 'Contacted', converted: 'Converted', archived: 'Archived' },
    method_labels: { card: 'Card', google_pay: 'Google Pay', apple_pay: 'Apple Pay' },
    requests_count: (total, fresh) => `${total} total · ${fresh} new`,
    gbb_tab: 'Budget Requests', gbb_title: 'Gomp Budget Builds', gbb_no_requests: 'No budget build requests yet. They appear here as soon as someone submits one.',
    gbb_status_labels: { new: 'New', researching: 'Researching', quoted: 'Quoted', converted: 'Converted', archived: 'Archived' },
    gbb_use_case_labels: { gaming: 'Gaming', office: 'Office & everyday use', creative: 'Content creation / editing', server: 'Home server / NAS', other: 'Something else' },
    gbb_budget_word: 'Budget', gbb_use_case_word: "What it's for", gbb_notes_word: 'Customer notes',
    gbb_search_helper: 'Marketplace search links (not scraped — opens the search for you to check)',
    gbb_search_placeholder: 'e.g. RTX 3070', gbb_add_search: 'Search',
    gbb_proposal_price: 'Price proposal (EUR)', gbb_proposal_notes: 'Proposal notes (parts, condition, etc.)', gbb_save_proposal: 'Save & mark quoted →',
    gbb_count: (total, fresh) => `${total} total · ${fresh} new`,
    customer_gomps_tab: 'Customer GOMPs', customer_gomps_title: 'Zákaznícke GOMPy', add_customer_gomp: '+ Add build',
    cg_title_label: 'Title', cg_customer_label: 'Customer', cg_customer_placeholder: 'First name/initial only — e.g. "Built for Martin K."',
    cg_specs_label: 'Specs', cg_specs_help: 'Separate each spec with " · ", same as the Components tab.',
    cg_price_label: 'Price (EUR)', cg_built_on_label: 'Built on',
    cg_listed: (n) => `${n} build${n === 1 ? '' : 's'}`,
  },
  sk: {
    admin_panel: 'Admin panel', sign_in: 'Prihlásiť sa →',
    admin_crumb: 'Admin', view_shop: 'Zobraziť obchod ↗',
    manage: 'Správa', builds_tab: 'Zostavy', components_tab: 'Komponenty',
    database: 'Databáza', builds_listed: 'Uvedených zostáv', components_word: 'Komponenty',
    pc_builds: 'Zostavy PC', add_build: '+ Pridať zostavu',
    name_label: 'Názov *', tagline_label: 'Slogan', storage_label: 'Úložisko',
    mobo_label: 'Základná doska', cooler_label: 'Chladič',
    category_label: 'Kategória', cat_flagship: 'Vlajková loď', cat_performance: 'Výkonnostná', cat_midrange: 'Stredná trieda', cat_entry: 'Základná',
    tier_label: 'Trieda', tier_s: 'S — Legendárna', tier_a: 'A — Výborná', tier_b: 'B — Skvelá', tier_c: 'C — Dobrá', tier_d: 'D — Slušná',
    price_eur_label: 'Cena (EUR)', price_eur_short: 'Cena (€)', rating_label: 'Hodnotenie (0–5)',
    cancel: 'Zrušiť', save_build: 'Uložiť zostavu →', edit: 'Upraviť', del: 'Zmazať',
    col_build: 'Zostava', col_price: 'Cena', col_rating: 'Hodnotenie', col_status: 'Stav',
    live: 'Aktívna', hidden: 'Skrytá',
    edit_build: 'Upraviť zostavu', new_build: 'Nová zostava', saved_ok: '✓ Úspešne uložené',
    components_db: 'Databáza komponentov', components_db_desc: 'Súčiastky dostupné v 3D konfigurátore PC',
    suggestions_search_placeholder: 'Hľadať návrhy…', already_added: 'Pridané', no_suggestions: 'Nenájdené — zadajte vlastný názov.',
    margin_title: 'Marketingová marža',
    margin_desc: 'Vložte najlevnejšiu aktuálnu cenu z Alzy / Heureky ako „Tržnová cena" nižšie — predajná cena sa automaticky odvodí z tejto marže a aktualizuje sa v celom obchode.',
    margin_eur: '€ Pevná', margin_pct: '% Prirážka',
    market_price_label: 'Tržnová cena (Alza/Heureka)', market_price_placeholder: 'napr. 1650',
    original_price_label: 'Pôvodná', web_price_label: 'Cena na webe',
    image_label: 'Fotka produktu', image_uploading: 'Nahrávam…',
    image_replace: 'Zmeniť fotku', image_remove: 'Odstrániť',
    apply_margin: 'Aplikovať maržu →', margin_override_badge: 'Vlastná marža',
    margin_override_label: 'Vlastná marža', margin_override_desc: 'Nastavte tomuto komponentu vlastnú maržu namiesto tej celkovej vyššie.',
    margin_override_use_global: 'Použiť celkovú maržu',
    specs_notes: 'Špecifikácie / Poznámky', tier_rating: 'Hodnotenie triedy', tower_category: 'Kategória skrine',
    tower_category_help: 'Veľká skriňa 55–75 cm · Stredná skriňa 35–55 cm · Malá skriňa 30–45 cm · SFF <35 cm',
    ram_generation: 'Generácia DDR', ram_speed_mhz: 'Rýchlosť (MHz)',
    ram_generation_help: 'Ovláda filter DDR4/DDR5 a posuvník rýchlosti na stránke Zostaviť — nechajte prázdne, ak chcete túto sadu skryť z oboch.',
    fan_size_mm: 'Veľkosť ventilátora (mm)',
    preinstalled_fans: 'Predinštalované ventilátory',
    preinstalled_fans_help: 'Ktorý ventilátor (ak nejaký) je v danej pozícii od výroby — ponechanie je zadarmo, výmena za iný ventilátor na stránke Zostaviť účtuje jeho cenu.',
    fan_none: 'Žiadny (súčasť skrine, bez značky)',
    update_arrow: 'Aktualizovať →', add_prefix: 'Pridať ', edit_prefix: 'Upraviť ',
    select_prefix: '— Vybrať ', select_suffix: ' —',
    listings: (n) => `${n} položiek · zmeny sa ukladajú do localStorage a synchronizujú s obchodom`,
    price_auto_note: (mp, m) => `Auto: €${mp} trh + marža = €${m} predajná cena`,
    checking_access: 'Kontrolujeme prístup…',
    sign_in_clerk_desc: 'Prihláste sa svojím GOMP účtom. Prístup do administrácie sa udeľuje jednotlivým účtom.',
    not_admin_desc: 'Ste prihlásený, ale tento účet nemá prístup do administrácie.',
    not_admin_hint: 'Udelenie prístupu: v Clerk dashboarde otvorte tohto používateľa a do Public metadata uložte {"role":"admin"} — alebo pridajte e-mail do ADMIN_EMAILS.',
    switch_account: 'Prepnúť účet',
    requests_tab: 'Žiadosti', order_requests: 'Žiadosti o objednávku', refresh: 'Obnoviť', loading: 'Načítava sa…',
    no_requests: 'Zatiaľ žiadne žiadosti. Zobrazia sa tu hneď, ako niekto odošle objednávku v pokladni.',
    setup_needed: 'Potrebné nastavenie', error_word: 'Chyba', no_name: '(bez mena)',
    contact_word: 'Kontakt', deliver_to_word: 'Doručiť na', totals_word: 'Sumy', meta_word: 'Podrobnosti',
    parts_word: 'Komponenty', shipping_word: 'Doprava', assembly_word: 'Montáž', discount_word: 'Zľava',
    total_word: 'Spolu', consent_word: 'Súhlas s kontaktom', signed_in_word: 'Odoslané prihláseným používateľom',
    build_word: 'Zostava', set_status: 'Nastaviť stav',
    status_labels: { new: 'Nová', contacted: 'Kontaktovaný', converted: 'Premenená', archived: 'Archivovaná' },
    method_labels: { card: 'Karta', google_pay: 'Google Pay', apple_pay: 'Apple Pay' },
    requests_count: (total, fresh) => `${total} celkovo · ${fresh} nových`,
    gbb_tab: 'Rozpočtové žiadosti', gbb_title: 'Gomp Rozpočtové Zostavy', gbb_no_requests: 'Zatiaľ žiadne žiadosti o rozpočtovú zostavu. Objavia sa tu hneď, ako ich niekto odošle.',
    gbb_status_labels: { new: 'Nová', researching: 'Zisťujem ceny', quoted: 'Ponúknuté', converted: 'Premenená', archived: 'Archivovaná' },
    gbb_use_case_labels: { gaming: 'Hranie', office: 'Kancelária a bežné použitie', creative: 'Tvorba obsahu / strih', server: 'Domáci server / NAS', other: 'Niečo iné' },
    gbb_budget_word: 'Rozpočet', gbb_use_case_word: 'Na čo to bude', gbb_notes_word: 'Poznámky klienta',
    gbb_search_helper: 'Odkazy na vyhľadávanie (nezoškrabuje sa nič — len otvorí vyhľadávanie na kontrolu)',
    gbb_search_placeholder: 'napr. RTX 3070', gbb_add_search: 'Hľadať',
    gbb_proposal_price: 'Cenový návrh (EUR)', gbb_proposal_notes: 'Poznámky k návrhu (súčiastky, stav...)', gbb_save_proposal: 'Uložiť a označiť ako ponúknuté →',
    gbb_count: (total, fresh) => `${total} celkovo · ${fresh} nových`,
    customer_gomps_tab: 'Zákaznícke GOMPy', customer_gomps_title: 'Zákaznícke GOMPy', add_customer_gomp: '+ Pridať zostavu',
    cg_title_label: 'Názov', cg_customer_label: 'Zákazník', cg_customer_placeholder: 'Len meno/iniciálka — napr. "Postavené pre Martina K."',
    cg_specs_label: 'Špecifikácie', cg_specs_help: 'Oddeľte jednotlivé položky pomocou " · ", rovnako ako v záložke Komponenty.',
    cg_price_label: 'Cena (EUR)', cg_built_on_label: 'Dátum dokončenia',
    cg_listed: (n) => `${n} ${n === 1 ? 'zostava' : n >= 2 && n <= 4 ? 'zostavy' : 'zostáv'}`,
  },
};

// ---------------------------------------------------------------------------
// Form state shapes + helpers
// ---------------------------------------------------------------------------

type BuildFormState = {
  name: string; tagline: string; cat: Build['cat']; tier: Tier;
  gpu: string; cpu: string; ram: string; storage: string; mobo: string; cooler: string; psu: string;
  price: string; rating: string;
};

function initialBuildForm(): BuildFormState {
  return { name: '', tagline: '', cat: 'flagship', tier: 'S', gpu: '', cpu: '', ram: '', storage: '', mobo: '', cooler: '', psu: '', price: '', rating: '4.9' };
}

type CompFormState = {
  name: string; price: string; marketPrice: string; specs: string; category: string; tier: Tier;
  passmark: number | null; passmarkUrl: string; imageUrl: string;
  marginOverrideOn: boolean; marginOverrideType: 'eur' | 'pct'; marginOverrideValue: string;
  ramGeneration: '' | '4' | '5'; ramSpeedMhz: string;
  fanSizeMm: string; // fan only
  // case only — which fan (by name, from the 'fan' catalog) and how many ship pre-installed at
  // each of this case's existing fanMounts positions. Only lets you assign a fan to a position
  // the case already defines (position/maxCount/sizesMm aren't editable here) — see the
  // "Pre-installed fans" section, shown only while editing a case that already has fanMounts.
  fanPreinstalled: Partial<Record<FanMountPosition, { fanName: string; count: string }>>;
};

function initialCompForm(): CompFormState {
  return {
    name: '', price: '', marketPrice: '', specs: '', category: 'Mid Tower', tier: 'B', passmark: null, passmarkUrl: '', imageUrl: '',
    marginOverrideOn: false, marginOverrideType: 'pct', marginOverrideValue: '0',
    ramGeneration: '', ramSpeedMhz: '',
    fanSizeMm: '', fanPreinstalled: {},
  };
}

// Live-over-stored PassMark refresh + market-price-driven repricing, run once on every load.
function migrateComponentDb(db: ComponentDb, margin: Margin): ComponentDb {
  const out = {} as ComponentDb;
  (Object.keys(db) as Category[]).forEach((cat) => {
    out[cat] = (db[cat] || []).map((c) => {
      let next = c;
      if (cat === 'gpu' || cat === 'cpu') {
        const live = passmarkLookup(c.name);
        if (live) next = { ...next, passmark: live.score, passmarkUrl: live.url, tier: tierFromPassmark(cat === 'gpu', live.score) };
      }
      if (next.marketPrice != null) {
        const price = computePrice(next.marketPrice, next.marginOverride ?? margin);
        if (price != null) next = { ...next, price };
      }
      return next;
    });
  });
  return out;
}

function recomputeMarginPrices(db: ComponentDb, margin: Margin): ComponentDb {
  const out = {} as ComponentDb;
  (Object.keys(db) as Category[]).forEach((cat) => {
    out[cat] = (db[cat] || []).map((c) => {
      if (c.marketPrice == null) return c;
      // A component with its own margin override doesn't move when the site-wide margin does
      // — that's the entire point of the override.
      if (c.marginOverride != null) return c;
      const price = computePrice(c.marketPrice, margin);
      return price != null ? { ...c, price } : c;
    });
  });
  return out;
}

function computeNextBuildId(builds: Build[]): number {
  return builds.reduce((m, b) => Math.max(m, b.id || 0), 0) + 1;
}

// Mirrors the server's own checks (MAX_BYTES and the component-images Storage bucket's
// allowed_mime_types — see scripts/widen-image-bucket-mime-types.mjs) so a bad file is rejected
// instantly, client-side, instead of only after a full round trip to the upload route.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Unsupported file type (${file.type || 'unknown'}). Use PNG, JPEG, WebP, GIF, or SVG.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image too large (max 5MB).';
  }
  return null;
}

// "Zákaznícke GOMPy" (customer_builds) add/edit form state.
type CgFormState = {
  title: string; customerLabel: string; specs: string; priceEur: string; builtOn: string; imageUrl: string;
};

function initialCgForm(): CgFormState {
  return { title: '', customerLabel: '', specs: '', priceEur: '', builtOn: '', imageUrl: '' };
}

const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469',
  letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
};

const INPUT_STYLE: CSSProperties = {
  width: '100%', padding: '9px 12px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2,
  fontSize: 13, background: '#F5F0E6', color: '#1C1C1A', fontFamily: 'var(--font-sans)',
};

// Order-request detail panel: small caps label over a plain value block.
const ADMIN_LABEL: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#A09890',
  letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5,
};

const ADMIN_VALUE: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 12, color: '#1C1C1A', lineHeight: 1.7,
};

const STATUS_COLORS: Record<IntentStatus, { bg: string; text: string; border: string }> = {
  new: { bg: '#FFF0EE', text: '#8B2020', border: 'rgba(204,51,51,0.3)' },
  contacted: { bg: '#E8F0FF', text: '#1A3080', border: 'rgba(51,102,204,0.3)' },
  converted: { bg: '#E8FFF0', text: '#1A5030', border: 'rgba(51,153,102,0.35)' },
  archived: { bg: '#F2F2F6', text: '#505060', border: 'rgba(144,144,160,0.35)' },
};

const GBB_STATUS_COLORS: Record<GbbStatus, { bg: string; text: string; border: string }> = {
  new: { bg: '#FFF0EE', text: '#8B2020', border: 'rgba(204,51,51,0.3)' },
  researching: { bg: '#FFF8E8', text: '#8A6D2F', border: 'rgba(196,163,90,0.4)' },
  quoted: { bg: GBB_GREEN_TINT(0.1), text: GBB_GREEN, border: GBB_GREEN_TINT(0.35) },
  converted: { bg: '#E8FFF0', text: '#1A5030', border: 'rgba(51,153,102,0.35)' },
  archived: { bg: '#F2F2F6', text: '#505060', border: 'rgba(144,144,160,0.35)' },
};

function tierBadge(tier: Tier | undefined, palette: Record<Tier, { bg: string; text: string; border: string }>) {
  return palette[tier || 'D'] || palette.D;
}

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

function CompSelect({
  label, value, options, placeholder, t, fmt, onChange,
}: {
  label: string; value: string; options: Component[]; placeholder: string;
  t: Translations; fmt: (n: number) => string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={INPUT_STYLE}>
        <option value="">{t.select_prefix}{placeholder}{t.select_suffix}</option>
        {options.map((c) => (
          <option key={c.id} value={c.name}>{`${c.name}  ·  ${fmt(c.price)}`}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { lang, currency, setLang, setCurrency, fmt } = useSite();
  const isMobile = useIsMobile();

  // Admin access is decided server-side (Clerk identity + role) via
  // /api/admin/session. This client state only drives what the UI shows —
  // every admin data endpoint re-checks on the server, so a tampered client
  // can't read or write anything it shouldn't.
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  // Only the server's answer is stored; the rest is derived, so a signed-out
  // visitor resolves to 'no' without an extra render pass.
  const [serverSaysAdmin, setServerSaysAdmin] = useState<boolean | null>(null);
  const adminState: 'checking' | 'yes' | 'no' = !clerkLoaded
    ? 'checking'
    : !isSignedIn
      ? 'no'
      : serverSaysAdmin === null
        ? 'checking'
        : serverSaysAdmin
          ? 'yes'
          : 'no';
  const authed = adminState === 'yes';

  const [tab, setTab] = useState<'builds' | 'components' | 'requests' | 'gbb' | 'customerGomps'>('requests');
  const [builds, setBuilds] = useState<Build[]>([]);
  const [compDb, setCompDb] = useState<ComponentDb>(defaultComponentDb());

  const [customerGomps, setCustomerGomps] = useState<CustomerBuild[]>([]);
  const [showCgForm, setShowCgForm] = useState(false);
  const [cgEditId, setCgEditId] = useState<string | null>(null);
  const [cgForm, setCgForm] = useState<CgFormState>(initialCgForm());
  const [cgImageStatus, setCgImageStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [cgImageError, setCgImageError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BuildFormState>(initialBuildForm());

  const [compCat, setCompCat] = useState<Category>('gpu');
  const [compForm, setCompForm] = useState<CompFormState>(initialCompForm());
  const [editCompId, setEditCompId] = useState<string | null>(null);
  // Screen position for the edit popup, computed once (from the clicked row's Edit button) when
  // openEditComp opens it — see openEditComp below. null while in Add mode, where the form stays
  // inline in its usual spot rather than floating.
  const [editAnchor, setEditAnchor] = useState<{ top: number; left: number } | null>(null);
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [imageError, setImageError] = useState<string | null>(null);

  const [saveMsg, setSaveMsg] = useState('');
  const [nextBuildId, setNextBuildId] = useState(1);

  const [margin, setMarginState] = useState<Margin>(defaultMargin());
  const [marginValueInput, setMarginValueInput] = useState('0');

  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);

  const [intents, setIntents] = useState<CheckoutIntent[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [intentsError, setIntentsError] = useState<string | null>(null);
  const [needsServiceKey, setNeedsServiceKey] = useState(false);
  const [expandedIntent, setExpandedIntent] = useState<string | null>(null);

  const [gbbRequests, setGbbRequests] = useState<GbbRequest[]>([]);
  const [gbbLoading, setGbbLoading] = useState(false);
  const [gbbError, setGbbError] = useState<string | null>(null);
  const [gbbNeedsServiceKey, setGbbNeedsServiceKey] = useState(false);
  const [expandedGbb, setExpandedGbb] = useState<string | null>(null);
  const [gbbSearchTerm, setGbbSearchTerm] = useState<Record<string, string>>({});
  const [gbbProposalDraft, setGbbProposalDraft] = useState<Record<string, { price: string; notes: string }>>({});

  const t = TRANSLATIONS[lang];
  const catLabels = CAT_LABELS[lang];

  // Ask the server whether this Clerk user is an admin. Re-runs when the Clerk
  // session settles or changes (sign-in / sign-out / switch user).
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        const body = (await res.json()) as { isAdmin?: boolean };
        if (!cancelled) setServerSaysAdmin(!!body.isAdmin);
      } catch {
        if (!cancelled) setServerSaysAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn]);

  // Load the build list from localStorage (unchanged) and the component catalog from
  // Supabase, once authed. The catalog stays live via Realtime — if this same catalog is
  // being edited from another tab or another admin, this view converges instead of going
  // stale. `migrateComponentDb` recomputes each item's tier/passmark against the current
  // passmark.ts table for display; it's deliberately NOT written back automatically — only an
  // explicit Save persists anything, so opening this page never silently mutates shared data.
  useEffect(() => {
    if (!authed) return;
    const storedMargin = readJSON<Margin>('gomp_margin', defaultMargin());
    const hadBuilds = typeof window !== 'undefined' && localStorage.getItem('gomp_builds_db') != null;
    const loadedBuilds = readJSON<Build[]>('gomp_builds_db', defaultBuilds());
    if (!hadBuilds) writeJSON('gomp_builds_db', loadedBuilds);

    setMarginState(storedMargin);
    setMarginValueInput(String(storedMargin.value));
    setBuilds(loadedBuilds);
    setNextBuildId(computeNextBuildId(loadedBuilds));

    let cancelled = false;
    async function loadCatalog() {
      const rawCompDb = await fetchComponentDb();
      if (cancelled) return;
      setCompDb(migrateComponentDb(rawCompDb, storedMargin));
    }
    loadCatalog();
    const unsubscribe = subscribeComponents(loadCatalog);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authed]);

  // "Zákaznícke GOMPy" — same live-catalog pattern as the components effect above.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    async function loadCustomerGomps() {
      const data = await fetchCustomerBuilds();
      if (!cancelled) setCustomerGomps(data);
    }
    loadCustomerGomps();
    const unsubscribe = subscribeCustomerBuilds(loadCustomerGomps);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authed]);

  // ---- order requests (checkout_intents) ----

  const loadIntents = useCallback(async () => {
    setIntentsLoading(true);
    const res = await fetchIntents();
    if (res.ok) {
      setIntents(res.intents);
      setIntentsError(null);
      setNeedsServiceKey(false);
    } else {
      setIntentsError(res.error);
      setNeedsServiceKey(!!res.needsServiceRoleKey);
    }
    setIntentsLoading(false);
  }, []);

  useEffect(() => {
    if (authed) loadIntents();
  }, [authed, loadIntents]);

  async function changeIntentStatus(id: string, status: IntentStatus) {
    // Optimistic: reflect immediately, roll back if the server refuses.
    const previous = intents;
    setIntents((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await updateIntentStatus(id, status);
    if (error) {
      setIntents(previous);
      setIntentsError(error);
    }
  }

  // ---- Gomp Budget Builds requests (gbb_requests) ----

  const loadGbbRequests = useCallback(async () => {
    setGbbLoading(true);
    const res = await fetchGbbRequests();
    if (res.ok) {
      setGbbRequests(res.requests);
      setGbbError(null);
      setGbbNeedsServiceKey(false);
    } else {
      setGbbError(res.error);
      setGbbNeedsServiceKey(!!res.needsServiceRoleKey);
    }
    setGbbLoading(false);
  }, []);

  useEffect(() => {
    if (authed) loadGbbRequests();
  }, [authed, loadGbbRequests]);

  async function changeGbbStatus(id: string, status: GbbStatus) {
    const previous = gbbRequests;
    setGbbRequests((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    const result = await updateGbbRequest(id, { status });
    if (!result.ok) {
      setGbbRequests(previous);
      setGbbError(result.error);
    }
  }

  async function saveGbbProposal(id: string) {
    const draft = gbbProposalDraft[id];
    if (!draft) return;
    const priceProposalEur = draft.price.trim() !== '' ? Number(draft.price) : null;
    const result = await updateGbbRequest(id, {
      priceProposalEur: priceProposalEur != null && !isNaN(priceProposalEur) ? priceProposalEur : null,
      proposalNotes: draft.notes,
      status: 'quoted',
    });
    if (result.ok) {
      setGbbRequests((list) => list.map((r) => (r.id === id ? result.request : r)));
    } else {
      setGbbError(result.error);
    }
  }

  // ---- builds CRUD ----

  function openAddBuild() {
    setShowForm(true);
    setEditId(null);
    setForm(initialBuildForm());
  }

  function openEditBuild(id: number) {
    const b = builds.find((x) => x.id === id);
    if (!b) return;
    setShowForm(true);
    setEditId(id);
    setForm({
      name: b.name, tagline: b.tagline, cat: b.cat, tier: b.tier,
      gpu: b.gpu, cpu: b.cpu, ram: b.ram, storage: b.storage, mobo: b.mobo, cooler: b.cooler, psu: b.psu,
      price: String(b.price), rating: String(b.rating),
    });
  }

  function saveBuild() {
    if (!form.name.trim()) return;
    const build: Build = {
      id: editId !== null ? editId : nextBuildId,
      name: form.name.trim(), tagline: form.tagline.trim(), cat: form.cat, tier: form.tier,
      gpu: form.gpu, cpu: form.cpu, ram: form.ram, storage: form.storage, mobo: form.mobo, cooler: form.cooler, psu: form.psu,
      price: parseFloat(form.price) || 0, rating: parseFloat(form.rating) || 0, visible: true,
    };
    const newBuilds = editId !== null ? builds.map((b) => (b.id === editId ? build : b)) : [...builds, build];
    writeJSON('gomp_builds_db', newBuilds);
    const wasEditing = editId !== null;
    setBuilds(newBuilds);
    setShowForm(false);
    setEditId(null);
    if (!wasEditing) setNextBuildId(nextBuildId + 1);
    setSaveMsg('✓');
    setTimeout(() => setSaveMsg(''), 2500);
  }

  function deleteBuild(id: number) {
    const b = builds.find((x) => x.id === id);
    if (!window.confirm(`Delete "${b ? b.name : ''}"?`)) return;
    const newBuilds = builds.filter((x) => x.id !== id);
    writeJSON('gomp_builds_db', newBuilds);
    setBuilds(newBuilds);
  }

  function toggleVisible(id: number) {
    const newBuilds = builds.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b));
    writeJSON('gomp_builds_db', newBuilds);
    setBuilds(newBuilds);
  }

  // ---- customer GOMPs (customer_builds) CRUD ----

  function openAddCg() {
    setShowCgForm(true);
    setCgEditId(null);
    setCgForm(initialCgForm());
    setCgImageStatus('idle');
    setCgImageError(null);
  }

  function openEditCg(id: string) {
    const b = customerGomps.find((x) => x.id === id);
    if (!b) return;
    setShowCgForm(true);
    setCgEditId(id);
    setCgForm({
      title: b.title,
      customerLabel: b.customerLabel,
      specs: b.specs,
      priceEur: b.priceEur != null ? String(b.priceEur) : '',
      builtOn: b.builtOn || '',
      imageUrl: b.imageUrl || '',
    });
    setCgImageStatus('idle');
    setCgImageError(null);
  }

  function cancelEditCg() {
    setShowCgForm(false);
    setCgEditId(null);
    setCgForm(initialCgForm());
  }

  async function saveCg() {
    if (!cgForm.title.trim()) return;
    const build: CustomerBuild = {
      id: cgEditId ?? '', // placeholder — Supabase assigns the real id on insert
      title: cgForm.title.trim(),
      customerLabel: cgForm.customerLabel.trim(),
      specs: cgForm.specs.trim(),
      priceEur: cgForm.priceEur !== '' ? parseFloat(cgForm.priceEur) || 0 : null,
      builtOn: cgForm.builtOn || null,
      imageUrl: cgForm.imageUrl || null,
      isLive: true,
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    };
    if (cgEditId) {
      const saved = await updateCustomerBuild(cgEditId, build);
      setCustomerGomps((list) => list.map((b) => (b.id === cgEditId ? saved : b)));
    } else {
      const saved = await insertCustomerBuild(build, customerGomps.length);
      setCustomerGomps((list) => [...list, saved]);
    }
    cancelEditCg();
  }

  async function deleteCg(id: string) {
    const b = customerGomps.find((x) => x.id === id);
    if (!window.confirm(`Delete "${b ? b.title : ''}"?`)) return;
    await deleteCustomerBuild(id);
    setCustomerGomps((list) => list.filter((x) => x.id !== id));
  }

  async function toggleCgLive(build: CustomerBuild) {
    const updated: CustomerBuild = { ...build, isLive: !build.isLive };
    const saved = await updateCustomerBuild(build.id, updated);
    setCustomerGomps((list) => list.map((b) => (b.id === build.id ? saved : b)));
  }

  // Same plain-upload flow as handleImageUpload (see the Components tab) — no
  // background removal, the admin pre-cuts the photo themselves if they want transparency.
  async function handleCgImageUpload(file: File) {
    const invalidReason = validateImageFile(file);
    if (invalidReason) {
      setCgImageStatus('error');
      setCgImageError(invalidReason);
      return;
    }
    setCgImageStatus('uploading');
    setCgImageError(null);
    try {
      const body = new FormData();
      body.append('file', file, file.name || 'customer-build.png');
      body.append('nameHint', cgForm.title || 'customer-build');
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed.');
      setCgForm((f) => ({ ...f, imageUrl: json.url! }));
      setCgImageStatus('idle');
    } catch (e) {
      setCgImageStatus('error');
      setCgImageError(e instanceof Error ? e.message : 'Image upload failed.');
    }
  }

  // ---- margin ----

  // Only components with a manual market price actually change on a margin edit — push just
  // those back to Supabase (rather than the whole catalog) so everyone else's /build reflects
  // the new pricing too, without a wasted write per unaffected row.
  async function updateMargin(patch: Partial<Margin>) {
    const newMargin = { ...margin, ...patch };
    writeJSON('gomp_margin', newMargin);
    const newCompDb = recomputeMarginPrices(compDb, newMargin);
    setMarginState(newMargin);
    setCompDb(newCompDb);
    const updates: Promise<unknown>[] = [];
    (Object.keys(newCompDb) as Category[]).forEach((cat) => {
      newCompDb[cat].forEach((c, i) => {
        const before = compDb[cat]?.[i];
        if (before && before.id === c.id && before.price !== c.price) {
          updates.push(updateComponentRow(c.id, cat, c));
        }
      });
    });
    await Promise.all(updates);
  }

  // ---- components CRUD ----

  // The margin this one component should actually be priced with — its own override if the
  // form has one enabled, otherwise undefined so callers fall back to the site-wide margin.
  function formMarginOverride(form: CompFormState): Margin | undefined {
    if (!form.marginOverrideOn) return undefined;
    return { type: form.marginOverrideType, value: parseFloat(form.marginOverrideValue) || 0 };
  }

  async function addComponent() {
    if (!compForm.name.trim()) return;
    const marketPrice = compForm.marketPrice !== '' ? parseFloat(compForm.marketPrice) : null;
    const marginOverride = formMarginOverride(compForm);
    const derived = marketPrice != null ? computePrice(marketPrice, marginOverride ?? margin) : null;
    const tier: Tier = compForm.passmark ? tierFromPassmark(compCat === 'gpu', compForm.passmark) : compForm.tier;
    const comp: Component = {
      id: '', // placeholder — Supabase assigns the real id on insert
      name: compForm.name.trim(),
      price: derived != null ? derived : parseFloat(compForm.price) || 0,
      marketPrice,
      specs: compForm.specs.trim(),
      tier,
      ...(compForm.passmark ? { passmark: compForm.passmark, passmarkUrl: compForm.passmarkUrl || '' } : {}),
      ...(compCat === 'case' ? { category: compForm.category || 'Mid Tower' } : {}),
      ...(compCat === 'ram' && compForm.ramGeneration ? { ramGeneration: Number(compForm.ramGeneration) as 4 | 5 } : {}),
      ...(compCat === 'ram' && compForm.ramSpeedMhz ? { ramSpeedMhz: parseInt(compForm.ramSpeedMhz, 10) } : {}),
      ...(compCat === 'fan' && compForm.fanSizeMm ? { fanSizeMm: parseFloat(compForm.fanSizeMm) } : {}),
      ...(compForm.imageUrl ? { imageUrl: compForm.imageUrl } : {}),
      ...(marginOverride ? { marginOverride } : {}),
    };
    const sortOrder = (compDb[compCat] || []).length;
    const saved = await insertComponent(compCat, comp, sortOrder);
    setCompDb((db) => ({ ...db, [compCat]: [...(db[compCat] || []), saved] }));
    setCompForm(initialCompForm());
  }

  async function updateComponent() {
    if (!editCompId || !compForm.name.trim()) return;
    const marketPrice = compForm.marketPrice !== '' ? parseFloat(compForm.marketPrice) : null;
    const marginOverride = formMarginOverride(compForm);
    const derived = marketPrice != null ? computePrice(marketPrice, marginOverride ?? margin) : null;
    const tier: Tier = compForm.passmark ? tierFromPassmark(compCat === 'gpu', compForm.passmark) : compForm.tier;
    const existing = (compDb[compCat] || []).find((c) => c.id === editCompId);
    const updated: Component = {
      id: editCompId,
      name: compForm.name.trim(),
      price: derived != null ? derived : parseFloat(compForm.price) || 0,
      marketPrice,
      specs: compForm.specs.trim(),
      tier,
      ...(compForm.passmark ? { passmark: compForm.passmark, passmarkUrl: compForm.passmarkUrl || '' } : {}),
      ...(compCat === 'case' ? { category: compForm.category || 'Mid Tower' } : {}),
      // socket/formFactor have no edit fields in this form yet — carry the existing values
      // forward so an otherwise-unrelated edit can't silently strip a CPU/motherboard's
      // socket or form-factor compatibility data.
      ...(existing?.socket ? { socket: existing.socket } : {}),
      ...(existing?.formFactor ? { formFactor: existing.formFactor } : {}),
      // ramHeightMm also has no edit field — same carry-forward, otherwise every edit of a
      // bulk-imported RAM SKU would silently zero out its real heatsink height.
      ...(existing?.ramHeightMm != null ? { ramHeightMm: existing.ramHeightMm } : {}),
      // Same reasoning for ramFamily (drives the /build stick-count grouping) and isLive (drives
      // the live/hidden toggle below) — neither has a field in this form, so an unrelated price/
      // tier edit must not silently un-group a RAM kit or bring a hidden component back live.
      ...(existing?.ramFamily ? { ramFamily: existing.ramFamily } : {}),
      ...(existing?.isLive === false ? { isLive: false } : {}),
      ...(compCat === 'ram' && compForm.ramGeneration ? { ramGeneration: Number(compForm.ramGeneration) as 4 | 5 } : {}),
      ...(compCat === 'ram' && compForm.ramSpeedMhz ? { ramSpeedMhz: parseInt(compForm.ramSpeedMhz, 10) } : {}),
      ...(compCat === 'fan' && compForm.fanSizeMm ? { fanSizeMm: parseFloat(compForm.fanSizeMm) } : {}),
      // None of these mm-dimension fields have edit inputs in this form either — same
      // carry-forward reasoning as ramHeightMm above, just for every other category that has one.
      // Without this, editing e.g. a GPU's price would silently zero out gpuLengthMm/gpuSlotWidth
      // and quietly break every case-fit check (fitsInCase) that GPU is involved in from then on.
      ...(existing?.caseWidthMm != null ? { caseWidthMm: existing.caseWidthMm } : {}),
      ...(existing?.caseHeightMm != null ? { caseHeightMm: existing.caseHeightMm } : {}),
      ...(existing?.caseDepthMm != null ? { caseDepthMm: existing.caseDepthMm } : {}),
      ...(existing?.maxGpuLengthMm != null ? { maxGpuLengthMm: existing.maxGpuLengthMm } : {}),
      ...(existing?.maxCoolerHeightMm != null ? { maxCoolerHeightMm: existing.maxCoolerHeightMm } : {}),
      ...(existing?.maxRadiatorMm != null ? { maxRadiatorMm: existing.maxRadiatorMm } : {}),
      ...(existing?.maxPsuLengthMm != null ? { maxPsuLengthMm: existing.maxPsuLengthMm } : {}),
      ...(existing?.gpuLengthMm != null ? { gpuLengthMm: existing.gpuLengthMm } : {}),
      ...(existing?.gpuSlotWidth != null ? { gpuSlotWidth: existing.gpuSlotWidth } : {}),
      ...(existing?.coolerHeightMm != null ? { coolerHeightMm: existing.coolerHeightMm } : {}),
      ...(existing?.coolerRadiatorMm != null ? { coolerRadiatorMm: existing.coolerRadiatorMm } : {}),
      ...(existing?.psuLengthMm != null ? { psuLengthMm: existing.psuLengthMm } : {}),
      ...(!(compCat === 'fan' && compForm.fanSizeMm) && existing?.fanSizeMm != null ? { fanSizeMm: existing.fanSizeMm } : {}),
      // Pre-installed-fan assignments (see the "Pre-installed fans" section) merge onto the
      // case's existing fanMounts — position/maxCount/sizesMm aren't editable here and must
      // survive untouched; only preinstalledFanName/preinstalledCount change.
      ...(existing?.fanMounts
        ? {
            fanMounts: existing.fanMounts.map((m) => {
              const pre = compForm.fanPreinstalled[m.position];
              if (!pre) return m;
              const count = parseInt(pre.count, 10) || 0;
              return { ...m, preinstalledFanName: pre.fanName || undefined, preinstalledCount: count > 0 ? count : undefined };
            }),
          }
        : {}),
      ...(compForm.imageUrl ? { imageUrl: compForm.imageUrl } : {}),
      ...(marginOverride ? { marginOverride } : {}),
    };
    const saved = await updateComponentRow(editCompId, compCat, updated);
    setCompDb((db) => ({ ...db, [compCat]: (db[compCat] || []).map((c) => (c.id === editCompId ? saved : c)) }));
    setEditCompId(null);
    setCompForm(initialCompForm());
  }

  // Pulls a SKU out of (or back into) the /build catalog without deleting its row — for a bad
  // price, a discontinued part, or a mining artifact worth double-checking before it's gone for
  // good. Spreads the full existing component (not just a couple of fields, like the edit form
  // does) so this never has to know about every other field that might need carrying forward.
  async function toggleComponentLive(cat: Category, comp: Component) {
    const updated: Component = { ...comp, isLive: !(comp.isLive ?? true) };
    const saved = await updateComponentRow(comp.id, cat, updated);
    setCompDb((db) => ({ ...db, [cat]: (db[cat] || []).map((c) => (c.id === comp.id ? saved : c)) }));
  }

  // One-click "apply the margin" for a component that's never had a market price recorded:
  // treats its current sell price as the market/base price and saves the price the site-wide
  // (or this component's own override) margin actually computes from it.
  async function applyMarginTo(cat: Category, comp: Component) {
    const basePrice = comp.marketPrice ?? comp.price;
    const effective = comp.marginOverride ?? margin;
    const price = computePrice(basePrice, effective);
    if (price == null) return;
    const updated: Component = { ...comp, marketPrice: basePrice, price };
    const saved = await updateComponentRow(comp.id, cat, updated);
    setCompDb((db) => ({ ...db, [cat]: (db[cat] || []).map((c) => (c.id === comp.id ? saved : c)) }));
  }

  async function deleteComponent(cat: Category, id: string) {
    await deleteComponentRow(id);
    setCompDb((db) => ({ ...db, [cat]: (db[cat] || []).filter((c) => c.id !== id) }));
  }

  // anchorRect is the clicked Edit button's own bounding box (see its onClick below) — used to
  // float the form right next to the row that was clicked instead of the old behavior, where a
  // single shared form sat fixed below the whole grid and editing any card but the last one meant
  // scrolling down to find the form that had just silently updated off-screen.
  function openEditComp(cat: Category, id: string, anchorRect?: DOMRect) {
    const comp = (compDb[cat] || []).find((c) => c.id === id);
    if (!comp) return;
    const PANEL_WIDTH = isMobile ? window.innerWidth - 32 : 440;
    const EDGE_MARGIN = 12;
    if (anchorRect) {
      let left = anchorRect.right + EDGE_MARGIN;
      if (left + PANEL_WIDTH > window.innerWidth - EDGE_MARGIN) left = anchorRect.left - PANEL_WIDTH - EDGE_MARGIN;
      if (left < EDGE_MARGIN) left = Math.max(EDGE_MARGIN, window.innerWidth - PANEL_WIDTH - EDGE_MARGIN);
      // Leaves room for the panel's own height (it scrolls internally past that via maxHeight)
      // rather than trying to predict the exact height of a form whose field count varies by
      // category (case/ram add extra rows) before it has even rendered.
      const top = Math.max(EDGE_MARGIN, Math.min(anchorRect.top, window.innerHeight - EDGE_MARGIN - 120));
      setEditAnchor({ top, left });
    } else {
      setEditAnchor({ top: 80, left: Math.max(EDGE_MARGIN, (window.innerWidth - PANEL_WIDTH) / 2) });
    }
    setCompCat(cat);
    setEditCompId(id);
    setCompForm({
      name: comp.name || '',
      price: String(comp.price ?? ''),
      // No market price on file yet? Prefill it with the current sell price so the margin math
      // (and the auto note below the field) kicks in immediately — hitting Update then applies
      // the margin to this component instead of requiring the price to be re-typed from scratch.
      marketPrice: comp.marketPrice != null ? String(comp.marketPrice) : String(comp.price ?? ''),
      specs: comp.specs || '',
      category: comp.category || 'Mid Tower',
      tier: comp.tier || 'B',
      passmark: comp.passmark || null,
      passmarkUrl: comp.passmarkUrl || '',
      imageUrl: comp.imageUrl || '',
      marginOverrideOn: comp.marginOverride != null,
      marginOverrideType: comp.marginOverride?.type ?? 'pct',
      marginOverrideValue: comp.marginOverride ? String(comp.marginOverride.value) : '0',
      ramGeneration: comp.ramGeneration ? (String(comp.ramGeneration) as '4' | '5') : '',
      ramSpeedMhz: comp.ramSpeedMhz != null ? String(comp.ramSpeedMhz) : '',
      fanSizeMm: comp.fanSizeMm != null ? String(comp.fanSizeMm) : '',
      fanPreinstalled: Object.fromEntries(
        (comp.fanMounts || []).map((m) => [
          m.position,
          { fanName: m.preinstalledFanName || '', count: String(m.preinstalledCount ?? 0) },
        ]),
      ) as CompFormState['fanPreinstalled'],
    });
  }

  function cancelEditComp() {
    setEditCompId(null);
    setEditAnchor(null);
    setCompForm(initialCompForm());
  }

  // Escape closes the floating edit popup the same way the backdrop click and Cancel button do —
  // only wired up while it's actually open, matching how any other dismissable overlay behaves.
  useEffect(() => {
    if (!editCompId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelEditComp();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCompId]);

  // Uploads the file exactly as picked — no client-side processing. The upload still goes
  // through a server route (see /api/admin/upload-image) because Storage writes need the
  // service-role key, same reasoning as every other admin write in this app. If the admin wants
  // a transparent product shot, they pre-cut the background themselves (e.g. export a PNG with
  // alpha already removed) before picking the file here; the upload and every render site pass
  // the alpha channel through untouched.
  async function handleImageUpload(file: File) {
    const invalidReason = validateImageFile(file);
    if (invalidReason) {
      setImageStatus('error');
      setImageError(invalidReason);
      return;
    }
    setImageStatus('uploading');
    setImageError(null);
    try {
      const body = new FormData();
      body.append('file', file, file.name || 'component.png');
      body.append('nameHint', compForm.name || compCat);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed.');
      setCompForm((f) => ({ ...f, imageUrl: json.url! }));
      setImageStatus('idle');
    } catch (e) {
      setImageStatus('error');
      setImageError(e instanceof Error ? e.message : 'Image upload failed.');
    }
  }

  function pickSuggestion(s: Suggestion) {
    setCompForm((f) => ({ ...f, name: s.name, specs: s.specs || f.specs, passmark: s.passmark || null, passmarkUrl: s.passmarkUrl || '' }));
    setNameDropdownOpen(false);
  }

  // ---- derived values ----

  // The case actually being edited (fanMounts/existing dimension data lives on it, not on
  // compForm) — used by the "Pre-installed fans" section below, which only appears once a case
  // with real fanMounts positions is being edited (there's no UI here for defining new mount
  // positions from scratch, only for assigning a fan to ones the case already has).
  const editingCase = compCat === 'case' && editCompId ? (compDb.case || []).find((c) => c.id === editCompId) : undefined;
  const suggestQ = compForm.name.trim().toLowerCase();
  const existingNames = new Set((compDb[compCat] || []).map((c) => c.name.toLowerCase()));
  const filteredSuggestions = (SUGGESTIONS[compCat] || []).filter((s) => !suggestQ || s.name.toLowerCase().includes(suggestQ));
  const noSuggestions = filteredSuggestions.length === 0;
  const suggestionsToShow = filteredSuggestions.slice(0, 10).map((s) => {
    const live = (compCat === 'gpu' || compCat === 'cpu') ? passmarkLookup(s.name) : null;
    const effective: Suggestion = live ? { ...s, passmark: live.score, passmarkUrl: live.url } : s;
    return { name: s.name, already: existingNames.has(s.name.toLowerCase()), effective };
  });

  const mpParsed = parseFloat(compForm.marketPrice);
  const hasManualMarketPrice = compForm.marketPrice !== '' && !isNaN(mpParsed);
  const formMargin = formMarginOverride(compForm) ?? margin;
  const priceAutoNote = hasManualMarketPrice ? t.price_auto_note(mpParsed, computePrice(mpParsed, formMargin) ?? 0) : '';

  const totalComps = (Object.values(compDb) as Component[][]).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);
  const newIntentCount = intents.filter((i) => i.status === 'new').length;
  const newGbbCount = gbbRequests.filter((r) => r.status === 'new').length;

  // ---------------------------------------------------------------------------
  // Login screen
  // ---------------------------------------------------------------------------

  if (!authed) {
    const checking = adminState === 'checking' || !clerkLoaded;
    return (
      <div
        style={{
          position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#170809 0%,#2E1114 60%,#3A161A 100%)',
          padding: isMobile ? '0 16px' : 0, boxSizing: 'border-box',
        }}
      >
        <div style={{ background: '#FDFAF4', borderRadius: 2, padding: isMobile ? 28 : 52, width: isMobile ? '100%' : 400, maxWidth: 400, boxSizing: 'border-box', border: '0.5px solid rgba(28,28,26,0.1)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, fontStyle: 'italic', letterSpacing: 1.5, color: '#C4A35A', marginBottom: 6 }}>
            GOMP
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 600, color: '#1C1C1A', marginBottom: 6, letterSpacing: -0.5 }}>
            {t.admin_panel}
          </div>

          {checking ? (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300, marginTop: 18 }}>
              {t.checking_access}
            </div>
          ) : !isSignedIn ? (
            <>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', marginBottom: 32, fontWeight: 300, lineHeight: 1.6 }}>
                {t.sign_in_clerk_desc}
              </div>
              <SignInButton mode="modal">
                <button
                  style={{ width: '100%', background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3, fontFamily: 'var(--font-sans)' }}
                >
                  {t.sign_in}
                </button>
              </SignInButton>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', marginBottom: 16, fontWeight: 300, lineHeight: 1.6 }}>
                {t.not_admin_desc}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#8A6D2F', background: 'rgba(196,163,90,0.12)', border: '0.5px solid rgba(196,163,90,0.5)', borderRadius: 2, padding: '10px 12px', lineHeight: 1.6, marginBottom: 20 }}>
                {t.not_admin_hint}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserButton />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469' }}>{t.switch_account}</span>
              </div>
            </>
          )}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '0.5px solid rgba(28,28,26,0.1)', display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button onClick={() => setLang('sk')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'sk' ? '#6E1423' : '#7A7469' }}>SK</button>
            <span style={{ color: 'rgba(28,28,26,0.25)' }}>/</span>
            <button onClick={() => setLang('en')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'en' ? '#6E1423' : '#7A7469' }}>EN</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Admin shell (nav + sidebar + tabs)
  // ---------------------------------------------------------------------------

  return (
    <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}>
      <nav
        className="gomp-nav-bar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 54, display: 'flex', alignItems: 'center',
          padding: isMobile ? '0 14px' : '0 28px', background: '#170A0C', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <TransitionLink
          href="/"
          style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, fontStyle: 'italic', color: '#C4A35A', textDecoration: 'none', letterSpacing: 1.5, marginRight: 14 }}
        >
          GOMP
        </TransitionLink>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(245,240,230,0.28)', letterSpacing: 2, textTransform: 'uppercase', marginRight: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          / {t.admin_crumb}
        </span>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
            <button onClick={() => setLang('sk')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'sk' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontWeight: lang === 'sk' ? 600 : 400 }}>SK</button>
            <span style={{ color: 'rgba(245,240,230,0.25)' }}>/</span>
            <button onClick={() => setLang('en')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'en' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontWeight: lang === 'en' ? 600 : 400 }}>EN</button>
            <span style={{ color: 'rgba(245,240,230,0.18)', marginLeft: 4 }}>|</span>
            <button onClick={() => setCurrency('eur')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: currency === 'eur' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontWeight: currency === 'eur' ? 600 : 400 }}>€</button>
            <span style={{ color: 'rgba(245,240,230,0.25)' }}>/</span>
            <button onClick={() => setCurrency('czk')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: currency === 'czk' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontWeight: currency === 'czk' ? 600 : 400 }}>Kč</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: isMobile ? 10 : 20, alignItems: 'center' }}>
          {!isMobile && (
            <TransitionLink href="/shop" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(245,240,230,0.45)', textDecoration: 'none' }}>
              {t.view_shop}
            </TransitionLink>
          )}
          <DeviceViewToggle dark />
          <UserButton />
        </div>
      </nav>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', paddingTop: 54 }}>
        {/* Sidebar */}
        <div
          style={{
            width: isMobile ? '100%' : 188, flexShrink: 0, background: '#1D0D0F',
            borderRight: isMobile ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
            borderBottom: isMobile ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
            display: 'flex', flexDirection: 'column',
            position: isMobile ? 'static' : 'sticky', top: isMobile ? undefined : 54,
            height: isMobile ? 'auto' : 'calc(100vh - 54px)', overflowY: isMobile ? 'visible' : 'auto',
          }}
        >
          {!isMobile && (
            <div style={{ padding: '20px 16px 10px', fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, color: 'rgba(245,240,230,0.22)', letterSpacing: 2.5, textTransform: 'uppercase' }}>
              {t.manage}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column' }}>
            <button
              onClick={() => setTab('requests')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', gap: 10,
                width: '100%', flex: isMobile ? 1 : undefined, textAlign: 'left', padding: isMobile ? '12px 10px' : '10px 18px',
                background: tab === 'requests' ? 'rgba(245,240,230,0.07)' : 'transparent',
                border: 'none',
                borderLeft: isMobile ? 'none' : `2px solid ${tab === 'requests' ? '#4A90D9' : 'transparent'}`,
                borderBottom: isMobile ? `2px solid ${tab === 'requests' ? '#4A90D9' : 'transparent'}` : 'none',
                color: tab === 'requests' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontSize: 13, fontWeight: tab === 'requests' ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              <span>{t.requests_tab}</span>
              {newIntentCount > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, background: '#6E1423', color: '#FDFAF4',
                    borderRadius: 10, padding: '2px 7px', lineHeight: 1.4,
                  }}
                >
                  {newIntentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('builds')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 10,
                width: '100%', flex: isMobile ? 1 : undefined, textAlign: 'left', padding: isMobile ? '12px 10px' : '10px 18px',
                background: tab === 'builds' ? 'rgba(245,240,230,0.07)' : 'transparent',
                border: 'none',
                borderLeft: isMobile ? 'none' : `2px solid ${tab === 'builds' ? '#4A90D9' : 'transparent'}`,
                borderBottom: isMobile ? `2px solid ${tab === 'builds' ? '#4A90D9' : 'transparent'}` : 'none',
                color: tab === 'builds' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontSize: 13, fontWeight: tab === 'builds' ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {t.builds_tab}
            </button>
            <button
              onClick={() => setTab('components')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 10,
                width: '100%', flex: isMobile ? 1 : undefined, textAlign: 'left', padding: isMobile ? '12px 10px' : '10px 18px',
                background: tab === 'components' ? 'rgba(245,240,230,0.07)' : 'transparent',
                border: 'none',
                borderLeft: isMobile ? 'none' : `2px solid ${tab === 'components' ? '#4A90D9' : 'transparent'}`,
                borderBottom: isMobile ? `2px solid ${tab === 'components' ? '#4A90D9' : 'transparent'}` : 'none',
                color: tab === 'components' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontSize: 13, fontWeight: tab === 'components' ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {t.components_tab}
            </button>
            <button
              onClick={() => setTab('gbb')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', gap: 10,
                width: '100%', flex: isMobile ? 1 : undefined, textAlign: 'left', padding: isMobile ? '12px 10px' : '10px 18px',
                background: tab === 'gbb' ? 'rgba(245,240,230,0.07)' : 'transparent',
                border: 'none',
                borderLeft: isMobile ? 'none' : `2px solid ${tab === 'gbb' ? '#4A90D9' : 'transparent'}`,
                borderBottom: isMobile ? `2px solid ${tab === 'gbb' ? '#4A90D9' : 'transparent'}` : 'none',
                color: tab === 'gbb' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontSize: 13, fontWeight: tab === 'gbb' ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              <span>{t.gbb_tab}</span>
              {newGbbCount > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, background: GBB_GREEN, color: '#FDFAF4',
                    borderRadius: 10, padding: '2px 7px', lineHeight: 1.4,
                  }}
                >
                  {newGbbCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('customerGomps')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 10,
                width: '100%', flex: isMobile ? 1 : undefined, textAlign: 'left', padding: isMobile ? '12px 10px' : '10px 18px',
                background: tab === 'customerGomps' ? 'rgba(245,240,230,0.07)' : 'transparent',
                border: 'none',
                borderLeft: isMobile ? 'none' : `2px solid ${tab === 'customerGomps' ? '#4A90D9' : 'transparent'}`,
                borderBottom: isMobile ? `2px solid ${tab === 'customerGomps' ? '#4A90D9' : 'transparent'}` : 'none',
                color: tab === 'customerGomps' ? '#F5F0E6' : 'rgba(245,240,230,0.42)', fontSize: 13, fontWeight: tab === 'customerGomps' ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {t.customer_gomps_tab}
            </button>
          </div>
          {!isMobile && (
            <div style={{ padding: '24px 18px 0', marginTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,240,230,0.22)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
                {t.database}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: '#F5F0E6', lineHeight: 1, marginBottom: 3 }}>{builds.length}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(245,240,230,0.32)', marginBottom: 18 }}>{t.builds_listed}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: '#F5F0E6', lineHeight: 1, marginBottom: 3 }}>{totalComps}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(245,240,230,0.32)' }}>{t.components_word}</div>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex: 1, background: '#F2EDE3', overflowY: 'auto', minHeight: 'calc(100vh - 54px)' }}>
          {tab === 'requests' && (
            <div style={{ padding: isMobile ? '20px 16px' : '36px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: '#1C1C1A', margin: '0 0 4px', letterSpacing: -0.3 }}>{t.order_requests}</h1>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300 }}>{t.requests_count(intents.length, newIntentCount)}</div>
                </div>
                <button
                  onClick={loadIntents}
                  disabled={intentsLoading}
                  style={{ background: 'transparent', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', cursor: intentsLoading ? 'default' : 'pointer' }}
                >
                  {intentsLoading ? t.loading : t.refresh}
                </button>
              </div>

              {intentsError && (
                <div style={{ background: needsServiceKey ? 'rgba(196,163,90,0.12)' : '#FFF0EE', border: `0.5px solid ${needsServiceKey ? 'rgba(196,163,90,0.5)' : 'rgba(204,51,51,0.25)'}`, borderRadius: 2, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: needsServiceKey ? '#8A6D2F' : '#CC3333', marginBottom: 4 }}>
                    {needsServiceKey ? t.setup_needed : t.error_word}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: needsServiceKey ? '#6B5526' : '#8B2020', lineHeight: 1.6 }}>{intentsError}</div>
                </div>
              )}

              {!intentsError && intents.length === 0 && !intentsLoading && (
                <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 2, padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#7A7469', fontWeight: 300 }}>{t.no_requests}</div>
                </div>
              )}

              {intents.map((it) => {
                const open = expandedIntent === it.id;
                const badge = STATUS_COLORS[it.status];
                return (
                  <div key={it.id} style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedIntent(open ? null : it.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '14px 14px' : '16px 20px', cursor: 'pointer', flexWrap: 'wrap' }}
                    >
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#1C1C1A' }}>
                            {[it.first_name, it.last_name].filter(Boolean).join(' ') || t.no_name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: badge.bg, color: badge.text, border: `0.5px solid ${badge.border}`, borderRadius: 2, padding: '2px 6px' }}>
                            {t.status_labels[it.status]}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7A7469', marginTop: 3 }}>{it.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#1C1C1A' }}>{fmt(Number(it.total_eur))}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#A09890', marginTop: 2 }}>
                          {t.method_labels[it.payment_method]} · {new Date(it.created_at).toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#A09890', width: 12, textAlign: 'center' }}>{open ? '−' : '+'}</span>
                    </div>

                    {open && (
                      <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.08)', padding: isMobile ? '14px' : '18px 20px', background: '#F8F4EA' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18, marginBottom: 18 }}>
                          <div>
                            <div style={ADMIN_LABEL}>{t.contact_word}</div>
                            <div style={ADMIN_VALUE}>
                              {it.email}
                              {it.phone ? <><br />{it.phone}</> : null}
                            </div>
                            <div style={{ ...ADMIN_LABEL, marginTop: 14 }}>{t.deliver_to_word}</div>
                            <div style={ADMIN_VALUE}>
                              {it.address || '—'}
                              <br />
                              {[it.city, it.region, it.zip].filter(Boolean).join(', ')}
                            </div>
                          </div>
                          <div>
                            <div style={ADMIN_LABEL}>{t.totals_word}</div>
                            <div style={ADMIN_VALUE}>
                              {t.parts_word}: {fmt(Number(it.parts_total_eur))}
                              <br />
                              {t.shipping_word}: {fmt(Number(it.shipping_eur))} · {t.assembly_word}: {fmt(Number(it.assembly_eur))}
                              {Number(it.discount_eur) > 0 ? <><br />{t.discount_word}: −{fmt(Number(it.discount_eur))} {it.promo_code ? `(${it.promo_code})` : ''}</> : null}
                              <br />
                              <strong>{t.total_word}: {fmt(Number(it.total_eur))}</strong>
                            </div>
                            <div style={{ ...ADMIN_LABEL, marginTop: 14 }}>{t.meta_word}</div>
                            <div style={ADMIN_VALUE}>
                              {t.shipping_word}: {it.shipping_method} · {it.lang.toUpperCase()} · {it.display_currency}
                              <br />
                              {t.consent_word}: {it.contact_consent ? '✓' : '—'}
                              {it.user_id ? <><br />{t.signed_in_word}</> : null}
                            </div>
                          </div>
                        </div>

                        <div style={ADMIN_LABEL}>{t.build_word}</div>
                        <div style={{ marginBottom: 18 }}>
                          {it.build_items.length === 0 && <div style={ADMIN_VALUE}>—</div>}
                          {it.build_items.map((bi, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '0.5px solid rgba(28,28,26,0.06)' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', minWidth: 90 }}>{bi.category}</span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#1C1C1A', flex: 1 }}>{bi.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1C1C1A' }}>{fmt(Number(bi.price_eur))}</span>
                            </div>
                          ))}
                        </div>

                        <div style={ADMIN_LABEL}>{t.set_status}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(['new', 'contacted', 'converted', 'archived'] as IntentStatus[]).map((s) => {
                            const active = it.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => changeIntentStatus(it.id, s)}
                                style={{
                                  background: active ? '#6E1423' : 'transparent',
                                  color: active ? '#FDFAF4' : '#7A7469',
                                  border: `0.5px solid ${active ? '#6E1423' : 'rgba(28,28,26,0.2)'}`,
                                  borderRadius: 2, padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: 11,
                                  cursor: active ? 'default' : 'pointer',
                                }}
                              >
                                {t.status_labels[s]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'gbb' && (
            <div style={{ padding: isMobile ? '20px 16px' : '36px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: '#1C1C1A', margin: '0 0 4px', letterSpacing: -0.3 }}>{t.gbb_title}</h1>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300 }}>{t.gbb_count(gbbRequests.length, newGbbCount)}</div>
                </div>
                <button
                  onClick={loadGbbRequests}
                  disabled={gbbLoading}
                  style={{ background: 'transparent', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', cursor: gbbLoading ? 'default' : 'pointer' }}
                >
                  {gbbLoading ? t.loading : t.refresh}
                </button>
              </div>

              {gbbError && (
                <div style={{ background: gbbNeedsServiceKey ? 'rgba(196,163,90,0.12)' : '#FFF0EE', border: `0.5px solid ${gbbNeedsServiceKey ? 'rgba(196,163,90,0.5)' : 'rgba(204,51,51,0.25)'}`, borderRadius: 2, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: gbbNeedsServiceKey ? '#8A6D2F' : '#CC3333', marginBottom: 4 }}>
                    {gbbNeedsServiceKey ? t.setup_needed : t.error_word}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: gbbNeedsServiceKey ? '#6B5526' : '#8B2020', lineHeight: 1.6 }}>{gbbError}</div>
                </div>
              )}

              {!gbbError && gbbRequests.length === 0 && !gbbLoading && (
                <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 2, padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#7A7469', fontWeight: 300 }}>{t.gbb_no_requests}</div>
                </div>
              )}

              {gbbRequests.map((r) => {
                const open = expandedGbb === r.id;
                const badge = GBB_STATUS_COLORS[r.status];
                const draft = gbbProposalDraft[r.id] ?? { price: r.price_proposal_eur != null ? String(r.price_proposal_eur) : '', notes: r.proposal_notes };
                const searchTerm = gbbSearchTerm[r.id] ?? '';
                return (
                  <div key={r.id} style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedGbb(open ? null : r.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '14px 14px' : '16px 20px', cursor: 'pointer', flexWrap: 'wrap' }}
                    >
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#1C1C1A' }}>
                            {[r.first_name, r.last_name].filter(Boolean).join(' ') || t.no_name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: badge.bg, color: badge.text, border: `0.5px solid ${badge.border}`, borderRadius: 2, padding: '2px 6px' }}>
                            {t.gbb_status_labels[r.status]}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7A7469', marginTop: 3 }}>{r.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#1C1C1A' }}>{r.budget_eur != null ? fmt(Number(r.budget_eur)) : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#A09890', marginTop: 2 }}>
                          {t.gbb_use_case_labels[r.use_case] ?? r.use_case} · {new Date(r.created_at).toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#A09890', width: 12, textAlign: 'center' }}>{open ? '−' : '+'}</span>
                    </div>

                    {open && (
                      <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.08)', padding: isMobile ? '14px' : '18px 20px', background: '#F8F4EA' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18, marginBottom: 18 }}>
                          <div>
                            <div style={ADMIN_LABEL}>{t.contact_word}</div>
                            <div style={ADMIN_VALUE}>
                              {r.email}
                              {r.phone ? <><br />{r.phone}</> : null}
                            </div>
                          </div>
                          <div>
                            <div style={ADMIN_LABEL}>{t.gbb_budget_word} / {t.gbb_use_case_word}</div>
                            <div style={ADMIN_VALUE}>
                              {r.budget_eur != null ? fmt(Number(r.budget_eur)) : '—'} · {t.gbb_use_case_labels[r.use_case] ?? r.use_case}
                            </div>
                          </div>
                        </div>

                        {r.notes && (
                          <div style={{ marginBottom: 18 }}>
                            <div style={ADMIN_LABEL}>{t.gbb_notes_word}</div>
                            <div style={{ ...ADMIN_VALUE, whiteSpace: 'pre-wrap' }}>{r.notes}</div>
                          </div>
                        )}

                        <div style={{ marginBottom: 18 }}>
                          <div style={ADMIN_LABEL}>{t.gbb_search_helper}</div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            <input
                              value={searchTerm}
                              onChange={(e) => setGbbSearchTerm((s) => ({ ...s, [r.id]: e.target.value }))}
                              placeholder={t.gbb_search_placeholder}
                              style={{ flex: 1, minWidth: 160, padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 13, background: '#FDFAF4', color: '#1C1C1A', fontFamily: 'var(--font-sans)' }}
                            />
                          </div>
                          {searchTerm.trim() && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {marketplaceSearchLinks(searchTerm).map((link) => (
                                <a
                                  key={link.label}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: GBB_GREEN, textDecoration: 'none', border: `0.5px solid ${GBB_GREEN_TINT(0.4)}`, borderRadius: 2, padding: '5px 10px' }}
                                >
                                  {link.label} ↗
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: 12, marginBottom: 12 }}>
                          <div>
                            <div style={ADMIN_LABEL}>{t.gbb_proposal_price}</div>
                            <input
                              type="number"
                              value={draft.price}
                              onChange={(e) => setGbbProposalDraft((d) => ({ ...d, [r.id]: { ...draft, price: e.target.value } }))}
                              style={{ width: '100%', padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 13, background: '#FDFAF4', color: '#1C1C1A', fontFamily: 'var(--font-mono)' }}
                            />
                          </div>
                          <div>
                            <div style={ADMIN_LABEL}>{t.gbb_proposal_notes}</div>
                            <input
                              value={draft.notes}
                              onChange={(e) => setGbbProposalDraft((d) => ({ ...d, [r.id]: { ...draft, notes: e.target.value } }))}
                              style={{ width: '100%', padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 13, background: '#FDFAF4', color: '#1C1C1A', fontFamily: 'var(--font-sans)' }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => saveGbbProposal(r.id)}
                          style={{ background: GBB_GREEN, color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 18 }}
                        >
                          {t.gbb_save_proposal}
                        </button>

                        <div style={ADMIN_LABEL}>{t.set_status}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(['new', 'researching', 'quoted', 'converted', 'archived'] as GbbStatus[]).map((s) => {
                            const active = r.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => changeGbbStatus(r.id, s)}
                                style={{
                                  background: active ? GBB_GREEN : 'transparent',
                                  color: active ? '#FDFAF4' : '#7A7469',
                                  border: `0.5px solid ${active ? GBB_GREEN : 'rgba(28,28,26,0.2)'}`,
                                  borderRadius: 2, padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: 11,
                                  cursor: active ? 'default' : 'pointer',
                                }}
                              >
                                {t.gbb_status_labels[s]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'builds' && (
            <div style={{ padding: isMobile ? '20px 16px' : '36px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: '#1C1C1A', margin: '0 0 4px', letterSpacing: -0.3 }}>{t.pc_builds}</h1>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300 }}>{t.listings(builds.length)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {saveMsg && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#1A6B3A', background: '#EAFAF2', border: '0.5px solid #6DCFA0', borderRadius: 2, padding: '6px 14px' }}>
                      {t.saved_ok}
                    </div>
                  )}
                  <button
                    onClick={openAddBuild}
                    style={{ background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.2, fontFamily: 'var(--font-sans)' }}
                  >
                    {t.add_build}
                  </button>
                </div>
              </div>

              {showForm && (
                <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 2, padding: isMobile ? 16 : 28, marginBottom: 24, borderLeft: '3px solid #6E1423' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#1C1C1A', marginBottom: 22 }}>
                    {editId !== null ? t.edit_build : t.new_build}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <div style={LABEL_STYLE}>{t.name_label}</div>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Apex Predator" style={INPUT_STYLE} />
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.tagline_label}</div>
                      <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Ultimate 4K gaming & creation" style={INPUT_STYLE} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <CompSelect label="GPU" value={form.gpu} options={compDb.gpu || []} placeholder="GPU" t={t} fmt={fmt} onChange={(v) => setForm({ ...form, gpu: v })} />
                    <CompSelect label="CPU" value={form.cpu} options={compDb.cpu || []} placeholder="CPU" t={t} fmt={fmt} onChange={(v) => setForm({ ...form, cpu: v })} />
                    <CompSelect label="RAM" value={form.ram} options={compDb.ram || []} placeholder="RAM" t={t} fmt={fmt} onChange={(v) => setForm({ ...form, ram: v })} />
                    <CompSelect label={t.storage_label} value={form.storage} options={compDb.storage || []} placeholder={catLabels.storage} t={t} fmt={fmt} onChange={(v) => setForm({ ...form, storage: v })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <CompSelect label={t.mobo_label} value={form.mobo} options={compDb.mobo || []} placeholder={catLabels.mobo} t={t} fmt={fmt} onChange={(v) => setForm({ ...form, mobo: v })} />
                    <CompSelect label={t.cooler_label} value={form.cooler} options={compDb.cooler || []} placeholder={catLabels.cooler} t={t} fmt={fmt} onChange={(v) => setForm({ ...form, cooler: v })} />
                    <CompSelect label="PSU" value={form.psu} options={compDb.psu || []} placeholder="PSU" t={t} fmt={fmt} onChange={(v) => setForm({ ...form, psu: v })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
                    <div>
                      <div style={LABEL_STYLE}>{t.category_label}</div>
                      <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value as Build['cat'] })} style={INPUT_STYLE}>
                        <option value="flagship">{t.cat_flagship}</option>
                        <option value="performance">{t.cat_performance}</option>
                        <option value="midrange">{t.cat_midrange}</option>
                        <option value="entry">{t.cat_entry}</option>
                      </select>
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.tier_label}</div>
                      <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })} style={INPUT_STYLE}>
                        {(['S', 'A', 'B', 'C', 'D'] as Tier[]).map((tk) => (
                          <option key={tk} value={tk}>{t[`tier_${tk.toLowerCase()}` as keyof Translations] as string}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.price_eur_label}</div>
                      <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="4299" style={INPUT_STYLE} />
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.rating_label}</div>
                      <input type="number" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="4.9" min={0} max={5} step={0.1} style={INPUT_STYLE} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 18 }}>
                    <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#7A7469', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {t.cancel}
                    </button>
                    <button onClick={saveBuild} style={{ background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '9px 26px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {t.save_build}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ minWidth: isMobile ? 700 : undefined }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px 90px 54px 104px 88px 108px', padding: '11px 20px', background: '#EDE7DC', borderBottom: '0.5px solid rgba(28,28,26,0.1)', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.col_build}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>GPU / CPU</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.col_price}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.tier_label}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.col_rating}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A7469', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.col_status}</div>
                      <div />
                    </div>
                    {builds.map((b) => {
                      const tc = tierBadge(b.tier, BUILD_TIER_COLORS);
                      const visible = b.visible !== false;
                      const visibleColor = visible ? '#1A7040' : '#9090A0';
                      return (
                        <div
                          key={b.id}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 210px 90px 54px 104px 88px 108px', padding: '14px 20px', borderBottom: '0.5px solid rgba(28,28,26,0.07)', alignItems: 'center', gap: 12, background: visible ? '#FDFAF4' : 'rgba(240,235,225,0.6)' }}
                        >
                          <div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#1C1C1A', marginBottom: 2 }}>{b.name}</div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', lineHeight: 1.4, fontWeight: 300 }}>{b.tagline}</div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7A7469', lineHeight: 1.8 }}>
                            {b.gpu}<br />{b.cpu}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: '#1C1C1A' }}>{fmt(b.price)}</div>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: tc.bg, border: `1.5px solid ${tc.border}`, borderRadius: 4 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: tc.text }}>{b.tier}</span>
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1C1C1A' }}>{typeof b.rating === 'number' ? b.rating.toFixed(1) : b.rating} / 5</div>
                          <div>
                            <button
                              onClick={() => toggleVisible(b.id)}
                              style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: visibleColor, background: 'transparent', border: `0.5px solid ${visibleColor}`, borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}
                            >
                              {visible ? t.live : t.hidden}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => openEditBuild(b.id)} style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: '#6E1423', background: 'transparent', border: '0.5px solid rgba(110,20,35,0.4)', borderRadius: 2, padding: '5px 12px', cursor: 'pointer' }}>
                              {t.edit}
                            </button>
                            <button onClick={() => deleteBuild(b.id)} style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: '#CC3333', background: 'transparent', border: '0.5px solid rgba(204,51,51,0.35)', borderRadius: 2, padding: '5px 12px', cursor: 'pointer' }}>
                              {t.del}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'customerGomps' && (
            <div style={{ padding: isMobile ? '20px 16px' : '36px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: '#1C1C1A', margin: '0 0 4px', letterSpacing: -0.3 }}>{t.customer_gomps_title}</h1>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300 }}>{t.cg_listed(customerGomps.length)}</div>
                </div>
                <button
                  onClick={openAddCg}
                  style={{ background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.2, fontFamily: 'var(--font-sans)' }}
                >
                  {t.add_customer_gomp}
                </button>
              </div>

              {showCgForm && (
                <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 2, padding: isMobile ? 16 : 28, marginBottom: 24, borderLeft: '3px solid #6E1423' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#1C1C1A', marginBottom: 22 }}>
                    {cgEditId !== null ? t.edit : t.add_customer_gomp}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <div style={LABEL_STYLE}>{t.cg_title_label}</div>
                      <input value={cgForm.title} onChange={(e) => setCgForm({ ...cgForm, title: e.target.value })} placeholder="The Weekend Warrior" style={INPUT_STYLE} />
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.cg_customer_label}</div>
                      <input
                        value={cgForm.customerLabel}
                        onChange={(e) => setCgForm({ ...cgForm, customerLabel: e.target.value })}
                        placeholder={t.cg_customer_placeholder}
                        style={INPUT_STYLE}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={LABEL_STYLE}>{t.cg_specs_label}</div>
                    <textarea
                      value={cgForm.specs}
                      onChange={(e) => setCgForm({ ...cgForm, specs: e.target.value })}
                      placeholder="RTX 5090 · Ryzen 9 9950X3D · 64GB DDR5-6400 · 2TB NVMe"
                      rows={3}
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                    />
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', marginTop: 5 }}>{t.cg_specs_help}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: 14, marginBottom: 18 }}>
                    <div>
                      <div style={LABEL_STYLE}>{t.cg_price_label}</div>
                      <input type="number" value={cgForm.priceEur} onChange={(e) => setCgForm({ ...cgForm, priceEur: e.target.value })} placeholder="1999" style={INPUT_STYLE} />
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.cg_built_on_label}</div>
                      <input type="date" value={cgForm.builtOn} onChange={(e) => setCgForm({ ...cgForm, builtOn: e.target.value })} style={INPUT_STYLE} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <div style={LABEL_STYLE}>{t.image_label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 64, height: 64, borderRadius: 2, flexShrink: 0,
                          border: '0.5px solid rgba(28,28,26,0.15)',
                          background: cgForm.imageUrl
                            ? 'repeating-conic-gradient(#e8e2d4 0% 25%, #FDFAF4 0% 50%) 0 0 / 12px 12px'
                            : '#FDFAF4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}
                      >
                        {cgForm.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cgForm.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: '#A09890' }}>—</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label
                          style={{
                            fontFamily: 'var(--font-sans)', fontSize: 11, color: '#6E1423', cursor: 'pointer',
                            border: '0.5px solid rgba(110,20,35,0.35)', borderRadius: 2, padding: '5px 10px', width: 'fit-content',
                          }}
                        >
                          {cgForm.imageUrl ? t.image_replace : t.image_label}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) handleCgImageUpload(file);
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {cgImageStatus === 'uploading' && (
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469' }}>{t.image_uploading}</span>
                        )}
                        {cgImageStatus === 'error' && (
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#CC3333' }}>{cgImageError}</span>
                        )}
                        {cgForm.imageUrl && cgImageStatus === 'idle' && (
                          <button
                            onClick={() => setCgForm((f) => ({ ...f, imageUrl: '' }))}
                            style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                          >
                            {t.image_remove}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 18 }}>
                    <button onClick={cancelEditCg} style={{ background: 'transparent', color: '#7A7469', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {t.cancel}
                    </button>
                    <button onClick={saveCg} style={{ background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '9px 26px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {t.save_build}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {customerGomps.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: b.isLive ? '#FDFAF4' : 'rgba(240,235,225,0.6)',
                      border: '0.5px solid rgba(28,28,26,0.12)', borderRadius: 2, padding: 16,
                      display: 'flex', gap: 14, opacity: b.isLive ? 1 : 0.65,
                    }}
                  >
                    <div
                      style={{
                        width: 72, height: 72, borderRadius: 2, flexShrink: 0,
                        border: '0.5px solid rgba(28,28,26,0.12)',
                        background: b.imageUrl ? 'repeating-conic-gradient(#e8e2d4 0% 25%, #FDFAF4 0% 50%) 0 0 / 12px 12px' : '#F5F0E6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      {b.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: '#A09890' }}>—</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#1C1C1A', marginBottom: 2 }}>{b.title}</div>
                      {b.customerLabel && (
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', marginBottom: 4 }}>{b.customerLabel}</div>
                      )}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#7A7469', lineHeight: 1.6, marginBottom: 8 }}>
                        {b.specs}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => toggleCgLive(b)}
                          style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: b.isLive ? '#1A7040' : '#9090A0', background: 'transparent', border: `0.5px solid ${b.isLive ? '#1A7040' : '#9090A0'}`, borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}
                        >
                          {b.isLive ? t.live : t.hidden}
                        </button>
                        <button onClick={() => openEditCg(b.id)} style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: '#6E1423', background: 'transparent', border: '0.5px solid rgba(110,20,35,0.4)', borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}>
                          {t.edit}
                        </button>
                        <button onClick={() => deleteCg(b.id)} style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: '#CC3333', background: 'transparent', border: '0.5px solid rgba(204,51,51,0.35)', borderRadius: 2, padding: '4px 10px', cursor: 'pointer' }}>
                          {t.del}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'components' && (
            <div style={{ padding: isMobile ? '20px 16px' : '36px 44px' }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: '#1C1C1A', margin: '0 0 4px', letterSpacing: -0.3 }}>{t.components_db}</h1>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300 }}>{t.components_db_desc}</div>
              </div>

              <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 0, border: '0.5px solid rgba(28,28,26,0.14)', borderRadius: 2, overflow: 'hidden', width: 'fit-content' }}>
                  {CATEGORY_TAB_ORDER.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCompCat(cat)}
                      style={{
                        padding: '9px 16px', background: cat === compCat ? '#6E1423' : 'transparent', color: cat === compCat ? '#F5F0E6' : '#7A7469',
                        border: 'none', borderRight: '0.5px solid rgba(28,28,26,0.1)', fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {catLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 2, padding: isMobile ? '16px' : '20px 22px', marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#1C1C1A', marginBottom: 5 }}>{t.margin_title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', fontWeight: 300, lineHeight: 1.6, marginBottom: 14, maxWidth: 640 }}>{t.margin_desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                    <button
                      onClick={() => updateMargin({ type: 'eur' })}
                      style={{ padding: '8px 14px', background: margin.type === 'eur' ? '#6E1423' : 'transparent', color: margin.type === 'eur' ? '#FDFAF4' : '#7A7469', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    >
                      {t.margin_eur}
                    </button>
                    <button
                      onClick={() => updateMargin({ type: 'pct' })}
                      style={{ padding: '8px 14px', background: margin.type === 'pct' ? '#6E1423' : 'transparent', color: margin.type === 'pct' ? '#FDFAF4' : '#7A7469', border: 'none', borderLeft: '0.5px solid rgba(28,28,26,0.15)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    >
                      {t.margin_pct}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={marginValueInput}
                    onChange={(e) => setMarginValueInput(e.target.value)}
                    onBlur={() => updateMargin({ value: parseFloat(marginValueInput) || 0 })}
                    onKeyDown={(e) => { if (e.key === 'Enter') updateMargin({ value: parseFloat(marginValueInput) || 0 }); }}
                    style={{ width: 100, padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 13, background: '#F5F0E6', color: '#1C1C1A', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {(compDb[compCat] || []).map((comp) => {
                  const tc = tierBadge(comp.tier, TIER_COLORS);
                  const isEditing = comp.id === editCompId;
                  const isLive = comp.isLive !== false;
                  // Shown live for every component, not just ones with a market price already
                  // on file — treating the current price as the base/cost when there's no
                  // market price yet, so the markup is always visible instead of only appearing
                  // once someone has manually typed a market price in.
                  const basePrice = comp.marketPrice ?? comp.price;
                  const effectiveMargin = comp.marginOverride ?? margin;
                  const webPrice = computePrice(basePrice, effectiveMargin) ?? comp.price;
                  return (
                    <div
                      key={comp.id}
                      style={{
                        background: isEditing ? 'rgba(110,20,35,0.05)' : isLive ? '#FDFAF4' : 'rgba(240,235,225,0.6)',
                        border: `0.5px solid ${isEditing ? 'rgba(110,20,35,0.3)' : 'rgba(28,28,26,0.12)'}`,
                        borderRadius: 2, padding: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                        opacity: isLive ? 1 : 0.7,
                      }}
                    >
                      {comp.imageUrl && (
                        <div
                          style={{
                            width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                            background: 'repeating-conic-gradient(#e8e2d4 0% 25%, #FDFAF4 0% 50%) 0 0 / 10px 10px',
                            border: '0.5px solid rgba(28,28,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={comp.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#1C1C1A', lineHeight: 1.35 }}>{comp.name}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: tc.bg, border: `1.5px solid ${tc.border}`, borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: tc.text }}>
                            {comp.tier}
                          </div>
                          {compCat === 'case' && comp.category && (
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#6E1423', background: 'rgba(110,20,35,0.08)', border: '0.5px solid rgba(110,20,35,0.2)', borderRadius: 2, padding: '1px 7px', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
                              {comp.category}
                            </div>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7A7469', marginBottom: 9, lineHeight: 1.6 }}>{comp.specs}</div>
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A09890' }}>{t.original_price_label}: €{basePrice}</span>
                            {comp.marginOverride && (
                              <span
                                style={{
                                  fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 600, color: '#6E1423',
                                  background: 'rgba(110,20,35,0.08)', border: '0.5px solid rgba(110,20,35,0.2)',
                                  borderRadius: 2, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: 0.4,
                                }}
                              >
                                {t.margin_override_badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: '#6E1423' }}>{t.web_price_label}: {fmt(webPrice)}</div>
                          {comp.marketPrice == null && (
                            <button
                              onClick={() => applyMarginTo(compCat, comp)}
                              style={{
                                fontFamily: 'var(--font-sans)', fontSize: 10, color: '#6E1423', background: 'transparent',
                                border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 2,
                              }}
                            >
                              {t.apply_margin}
                            </button>
                          )}
                        </div>
                        {comp.passmark != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tc.text, fontWeight: 600 }}>PassMark {comp.passmark.toLocaleString()}</span>
                            <a href={comp.passmarkUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#6E1423', textDecoration: 'none', fontWeight: 500 }}>
                              Verify ↗
                            </a>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                        <button onClick={(e) => openEditComp(compCat, comp.id, e.currentTarget.getBoundingClientRect())} style={{ fontFamily: 'var(--font-sans)', color: '#6E1423', background: 'transparent', border: '0.5px solid rgba(110,20,35,0.35)', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                          {t.edit}
                        </button>
                        <button onClick={() => deleteComponent(compCat, comp.id)} style={{ fontFamily: 'var(--font-sans)', color: '#CC3333', background: 'transparent', border: '0.5px solid rgba(204,51,51,0.3)', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                          ✕
                        </button>
                        <button
                          onClick={() => toggleComponentLive(compCat, comp)}
                          style={{
                            fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer', borderRadius: 2, padding: '4px 8px',
                            background: 'transparent', color: isLive ? '#1A7040' : '#9090A0',
                            border: `0.5px solid ${isLive ? 'rgba(26,112,64,0.35)' : 'rgba(144,144,160,0.4)'}`,
                          }}
                        >
                          {isLive ? t.live : t.hidden}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                // Same form fields either way — only the surrounding container differs. Add mode
                // (editCompId null) keeps the original inline placement below the grid; Edit mode
                // floats the identical content next to whichever row's Edit button was clicked
                // (see openEditComp), so extracting this into one shared `formInner` avoids ever
                // letting the two renderings drift apart into subtly different forms.
                const formInner = (
                  <>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: '#1C1C1A', marginBottom: 18 }}>
                  {editCompId ? t.edit_prefix + catLabels[compCat] : t.add_prefix + catLabels[compCat] + ' →'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 120px', gap: 12, marginBottom: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={LABEL_STYLE}>{t.name_label}</div>
                    <input
                      value={compForm.name}
                      onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                      onFocus={() => setNameDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setNameDropdownOpen(false), 150)}
                      placeholder="Component name..."
                      autoComplete="off"
                      style={INPUT_STYLE}
                    />
                    {nameDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, boxShadow: '0 6px 18px rgba(28,28,26,0.15)', maxHeight: 260, overflowY: 'auto' }}>
                        {suggestionsToShow.map((s) => (
                          <div
                            key={s.name}
                            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s.effective); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(28,28,26,0.06)', background: s.already ? 'rgba(28,28,26,0.04)' : '#FDFAF4' }}
                          >
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: s.already ? '#A09890' : '#1C1C1A' }}>{s.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              {s.effective.passmark != null && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7A7469' }}>{s.effective.passmark.toLocaleString()}</span>
                              )}
                              {s.already && (
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: '#A09890', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.already_added}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {noSuggestions && (
                          <div style={{ padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890' }}>{t.no_suggestions}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={LABEL_STYLE}>{t.price_eur_short}</div>
                    <input
                      type="number"
                      value={compForm.price}
                      onChange={(e) => setCompForm({ ...compForm, price: e.target.value })}
                      disabled={hasManualMarketPrice}
                      placeholder="499"
                      style={INPUT_STYLE}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL_STYLE}>{t.image_label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 64, height: 64, borderRadius: 2, flexShrink: 0,
                        border: '0.5px solid rgba(28,28,26,0.15)',
                        background: compForm.imageUrl
                          ? 'repeating-conic-gradient(#e8e2d4 0% 25%, #FDFAF4 0% 50%) 0 0 / 12px 12px'
                          : '#FDFAF4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      {compForm.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={compForm.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: '#A09890' }}>—</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label
                        style={{
                          fontFamily: 'var(--font-sans)', fontSize: 11, color: '#6E1423', cursor: 'pointer',
                          border: '0.5px solid rgba(110,20,35,0.35)', borderRadius: 2, padding: '5px 10px', width: 'fit-content',
                        }}
                      >
                        {compForm.imageUrl ? t.image_replace : t.image_label}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) handleImageUpload(file);
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {imageStatus === 'uploading' && (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469' }}>{t.image_uploading}</span>
                      )}
                      {imageStatus === 'error' && (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#CC3333' }}>{imageError}</span>
                      )}
                      {compForm.imageUrl && imageStatus === 'idle' && (
                        <button
                          onClick={() => setCompForm((f) => ({ ...f, imageUrl: '' }))}
                          style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                        >
                          {t.image_remove}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL_STYLE}>{t.market_price_label}</div>
                  <input
                    type="number"
                    value={compForm.marketPrice}
                    onChange={(e) => setCompForm({ ...compForm, marketPrice: e.target.value })}
                    placeholder={t.market_price_placeholder}
                    style={INPUT_STYLE}
                  />
                  {hasManualMarketPrice && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6E1423', marginTop: 6 }}>{priceAutoNote}</div>
                  )}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={LABEL_STYLE}>{t.margin_override_label}</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={compForm.marginOverrideOn}
                        onChange={(e) => setCompForm({ ...compForm, marginOverrideOn: e.target.checked })}
                      />
                      {compForm.marginOverrideOn ? t.margin_override_use_global : t.margin_override_label}
                    </label>
                  </div>
                  {compForm.marginOverrideOn && (
                    <>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', fontWeight: 300, lineHeight: 1.5, marginBottom: 8 }}>{t.margin_override_desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                          <button
                            onClick={() => setCompForm({ ...compForm, marginOverrideType: 'eur' })}
                            style={{ padding: '8px 14px', background: compForm.marginOverrideType === 'eur' ? '#6E1423' : 'transparent', color: compForm.marginOverrideType === 'eur' ? '#FDFAF4' : '#7A7469', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                          >
                            {t.margin_eur}
                          </button>
                          <button
                            onClick={() => setCompForm({ ...compForm, marginOverrideType: 'pct' })}
                            style={{ padding: '8px 14px', background: compForm.marginOverrideType === 'pct' ? '#6E1423' : 'transparent', color: compForm.marginOverrideType === 'pct' ? '#FDFAF4' : '#7A7469', border: 'none', borderLeft: '0.5px solid rgba(28,28,26,0.15)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                          >
                            {t.margin_pct}
                          </button>
                        </div>
                        <input
                          type="number"
                          value={compForm.marginOverrideValue}
                          onChange={(e) => setCompForm({ ...compForm, marginOverrideValue: e.target.value })}
                          style={{ width: 100, padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 13, background: '#F5F0E6', color: '#1C1C1A', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 140px', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={LABEL_STYLE}>{t.specs_notes}</div>
                    <input
                      value={compForm.specs}
                      onChange={(e) => setCompForm({ ...compForm, specs: e.target.value })}
                      placeholder="24GB GDDR7, PCIe 5.0, 575W TGP..."
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <div style={LABEL_STYLE}>{t.tier_rating}</div>
                    <select value={compForm.tier} onChange={(e) => setCompForm({ ...compForm, tier: e.target.value as Tier })} style={INPUT_STYLE}>
                      {(['S', 'A', 'B', 'C', 'D'] as Tier[]).map((tk) => (
                        <option key={tk} value={tk}>{t[`tier_${tk.toLowerCase()}` as keyof Translations] as string}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {compCat === 'case' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={LABEL_STYLE}>{t.tower_category}</div>
                    <select value={compForm.category} onChange={(e) => setCompForm({ ...compForm, category: e.target.value })} style={INPUT_STYLE}>
                      {CASE_CATS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#B0A898', marginTop: 6, lineHeight: 1.6 }}>{t.tower_category_help}</div>
                  </div>
                )}
                {compCat === 'ram' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={LABEL_STYLE}>{t.ram_generation}</div>
                      <select
                        value={compForm.ramGeneration}
                        onChange={(e) => setCompForm({ ...compForm, ramGeneration: e.target.value as '' | '4' | '5' })}
                        style={INPUT_STYLE}
                      >
                        <option value="">—</option>
                        <option value="4">DDR4</option>
                        <option value="5">DDR5</option>
                      </select>
                    </div>
                    <div>
                      <div style={LABEL_STYLE}>{t.ram_speed_mhz}</div>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={compForm.ramSpeedMhz}
                        onChange={(e) => setCompForm({ ...compForm, ramSpeedMhz: e.target.value })}
                        placeholder="6400"
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1', fontFamily: 'var(--font-sans)', fontSize: 11, color: '#B0A898', lineHeight: 1.6 }}>
                      {t.ram_generation_help}
                    </div>
                  </div>
                )}
                {compCat === 'fan' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={LABEL_STYLE}>{t.fan_size_mm}</div>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={compForm.fanSizeMm}
                      onChange={(e) => setCompForm({ ...compForm, fanSizeMm: e.target.value })}
                      placeholder="120"
                      style={INPUT_STYLE}
                    />
                  </div>
                )}
                {editingCase && editingCase.fanMounts && editingCase.fanMounts.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={LABEL_STYLE}>{t.preinstalled_fans}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', fontWeight: 300, lineHeight: 1.5, marginBottom: 10 }}>
                      {t.preinstalled_fans_help}
                    </div>
                    {editingCase.fanMounts.map((mount) => {
                      const pre = compForm.fanPreinstalled[mount.position] ?? { fanName: '', count: '0' };
                      const matchingFans = (compDb.fan || []).filter((f) => f.fanSizeMm != null && mount.sizesMm.includes(f.fanSizeMm));
                      return (
                        <div key={mount.position} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '90px 1fr 70px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#1C1C1A', textTransform: 'capitalize' }}>{mount.position}</div>
                          <select
                            value={pre.fanName}
                            onChange={(e) =>
                              setCompForm({ ...compForm, fanPreinstalled: { ...compForm.fanPreinstalled, [mount.position]: { ...pre, fanName: e.target.value } } })
                            }
                            style={INPUT_STYLE}
                          >
                            <option value="">{t.fan_none}</option>
                            {matchingFans.map((f) => (
                              <option key={f.id} value={f.name}>{f.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            max={mount.maxCount}
                            value={pre.count}
                            onChange={(e) =>
                              setCompForm({ ...compForm, fanPreinstalled: { ...compForm.fanPreinstalled, [mount.position]: { ...pre, count: e.target.value } } })
                            }
                            style={INPUT_STYLE}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    onClick={editCompId ? updateComponent : addComponent}
                    style={{ background: '#6E1423', color: '#FDFAF4', border: 'none', borderRadius: 2, padding: '10px 24px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {editCompId ? t.update_arrow : t.add_prefix + catLabels[compCat] + ' →'}
                  </button>
                  {editCompId && (
                    <button onClick={cancelEditComp} style={{ background: 'transparent', color: '#7A7469', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      {t.cancel}
                    </button>
                  )}
                </div>
                  </>
                );
                if (editCompId && editAnchor) {
                  return (
                    <>
                      <div onClick={cancelEditComp} style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,26,0.35)', zIndex: 50 }} />
                      <div
                        style={{
                          position: 'fixed', top: editAnchor.top, left: editAnchor.left,
                          width: isMobile ? 'calc(100vw - 32px)' : 440, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
                          background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.2)', borderLeft: '3px solid #6E1423',
                          borderRadius: 4, padding: isMobile ? 16 : 26, boxShadow: '0 16px 48px rgba(28,28,26,0.3)', zIndex: 51,
                        }}
                      >
                        {formInner}
                      </div>
                    </>
                  );
                }
                return (
                  <div style={{ background: '#FDFAF4', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 2, padding: isMobile ? 16 : 26, borderLeft: '3px solid #6E1423' }}>
                    {formInner}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
