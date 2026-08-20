// One-off import: for each PSU wattage already in the catalog, add real ATX units from other
// major manufacturers at the same wattage, mined from buildcores-open-db, using each unit's own
// real length. New rows get no tier/passmark and inherit the existing curated entry's price.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}
function wattageFromName(name) {
  const m = name.match(/(\d{3,4})W/);
  return m ? Number(m[1]) : null;
}

const dir = `${OPEN_DB}/PSU`;
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
    (c) => c && c.wattage && c.length && c.form_factor === 'ATX' && c.metadata?.manufacturer && c.metadata?.name,
  );

const { data: existing } = await supabase.from('components').select('name,price,specs').eq('category', 'psu');

const TARGET = 5;
const results = [];

for (const row of existing) {
  const wattage = wattageFromName(row.name) ?? wattageFromName(row.specs);
  if (!wattage) {
    console.log(`${row.name}: could not parse wattage, skipping`);
    continue;
  }
  const matched = candidates.filter((c) => c.wattage === wattage);

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

  console.log(`${row.name}: found ${chosen.length}/${TARGET} manufacturers from ${matched.length} candidates`);

  chosen.forEach(({ c }) => {
    const modular = c.modular === 'Full' ? 'Modular' : c.modular === 'Semi-Modular' ? 'Semi-Modular' : c.modular === 'Non-Modular' ? 'Non-Modular' : '';
    const specs = `${c.wattage}W · ${c.efficiency_rating ?? ''} · ${modular}`.replace(/\s*·\s*·/g, ' ·').replace(/·\s*$/, '').trim();
    results.push({
      category: 'psu',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      psu_length_mm: c.length,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new PSU rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows`);
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
