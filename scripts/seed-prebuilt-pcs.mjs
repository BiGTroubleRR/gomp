// One-off migration: seeds the `prebuilt_pcs` table (see supabase/schema.sql) with the current 6
// "Configure this PC" builds, so Admin's Builds tab isn't empty on first load and the homepage
// hero/Featured Builds grid/shop keep showing the same lineup immediately after this ships — now
// from one real, shared table instead of three separate hardcoded copies (the homepage's own
// literals, shop's PRODUCTS array, and this session's short-lived src/lib/prebuilt-products.ts).
//
// Data here matches src/lib/component-db-seed.ts's defaultBuilds() (the offline fallback used if
// this table's fetch ever fails) — kept in sync by hand since scripts in this repo are
// self-contained and don't import from src/. Every one of the 8 component fields is an exact,
// live-catalog-verified Component.name (cross-checked the same way as the eD-system case import
// earlier this project), not display copy — required for the /build carry-over to actually work.
//
// IMPORTANT: run supabase/schema.sql's new prebuilt_pcs block in the Supabase dashboard's SQL
// Editor FIRST — this script only inserts rows, it doesn't create the table.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUILDS = [
  { name: 'The Apex Predator', tagline_en: 'Ultimate 4K gaming & creation', tagline_sk: 'Špičkové 4K hranie a tvorba', tagline_cz: 'Špičkové 4K hraní a tvorba', cat: 'flagship', tier: 'S', gpu: 'NVIDIA RTX 5090 FE', cpu: 'AMD Ryzen 9 9950X', mobo: 'ASUS ROG STRIX X870E-E GAMING WIFI', ram: 'ADATA XPG LANCER RGB DDR5-6400 32GB (2x16GB) CL32 White', storage: 'ADATA LEGEND 970 2TB SSD M.2-2280 PCIe 5.0 X4 NVMe', cooler: 'NZXT Kraken 360 RGB', psu: 'Corsair HX1200i ATX 3.0', case: 'Lian Li O11D EVO XL', price_eur: 3739, rating: 4.9 },
  { name: 'The Marauder Pro', tagline_en: 'Unstoppable 4K all-rounder', tagline_sk: 'Neporaziteľný univerzál pre 4K', tagline_cz: 'Neporazitelný univerzál pro 4K', cat: 'performance', tier: 'A', gpu: 'NVIDIA RTX 4090', cpu: 'Intel Core i9-14900K', mobo: 'MSI MPG Z790 CARBON WIFI', ram: 'Corsair Dominator 32GB DDR5 5600', storage: 'Samsung 990 Pro 2TB NVMe', cooler: 'NZXT Kraken 360 RGB', psu: 'EVGA SuperNOVA 1200 P3 1200W 80+ Platinum Certified Fully Modular', case: 'NZXT H9 Flow RGB', price_eur: 2869, rating: 4.8 },
  { name: 'The Marauder', tagline_en: 'Dominant 1440p performer', tagline_sk: 'Dominantný výkon v 1440p', tagline_cz: 'Dominantní výkon v 1440p', cat: 'performance', tier: 'A', gpu: 'NVIDIA RTX 4080 Super', cpu: 'Intel Core i9-14900K', mobo: 'Gigabyte Z790 AORUS ELITE AX', ram: 'G.Skill Trident Z5 RGB Metallic Silver DDR5-5200 CL40 32GB (2x16GB)', storage: 'TEAMGROUP Cardea A440 2TB M.2-2280 SSD PCIe 4.0 X4 NVMe', cooler: 'Thermalright Frozen Warframe PRO Water 360mm Black', psu: 'be quiet! Straight Power 11 Black 850W Fully Modular 80+ Platinum Certified', case: 'Fractal Design Meshify 2', price_eur: 2169, rating: 4.7 },
  { name: 'The Ranger', tagline_en: 'Smooth 1440p at great value', tagline_sk: 'Plynulé 1440p za skvelú cenu', tagline_cz: 'Plynulé 1440p za skvělou cenu', cat: 'midrange', tier: 'B', gpu: 'NVIDIA RTX 4070 Ti Super', cpu: 'Intel Core i7-14700K', mobo: 'Gigabyte B760M GAMING WIFI DDR5 Micro ATX', ram: 'Crucial Pro Overclocking 32GB (2x16GB) DDR5 6000 CL36 Black', storage: 'PNY CS2140 2TB SSD M.2-2280 PCIe 4.0 x4 NVMe', cooler: 'Thermaltake TH240 V2 ARGB Black', psu: 'NZXT C850 (2024) Black 850W Fully Modular 80+ Gold Certified', case: 'Cooler Master MasterBox MB520 ARGB', price_eur: 1569, rating: 4.6 },
  { name: 'The Scout Pro', tagline_en: '1080p powerhouse, real value', tagline_sk: 'Silák na 1080p za rozumnú cenu', tagline_cz: 'Silák na 1080p za rozumnou cenu', cat: 'midrange', tier: 'B', gpu: 'NVIDIA RTX 4070 Super', cpu: 'Intel Core i5-14600K', mobo: 'MAXSUN B760 iCraft B760M CROSS LGA1700 DDR5 Micro ATX', ram: 'Corsair Vengeance Black DDR5-5200 CL40 16GB (1x16GB)', storage: 'FFF Smart Life Connected G-Storategy NV470 w/Heatsink 2TB SSD M.2-2280 PCIe 4.0 X4 NVMe', cooler: 'Deepcool ICE BLADE PRO V2.0 Air 161mm 60.29 CFM', psu: 'Seasonic FOCUS GX-850', case: 'Fractal Design Core 2300', price_eur: 1299, rating: 4.7 },
  { name: 'The Scout', tagline_en: 'Entry-level gaming excellence', tagline_sk: 'Špička v základnej triede', tagline_cz: 'Špička v základní třídě', cat: 'entry', tier: 'C', gpu: 'NVIDIA RTX 4070', cpu: 'Intel Core i5-14600K', mobo: 'ASRock B760M-H2/M.2 DDR5 Micro ATX', ram: 'Kingston FURY Beast RGB Black DDR5-5200 CL36 16GB (1x16GB)', storage: 'Mushkin Vortex Redline 2TB SSD M.2 PCIe 4.0 NVMe', cooler: 'Cooler Master Hyper 212 LED Air 160mm 66.3 CFM Rifle Bearing', psu: 'PowerSpec PSX Black 850W Fully Modular 80+ Gold Certified', case: 'Fractal Design Pop Air', price_eur: 1039, rating: 4.5 },
];

const { data: existing, error: existingError } = await supabase.from('prebuilt_pcs').select('name');
if (existingError) throw new Error(`Could not read prebuilt_pcs — did you run the schema.sql migration yet? (${existingError.message})`);
const existingNames = new Set((existing ?? []).map((r) => r.name));

const results = BUILDS.filter((b) => !existingNames.has(b.name)).map((b, i) => ({ ...b, is_live: true, sort_order: i }));

console.log(`Total new prebuilt_pcs rows to insert: ${results.length} (of ${BUILDS.length} total, ${existingNames.size} already present)`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  if (results.length === 0) {
    console.log('Nothing to insert.');
  } else {
    const { error } = await supabase.from('prebuilt_pcs').insert(results);
    if (error) console.error('INSERT FAILED', error.message);
    else console.log(`Inserted ${results.length} rows`);
  }
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
