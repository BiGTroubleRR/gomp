// One-off import: for each GPU chipset already in the catalog, add ~10-15 real board-partner
// variants mined from buildcores-open-db, using each SKU's own real length/slot-width/tdp/memory
// data. New rows get no tier/passmark (no PassMark score exists for these in the source data)
// and inherit the existing curated entry's price for that chipset (buildcores-open-db has no
// commerce price field, so same-chipset variants are priced the same as a reasonable estimate).
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '')
    .toUpperCase()
    .replace(/[®™]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
function tokens(s) {
  return new Set(normalize(s).split(' ').filter(Boolean));
}
// The bit of an existing catalog name that identifies the chipset itself, stripped of the
// vendor prefix our own naming convention adds ("NVIDIA " / "AMD Radeon " -> just the chipset).
function chipsetTokensFor(catalogName) {
  const stripped = catalogName.replace(/^NVIDIA\s+/, '').replace(/^AMD\s+/, '');
  return tokens(stripped);
}
// hits/score are kept separate on purpose: hits is an integer used to filter ("does this
// candidate actually match the chipset"), score is hits with a small fractional tie-breaker
// used only for sorting — comparing a fractionally-penalized score against an integer
// threshold silently dropped every exact-hit match once a brand-name token like "GeForce"
// or "Radeon" (always present in the source chipset field, never in our own stripped catalog
// name) nudged the score just under that integer.
function matchStats(chipTokens, candidateChipset) {
  const cTokens = tokens(candidateChipset);
  let hits = 0;
  chipTokens.forEach((t) => {
    if (cTokens.has(t)) hits++;
  });
  const extra = [...cTokens].filter((t) => !chipTokens.has(t)).length;
  return { hits, score: hits - extra * 0.05 };
}

const gpuDir = `${OPEN_DB}/GPU`;
const candidates = readdirSync(gpuDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${gpuDir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter((c) => c && c.chipset && c.length && c.metadata?.manufacturer && c.metadata?.name);

const { data: existing } = await supabase.from('components').select('name,price,specs').eq('category', 'gpu');

const TARGET_PER_CHIPSET = 5;
const results = [];

for (const row of existing) {
  const chipTokens = chipsetTokensFor(row.name);
  const minHits = Math.max(2, chipTokens.size - 1);
  const scored = candidates
    .map((c) => ({ c, ...matchStats(chipTokens, c.chipset) }))
    .filter((x) => x.hits >= minHits)
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  const seenManufacturer = new Set();
  const seenName = new Set([normalize(row.name)]);
  for (const { c } of scored) {
    if (chosen.length >= TARGET_PER_CHIPSET) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (seenName.has(nameKey)) continue;
    // At most 2 SKUs per manufacturer per chipset, so 12 slots spread across ~6+ brands
    // instead of one brand's whole lineup crowding out the rest.
    const mfrCount = chosen.filter((x) => x.mfr === mfr).length;
    if (mfrCount >= 1) continue;
    chosen.push({ c, mfr });
    seenName.add(nameKey);
  }

  console.log(`${row.name}: found ${chosen.length}/${TARGET_PER_CHIPSET} (${new Set(chosen.map((x) => x.mfr)).size} manufacturers)`);

  chosen.forEach(({ c }) => {
    const specs = `${c.memory ?? '?'}GB ${c.memory_type ?? ''} · ${c.tdp ?? '?'}W · ${c.interface ?? ''}`.replace(/\s+·/g, ' ·').trim();
    results.push({
      category: 'gpu',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      gpu_length_mm: c.length,
      gpu_slot_width: c.total_slot_width ?? null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new GPU rows to insert: ${results.length}`);
if (process.argv.includes('--full')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(JSON.stringify(results.slice(0, 3), null, 2));
}

if (process.argv.includes('--apply')) {
  const chunkSize = 50;
  for (let i = 0; i < results.length; i += chunkSize) {
    const chunk = results.slice(i, i + chunkSize);
    const { error } = await supabase.from('components').insert(chunk);
    if (error) console.error('INSERT FAILED for chunk', i, error.message);
    else console.log(`Inserted rows ${i}-${i + chunk.length}`);
  }
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
