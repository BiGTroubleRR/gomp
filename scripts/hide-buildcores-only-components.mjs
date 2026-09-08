// One-off: flip `is_live = false` on every component row that exists ONLY because of a
// BuildCores OpenDB variant-mining script (scripts/import-ram-variants.mjs,
// import-storage-variants.mjs, import-psu-variants.mjs, import-cooler-variants.mjs,
// add-aio-radiator-sizes.mjs, import-case-variants.mjs) — RAM/storage/PSU/cooler were never
// scraped from eD system at all, and roughly half of `case` wasn't either. The exact name lists
// below were pulled directly from the live `components` table by clustering `created_at` into one
// batch date per import run and, for `case`, excluding the 13 real eD system cases from
// scripts/import-edsystem-cases.mjs by name. None of these rows are referenced by any live
// prebuilt_pcs/customer_builds row (checked directly against the live DB before writing this).
//
// This hides rather than deletes: src/app/build/page.tsx already filters `isLive !== false` out
// of the customer-facing configurator, and Admin's Komponenty tab already has a Live/Hidden toggle
// that respects this same flag — so flipping it fully removes customer exposure while keeping the
// rows around to cross-reference once real eD system replacements exist for these categories.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TO_HIDE = {
  storage: [
    'PNY CS2140 2TB SSD M.2-2280 PCIe 4.0 x4 NVMe',
    'ADATA LEGEND 970 2TB SSD M.2-2280 PCIe 5.0 X4 NVMe',
    'TEAMGROUP Cardea A440 2TB M.2-2280 SSD PCIe 4.0 X4 NVMe',
    'Mushkin Vortex Redline 2TB SSD M.2 PCIe 4.0 NVMe',
    'FFF Smart Life Connected G-Storategy NV470 w/Heatsink 2TB SSD M.2-2280 PCIe 4.0 X4 NVMe',
  ],
  psu: [
    'PowerSpec PSX Black 850W Fully Modular 80+ Gold Certified',
    'Rosewill SMG850 Black ATX 850W Fully Modular 80+ Gold Certified',
    'NZXT C850 (2024) Black 850W Fully Modular 80+ Gold Certified',
    'be quiet! Straight Power 11 Black 850W Fully Modular 80+ Platinum Certified',
    'Zalman TeraMax II ATX 1200W Fully Modular 80+ Gold Certified',
    'EVGA SuperNOVA 1200 P3 1200W 80+ Platinum Certified Fully Modular',
    'Seasonic PRIME Gold 1200W Fully Modular 80+ Gold',
    'FSP Group Hydro White 1200W 80+ Platinum Fully Modular',
    'Rosewill PHOTON-1200 1200W Fully Modular 80+ Gold Certified ATX',
    'SeaSonic ATX3-FOCUS-GX White 850W Fully Modular 80+ Gold',
  ],
  cooler: [
    'Deepcool ICE BLADE PRO V2.0 Air 161mm 60.29 CFM',
    'Jonsbo CR-3000 Standard 59.48 CFM Air 160mm Black / Silver',
    'Alpenföhn Brocken 2 Air 165mm 64.15 CFM',
    'Cooler Master Hyper 212 LED Air 160mm 66.3 CFM Rifle Bearing',
    'Iceberg Thermal IceSLEET G6 Stealth 85 CFM Air 160mm Black / Blue',
    'Thermalright Frozen Warframe PRO Water 360mm Black',
    'Lian Li Hydroshift II LCD-C CL 72 CFM Water 360mm Black',
    'Antec Skeleton 360 ARGB White',
    'ASUS ROG RYUO IV 360 ARGB White',
    'Thermaltake MAGFloe 360 Ultra ARGB Sync 57.11 CFM Water 360mm Black',
    'Fractal Design Kelvin T12 Water 120mm 62.4 CFM',
    'Alphacool Eisbaer Aurora Water 240mm 61.5 CFM Black',
    'Gelid Solutions Liquid 240 Water 240mm Black',
    'MSI MAG CORELIQUID C240 Water 240mm EVA e-PROJECT Black',
    'Deepcool CAPTAIN Water 240mm 91.12 CFM',
    'Thermaltake TH240 V2 ARGB Black',
    'Deepcool LE320 Water 120mm 85.85 CFM White',
    'Cooler Master MasterLiquid ML120L RGB Water 120mm 66.7 CFM',
    'Corsair H60 (2018) Water 120mm 57.2 CFM Black',
    'Enermax Liqmax III Water 120mm HF 90.1 CFM Black',
  ],
  ram: [
    'TEAMGROUP T-Force Vulcan Black DDR5-5600 CL32 16GB (1x16GB)',
    'Kingston FURY Beast RGB Black DDR5-5600 CL36 16GB (1x16GB)',
    'G.Skill Flare X5 Black DDR5-5600 CL36 16GB (1x16GB)',
    'Corsair Dominator Platinum RGB White DDR5-5200 CL38 32GB (2x16GB)',
    'ADATA XPG LANCER RGB Black 32GB (1x32GB) DDR5 6000 CL30',
    'Patriot Viper Venom RGB Black / White DDR5-6000 CL30 32GB (1x32GB)',
    'TEAMGROUP T-Force Delta RGB Black DDR5-6000 CL38 32GB (1x32GB)',
    'Kingston FURY Beast Black DDR5-6000 CL30 32GB (1x32GB)',
    'G.SKILL Aegis 5 DDR5-6000 32GB (1x32GB) CL36',
    'Adata DDR5-5600 U-DIMM 32GB (1x32GB) CL46 Black',
    'Patriot Viper Venom Black / White DDR5-5600 CL36 32GB (1x32GB)',
    'Crucial CT32G56C46U5 Black DDR5-5600 CL46 32GB (1x32GB)',
    'Kingston FURY Beast RGB DDR5-5600 CL36 32GB (1x32GB)',
    'Adata DDR5-5600 U-DIMM 8GB (1x8 GB) CL46 Black',
    'Corsair Vengeance Black DDR5-5200 CL40 16GB (1x16GB)',
    'Kingston FURY Beast RGB Black DDR5-5200 CL36 16GB (1x16GB)',
    'ADATA XPG Lancer Blade RGB Black DDR5-6000 CL30 16GB (1x16GB)',
    'G.Skill Trident Z5 RGB Metallic Silver DDR5-5200 CL40 32GB (2x16GB)',
    'Corsair Vengeance Black DDR5-5600 CL40 32GB (1x32GB)',
    'G.SKILL Aegis 5 DDR5-5600 32GB (1x32GB) CL36',
    'Patriot Viper Venom Black / Silver DDR5-6000 CL36 16GB (2x8GB)',
    'TEAMGROUP T-Force Delta RGB Black DDR5-6000 CL38 16GB (2x8GB)',
    'Kingston FURY Beast RGB Black DDR5-6000 CL40 16GB (2x8GB)',
    'ADATA XPG Lancer Blade Black DDR5-5600 CL46 16GB (2x8GB)',
    'Patriot Viper Venom Black / White DDR5-5600 CL40 16GB (2x8GB)',
    'Crucial Classic Black DDR5-5600 CL46 16GB (2x8GB)',
    'TEAMGROUP T-Force Delta RGB Black DDR5-5600 CL40 16GB (2x8GB)',
    'Kingston FURY Beast RGB Black DDR5-5600 CL36 16GB (2x8GB)',
    'ADATA XPG LANCER NEON RGB DDR5-6400 16 (1x16GB) CL 32 Silver Grey',
    'TEAMGROUP T-Force Delta RGB White DDR5-6400 CL32 16GB (1x16GB)',
    'TEAMGROUP T-Force Delta RGB White DDR5-5200 CL40 16GB (1x16GB)',
    'Patriot Viper Elite 5 RGB White DDR5-6000 CL42 16GB (1x16GB)',
    'Patriot Viper Venom RGB Black / White DDR5-5200 CL36 16GB (1x16GB)',
    'Crucial Pro Overclocking White DDR5-6000 CL36 16GB (1x16GB)',
    'TEAMGROUP T-Force Delta RGB Black DDR5-6000 CL38 16GB (1x16GB)',
    'Kingston FURY Beast RGB Black DDR5-6000 CL36 16GB (1x16GB)',
    'G.SKILL Aegis 5 DDR5-6000 16GB (1x16GB) CL36',
    'ADATA XPG Lancer Blade Black DDR5-5600 CL46 16GB (1x16GB)',
    'Kingston FURY Beast Black DDR5-5600 CL40 8GB (1x8GB)',
    'ADATA XPG LANCER RGB Black 16GB (1x16GB) DDR5 5200 CL38',
    'Kingston FURY White DDR5-5200 CL40 32GB (2x16GB)',
    'Kingston FURY Renegade Silver / Black DDR5-6400 CL32 16GB (1x16GB)',
    'TEAMGROUP T-Force Delta RGB Black DDR5-5600 CL40 8GB (1x8GB)',
    'Crucial Classic Black DDR5-5600 CL46 8GB (1x8GB)',
    'Patriot Viper Venom RGB Black / White DDR5-5600 CL36 16GB (1x16GB)',
    'G.Skill Trident Z5 RGB Matte Black DDR5-6000 CL36 32GB (2x16GB)',
    'G.Skill Trident Z5 Neo RGB Matte White DDR5-7200 CL34 32GB (2x16GB)',
    'Corsair Dominator Titanium DDR5-7200 CL34 32GB (2x16GB)',
    'Kingston Fury Renegade RGB Silver / Black DDR5-7200 CL38 32GB (2x16GB)',
    'Patriot Viper Venom RGB Black / White DDR5-7200 CL40 32GB (2x16GB)',
    'ADATA XPG LANCER RGB White 32GB (2x16GB) DDR5 7200 CL34',
    'Patriot Viper Venom Black / White DDR5-6000 CL36 32GB (2x16GB)',
    'Corsair Vengeance RGB Black DDR5-8000 CL36 32GB (2x16GB)',
    'Kingston Fury Renegade RGB DDR5-8000 CL38 32GB (2x16GB)',
    'Patriot Viper Xtreme 5 RGB Black DDR5-8000 CL38 32GB (2x16GB)',
    'ADATA XPG LANCER NEON RGB Black DDR5-8000 CL38 32GB (2x16GB)',
    'G.Skill Trident Z5 Metallic Silver DDR5-5600 CL30 64GB (2x32GB)',
    'Corsair Dominator Platinum RGB Black DDR5-5600 CL40 64GB (2x32GB)',
    'Kingston FURY White DDR5-5600 CL40 64GB (2x32GB)',
    'TEAMGROUP T-Force Vulcanα Black DDR5-5600 CL38 64GB (2x32GB)',
    'Crucial Classic Black DDR5-5600 CL46 64GB (2x32GB)',
    'Patriot Viper Venom RGB Black / White DDR5-5600 CL40 64GB (2x32GB)',
    'G.Skill Trident Z5 RGB Metallic Silver DDR5-6000 CL30 64GB (2x32GB)',
    'Corsair Vengeance Gray DDR5-6000 CL40 64GB (2x32GB)',
    'Kingston FURY Renegade White / Silver DDR5-6000 CL32 64GB (2x32GB)',
    'G.Skill Trident Z5 Royal Neo RGB Silver DDR5-8000 CL38 32GB (2x16GB)',
    'Crucial CT2K16G52C42U5 Black DDR5-5200 CL42 32GB (2x16GB)',
    'ADATA XPG LANCER RGB Black 32GB (2x16GB) DDR5 5200 CL38',
    'G.Skill Trident Z5 Metallic Silver DDR5-5600 CL36 32GB (2x16GB)',
    'Corsair Vengeance Black DDR5-5600 CL36 32GB (2x16GB)',
    'Kingston FURY Beast RGB DDR5-5600 CL36 32GB (2x16GB)',
    'TEAMGROUP T-Force Delta RGB DDR5-5600 CL40 32GB (2x16GB)',
    'Crucial Pro Black DDR5-5600 CL46 32GB (2x16GB)',
    'Patriot Viper Venom Black / White DDR5-5600 CL36 32GB (2x16GB)',
    'ADATA XPG LANCER RGB Black 32GB (2x16GB) DDR5 5600 CL36',
    'ADATA XPG LANCER RGB DDR5-6000 32GB (2x16GB) CL30 Black',
    'Corsair Dominator Platinum RGB Gray / Black DDR5-6000 CL30 32GB (2x16GB)',
    'Kingston FURY Beast RGB Black DDR5-6000 CL30 32GB (2x16GB)',
    'TEAMGROUP T-Force Vulcan Eco Silver DDR5-6000 CL30 32GB (2x16GB)',
    'Crucial Pro Overclocking 32GB (2x16GB) DDR5 6000 CL36 Black',
    'G.Skill Trident Z Black DDR5-6400 CL32 32GB (2x16GB)',
    'Corsair Vengeance Grey DDR5-6400 CL32 32GB (2x16GB)',
    'Kingston FURY Beast RGB White DDR5-6400 CL32 32GB (2x16GB)',
    'TEAMGROUP T-Force Delta RGB White DDR5-6400 CL32 32GB (2x16GB)',
    'Crucial Pro 32GB (2x16GB) DDR5 6400 CL38 Black',
    'Patriot Viper Venom RGB Black / White DDR5-6400 CL40 32GB (2x16GB)',
    'ADATA XPG LANCER RGB DDR5-6400 32GB (2x16GB) CL32 White',
    'G.Skill Trident Z5 RGB Matte Black DDR5-6800 CL34 32GB (2x16GB)',
    'Corsair Vengeance Black DDR5-6800 CL40 32GB (2x16GB)',
    'Kingston FURY Renegade White / Silver DDR5-6800 CL36 32GB (2x16GB)',
    'TEAMGROUP T-Force Delta RGB Black / Silver DDR5-6800 CL34 32GB (2x16GB)',
    'Patriot Viper Venom Black / White DDR5-6800 CL34 32GB (2x16GB)',
    'ADATA XPG LANCER RGB White DDR5-6800 CL34 32GB (2x16GB)',
    'ADATA XPG Lancer Blade 64GB (2x32GB) DDR5-6000 CL30 Black',
    'Corsair Dominator Titanium White DDR5-6400 CL32 64GB (2x32GB)',
    'G.Skill Trident Z5 RGB Metallic Silver DDR5-6400 CL32 64GB (2x32GB)',
    'Patriot Viper Venom Black / White DDR5-6400 CL32 64GB (2x32GB)',
    'ADATA XPG Lancer RGB DDR5-6400 64 (2x32GB) CL32 Black',
    'Crucial Pro Black DDR5-6000 CL40 64GB (2x32GB)',
    'Patriot Viper Elite 5 Ultra RGB Black DDR5-6000 CL28 64GB (2x32GB)',
    'Crucial Crucial Pro Overclocking DDR5-6400 64GB (2x32GB) CL40 White',
    'TEAMGROUP T-FORCE XTREEM DDR5-6400 64GB (2x32GB) CL32 White',
    'Kingston FURY Beast RGB DDR5-6400 CL32 64GB (2x32GB)',
  ],
  case: [
    'Phanteks NV7 ATX Full Tower White Tempered Glass',
    'Lian Li A4-H20 Mini-ITX Desktop Silver / Black Mesh Side Panel',
    'In Win IW-MS04 Mini-ITX Desktop Black',
    'Lian Li Vector V100 Mini',
    'Cooler Master Elite 301 Lite Micro ATX Mini Tower Black with Tempered Glass Side Panel and USB 3.2 Gen 1 Type-C and USB 3.2 Gen 1 Type-A',
    'Thermaltake Versa H17 Micro ATX Mini Tower Black',
    'Asus Prime AP201 Micro ATX Mini Tower White Mesh Side Panel',
    'Azza Spectra ATX Mid Tower White with Tempered Glass Side Panel and Front Panel USB 3.2 Gen 1 Type-A, USB 2.0 Type-A',
    'Corsair 6500X ATX Mid Tower Black Tempered Glass Side Panel',
    'Supermicro SuperChassis 721TQ-350B2 Mini-ITX Tower Black w/350 W Power Supply',
    'Fractal Design Terra Mini-ITX Desktop Green / Brown Mesh Side Panel Front Panel USB 3.2 Gen 2x2 Type-C                                                    USB 3.2 Gen 1 Type-A',
    'MSI MPG GUNGNIR 300R AIRFLOW ATX Mid Tower White with Tempered Glass Side Panel and USB 3.2 Gen 2x2 Type-C / USB 3.2 Gen 1 Type-A',
    'HAVN BF 360 Flow White',
    'NZXT H7 Flow RGB (2024) ATX Mid Tower White Tempered Glass, USB 3.2 Gen 2x2 Type-C USB 3.2 Gen 1 Type-A',
    'Thermaltake View 380 XL WS ARGB Mid Tower Chassis Wood Edition Snow',
    'Fractal Design Meshify C ATX Mid Tower Black',
  ],
};

const apply = process.argv.includes('--apply');
let totalMatched = 0;
let totalMissing = 0;

for (const [category, names] of Object.entries(TO_HIDE)) {
  for (const name of names) {
    const { data, error } = await supabase.from('components').select('id').eq('category', category).eq('name', name);
    if (error) { console.error(`SELECT failed for ${category}/${name}:`, error.message); continue; }
    if (!data.length) { console.warn(`NOT FOUND: ${category} / "${name}"`); totalMissing++; continue; }
    totalMatched += data.length;
    if (apply) {
      const { error: updErr } = await supabase.from('components').update({ is_live: false }).eq('category', category).eq('name', name);
      if (updErr) console.error(`UPDATE failed for ${category}/${name}:`, updErr.message);
    }
  }
  console.log(`${category}: ${names.length} names listed`);
}

console.log(`\nTotal live rows matched: ${totalMatched}`);
console.log(`Total names not found (catalog may have changed): ${totalMissing}`);
console.log(apply ? '\nApplied: is_live = false on all matched rows.' : '\n(dry run — pass --apply to actually flip is_live)');
