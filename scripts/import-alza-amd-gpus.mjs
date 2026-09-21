// One-off import: adds real AMD Radeon graphics cards to the catalog. The live `components`
// table had zero AMD GPUs before this (confirmed by a direct query — all 80 existing gpu rows
// are NVIDIA GeForce RTX 50-series), so this is a genuine gap-fill, not just "a few more SKUs".
//
// Unlike every other import script in this repo, the source here (Alza.cz) can't be scraped by
// a plain fetch() — even a bare request for /robots.txt returns a Cloudflare "confirm you're
// human" challenge (HTTP 403), confirmed directly before writing this script. A real browser
// session gets through fine, so ITEMS below was hand-gathered by browsing Alza's live AMD Radeon
// listings directly (2026-09-21), the same way this repo's very first GPU import script's own
// RAW_ITEMS array was itself a pre-gathered snapshot rather than a live runtime fetch. This is
// NOT a repeatable/scheduled scraper — re-pricing or adding more cards later needs another
// manual pass like this one.
//
// Pricing: `price` and `market_price` are both set to Alza's real listed price. `market_price`
// is the "Original"/reference field Admin's form already labels "Market Price (Alza/Heureka)"
// but has never actually had a value on any live row until now. `price` starts equal to it — no
// auto-markup is applied, matching this catalog's manual per-component pricing model (see the
// per-component-pricing rework: Jakub sets/overrides `price`/`site_price` by hand per part).
//
// Tier/passmark: RX 9070 XT and RX 9070 are already tracked in src/lib/passmark.ts's top-25
// table — this script's own new AIB product names were added as extra `names[]` aliases on
// those two entries (see that file) so they resolve a live score/tier automatically via the
// existing passmarkLookup() mechanism, the same way every NVIDIA SKU already does. RX 9060 XT
// and RX 7600 aren't tracked there, so those rows get a manual `tier` set directly below instead.
//
// Specs (VRAM/TDP/PCIe gen/bus width) are only as complete as Alza's own listing text plus each
// chip's publicly documented reference TDP — leaner than the fully-enriched NVIDIA rows (which
// went through import -> enrich-specs -> fetch-dims over time). `gpu_length_mm` comes from
// Alza's own per-SKU board length ("šířka"); `gpu_slot_width`/`gpu_width_mm` are left for a
// later enrichment pass, matching scripts/import-edsystem-gpus.mjs's own precedent of seeding
// partial dimension data. Images are skipped entirely this pass (Alza's asset URLs weren't worth
// risking further bot-protection friction for a first import) — `image_url` stays null, an
// already-normal state elsewhere in this catalog (see scripts/cleanup-imageless-components.mjs).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Reference TBP (total board power) per chip — AMD's own publicly documented reference-design
// figure, not a per-SKU measurement (board partners' factory OC models can draw a little more,
// same simplification scripts/import-edsystem-gpus.mjs's CHIPSET_TABLE already makes for NVIDIA).
const CHIP_SPECS = {
  'RX 7600': { vramGb: 8, tdpW: 165, pcie: '4.0', busBit: 128, tier: 'B' },
  'RX 9060 XT': { vramGb: 16, tdpW: 150, pcie: '5.0', busBit: 128, tier: 'B' },
  'RX 9070': { vramGb: 16, tdpW: 220, pcie: '5.0', busBit: 256, tier: null }, // resolves live via passmarkLookup
  'RX 9070 XT': { vramGb: 16, tdpW: 304, pcie: '5.0', busBit: 256, tier: null }, // resolves live via passmarkLookup
};

const RECOMMENDED_PSU_W = { 'RX 7600': 550, 'RX 9060 XT': 550, 'RX 9070': 650, 'RX 9070 XT': 750 };

