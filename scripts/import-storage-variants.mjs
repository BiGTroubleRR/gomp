// One-off import: for each storage capacity already in the catalog, add real M.2 NVMe drives
// from other major manufacturers at the same capacity, mined from buildcores-open-db. New rows
// get no tier/passmark and inherit the existing curated entry's price for that capacity.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}
function capacityFromName(name) {
  const m = name.match(/(\d+)\s*TB/i);
  return m ? Number(m[1]) * 1000 : null;
}

const dir = `${OPEN_DB}/Storage`;
const candidates = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter(
    (c) =>
      c &&
      c.capacity &&
      c.nvme === true &&
      c.form_factor === 'M.2-2280' &&
      c.metadata?.manufacturer &&
      c.metadata?.name,
  );

const { data: existing } = await supabase.from('components').select('name,price,specs').eq('category', 'storage');

const TARGET_PER_CAPACITY = 5;
const results = [];

for (const row of existing) {
  const capacityGb = capacityFromName(row.name);
  if (!capacityGb) {
    console.log(`${row.name}: could not parse capacity, skipping`);
    continue;
  }
  const matched = candidates.filter((c) => Math.abs(c.capacity - capacityGb) < 50);

  const chosen = [];
  const seenName = new Set([normalize(row.name)]);
  for (const c of matched) {
    if (chosen.length >= TARGET_PER_CAPACITY) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (seenName.has(nameKey)) continue;
    const mfrCount = chosen.filter((x) => x.mfr === mfr).length;
    if (mfrCount >= 1) continue;
    chosen.push({ c, mfr });
    seenName.add(nameKey);
  }

  console.log(`${row.name}: found ${chosen.length}/${TARGET_PER_CAPACITY} (${new Set(chosen.map((x) => x.mfr)).size} manufacturers) from ${matched.length} candidates`);

  chosen.forEach(({ c }) => {
    const specs = (c.interface || 'M.2 PCIe NVMe').trim();
    results.push({
      category: 'storage',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new storage rows to insert: ${results.length}`);
console.log(JSON.stringify(results.slice(0, 5), null, 2));

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
