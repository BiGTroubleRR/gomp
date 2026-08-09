// One-off import: for each motherboard chipset already in the catalog, add real boards from
// other major manufacturers with the same chipset + form factor, mined from buildcores-open-db.
// Socket/form_factor are read straight off the existing catalog row (both are already
// standardized-by-form-factor real dimensions elsewhere in the app, so no per-SKU size needed).
// New rows get no tier/passmark and inherit the existing curated entry's price for that chipset.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}
// AMD/Intel chipset codes that appear in our own catalog names — matched as a whole word so
// "B650" doesn't also match "B650E".
const CHIPSET_PATTERN = /\b(X870E|X670E|X570|B650E|B650|B550|B450|A620|Z890|Z790|B860|B760)M?\b/;
function chipsetFromName(name) {
  const m = name.match(CHIPSET_PATTERN);
  return m ? m[1] : null;
}

const dir = `${OPEN_DB}/Motherboard`;
const candidates = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter((c) => c && c.chipset && c.form_factor && c.metadata?.manufacturer && c.metadata?.name);

const { data: existing } = await supabase.from('components').select('name,price,socket,form_factor').eq('category', 'mobo');

// buildcores-open-db's own form_factor enum uses "Micro ATX"/"Mini-ITX"/"ATX"/"EATX" — map to
// our catalog's FormFactor union.
const FORM_FACTOR_MAP = { 'ATX': 'ATX', 'Micro ATX': 'mATX', 'Mini-ITX': 'Mini-ITX', 'EATX': 'E-ATX' };

const TARGET = 5;
const results = [];

for (const row of existing) {
  const chipset = chipsetFromName(row.name);
  if (!chipset) {
    console.log(`${row.name}: could not parse chipset, skipping`);
    continue;
  }
  const matched = candidates.filter(
    (c) => c.chipset.toUpperCase().includes(chipset) && FORM_FACTOR_MAP[c.form_factor] === row.form_factor,
  );

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

  console.log(`${row.name} (${chipset}, ${row.form_factor}): found ${chosen.length}/${TARGET} manufacturers from ${matched.length} candidates`);

  chosen.forEach(({ c }) => {
    const m2 = Array.isArray(c.m2_slots) ? c.m2_slots.length : null;
    const specs = `${c.chipset} · DDR5${m2 ? ` · ${m2}×M.2` : ''}`.trim();
    results.push({
      category: 'mobo',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      socket: row.socket,
      form_factor: row.form_factor,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new motherboard rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows`);
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
