// One-off import: for each cooler already in the catalog, add real coolers from other major
// manufacturers matching on the same real spec — air towers by height, AIOs by radiator size —
// mined from buildcores-open-db. New rows get no tier/passmark and inherit the existing curated
// entry's price.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

const dir = `${OPEN_DB}/CPUCooler`;
const candidates = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter((c) => c && c.metadata?.manufacturer && c.metadata?.name);

const { data: existing } = await supabase
  .from('components')
  .select('name,price,specs,cooler_height_mm,cooler_radiator_mm')
  .eq('category', 'cooler');

const TARGET = 5;
const results = [];

for (const row of existing) {
  const isAio = row.cooler_radiator_mm != null;
  const matched = isAio
    ? candidates.filter((c) => c.water_cooled === true && c.radiator_size === row.cooler_radiator_mm)
    : candidates.filter((c) => c.water_cooled !== true && c.height != null && Math.abs(c.height - row.cooler_height_mm) <= 5);

  const chosen = [];
  const seenName = new Set([normalize(row.name)]);
  for (const c of matched) {
    if (chosen.length >= TARGET) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (seenName.has(nameKey)) continue;
    if (chosen.some((x) => x.mfr === mfr)) continue;
    chosen.push({ c, mfr });
    seenName.add(nameKey);
  }

  console.log(`${row.name} (${isAio ? 'AIO' : 'air'}): found ${chosen.length}/${TARGET} manufacturers from ${matched.length} candidates`);

  chosen.forEach(({ c }) => {
    const specs = isAio ? `${c.radiator_size}mm AIO` : `${c.height}mm tall`;
    results.push({
      category: 'cooler',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      cooler_height_mm: isAio ? null : c.height,
      cooler_radiator_mm: isAio ? c.radiator_size : null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new cooler rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows`);
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