// Gathered directly from Alza.cz's AMD Radeon listings, 2026-09-21 — see header comment.
const ITEMS = [
  { name: 'ASUS DUAL Radeon RX 9060 XT 16G', chip: 'RX 9060 XT', priceKc: 12990, lengthMm: 202 },
  { name: 'ASUS DUAL Radeon RX 9060 XT 16G WHITE', chip: 'RX 9060 XT', priceKc: 12790, lengthMm: 202 },
  { name: 'GIGABYTE Radeon RX 9060 XT GAMING OC 16G', chip: 'RX 9060 XT', priceKc: 13790, lengthMm: 281 },
  { name: 'ASUS PRIME Radeon RX 9070 O16G', chip: 'RX 9070', priceKc: 16990, lengthMm: 312 },
  { name: 'XFX Swift AMD Radeon RX 9070 XT 16G', chip: 'RX 9070 XT', priceKc: 18299, lengthMm: 320 },
  { name: 'XFX Mercury AMD Radeon RX 9070 XT OC Gaming Edition', chip: 'RX 9070 XT', priceKc: 18999, lengthMm: 360 },
  { name: 'XFX Mercury AMD Radeon RX 9070 XT OC Magnetic Air 16G', chip: 'RX 9070 XT', priceKc: 19499, lengthMm: 360 },
  { name: 'SAPPHIRE NITRO+ AMD Radeon RX 9070 XT GAMING OC 16G', chip: 'RX 9070 XT', priceKc: 22990, lengthMm: 330.8 },
  { name: 'ASUS DUAL Radeon RX 7600 8G OC EVO', chip: 'RX 7600', priceKc: 7490, lengthMm: 229 },
];

function specsFor(chip) {
  const c = CHIP_SPECS[chip];
  return `${c.vramGb}GB GDDR6 · ${c.tdpW}W · PCIe ${c.pcie} · ${c.busBit}-bit bus · rec. ${RECOMMENDED_PSU_W[chip]}W PSU`;
}

const apply = process.argv.includes('--apply');

const { data: existingRows, error: existingError } = await supabase.from('components').select('name').eq('category', 'gpu');
if (existingError) throw new Error(`Failed to read existing gpu rows: ${existingError.message}`);
const existingNames = new Set(existingRows.map((r) => r.name.trim().toLowerCase()));

const parsed = [];
const skippedExisting = [];
for (const item of ITEMS) {
  const nameKey = item.name.trim().toLowerCase();
  if (existingNames.has(nameKey)) {
    skippedExisting.push(item.name);
    continue;
  }
  const c = CHIP_SPECS[item.chip];
  parsed.push({
    name: item.name,
    price: item.priceKc,
    marketPrice: item.priceKc,
    specs: specsFor(item.chip),
    tier: c.tier, // null for RX 9070/9070 XT — passmarkLookup() supplies the live tier via the new name aliases in passmark.ts
    lengthMm: item.lengthMm,
  });
}

console.log(`Parsed ${parsed.length} new AMD GPUs (${skippedExisting.length} already in the catalog, skipped).`);
if (skippedExisting.length) console.log('Already present:', JSON.stringify(skippedExisting, null, 2));
console.log(JSON.stringify(parsed, null, 2));

if (!apply) {
  console.log('\n(dry run — pass --apply to insert these rows)');
  process.exit(0);
}

let inserted = 0;
for (const p of parsed) {
  const row = {
    category: 'gpu',
    name: p.name,
    price: p.price,
    market_price: p.marketPrice,
    specs: p.specs,
    tier: p.tier, // null for RX 9070/9070 XT — components.tier is nullable specifically for this case (schema.sql: "null for bulk-imported SKUs with no PassMark score to derive a tier from"); passmarkLookup() resolves the real tier live everywhere (Admin, /build, /shop) via the new name aliases in passmark.ts
    gpu_length_mm: p.lengthMm,
    is_live: true,
    sort_order: 100,
  };
  const { error } = await supabase.from('components').insert(row);
  if (error) {
    console.error(`INSERT FAILED for ${p.name}: ${error.message}`);
    continue;
  }
  inserted++;
}
console.log(`\nDone — inserted ${inserted}/${parsed.length} AMD GPUs.`);
