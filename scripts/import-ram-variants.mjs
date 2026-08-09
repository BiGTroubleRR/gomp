// One-off import: for each RAM speed/capacity spec already in the catalog, add real kits from
// other major manufacturers at the same speed+capacity+DDR-generation, mined from
// buildcores-open-db, using each kit's own real heatsink height. New rows get no tier/passmark
// and inherit the existing curated entry's price for that spec (same reasoning as the GPU
// import — buildcores-open-db has no commerce price field).
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

// e.g. "G.Skill Trident Z5 32GB DDR5 6400" -> { capacity: 32, ramType: 'DDR5', speed: 6400 }
function parseCatalogSpec(name, specs) {
  const speedMatch = name.match(/DDR\d\s+(\d{4})/);
  const typeMatch = name.match(/DDR(\d)/);
  const capMatch = name.match(/(\d+)GB/);
  return {
    speed: speedMatch ? Number(speedMatch[1]) : null,
    ramType: typeMatch ? `DDR${typeMatch[1]}` : null,
    capacity: capMatch ? Number(capMatch[1]) : null,
  };
}

const ramDir = `${OPEN_DB}/RAM`;
const candidates = readdirSync(ramDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${ramDir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter((c) => c && c.speed && c.capacity && c.ram_type && c.metadata?.manufacturer && c.metadata?.name);

const { data: existing } = await supabase.from('components').select('name,price,specs').eq('category', 'ram');

const TARGET_PER_SPEC = 5;
const results = [];

for (const row of existing) {
  const spec = parseCatalogSpec(row.name, row.specs);
  if (!spec.speed || !spec.capacity || !spec.ramType) {
    console.log(`${row.name}: could not parse spec from name, skipping`);
    continue;
  }
  const matched = candidates.filter(
    (c) => c.speed === spec.speed && c.capacity === spec.capacity && c.ram_type === spec.ramType,
  );

  const chosen = [];
  const seenName = new Set([normalize(row.name)]);
  for (const c of matched) {
    if (chosen.length >= TARGET_PER_SPEC) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (seenName.has(nameKey)) continue;
    const mfrCount = chosen.filter((x) => x.mfr === mfr).length;
    if (mfrCount >= 1) continue;
    chosen.push({ c, mfr });
    seenName.add(nameKey);
  }

  console.log(`${row.name}: found ${chosen.length}/${TARGET_PER_SPEC} (${new Set(chosen.map((x) => x.mfr)).size} manufacturers) from ${matched.length} candidates`);

  chosen.forEach(({ c }) => {
    const moduleCount = c.modules?.quantity ?? 2;
    const moduleCapacity = c.modules?.capacity_gb ?? Math.round(c.capacity / moduleCount);
    const cl = c.cas_latency ? `CL${c.cas_latency}` : '';
    const specs = `${moduleCount}×${moduleCapacity}GB · ${cl}`.replace(/·\s*$/, '').trim();
    results.push({
      category: 'ram',
      name: c.metadata.name,
      price: Number(row.price),
      specs,
      tier: null,
      ram_height_mm: c.height ?? null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new RAM rows to insert: ${results.length}`);
if (process.argv.includes('--full')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(JSON.stringify(results.slice(0, 5), null, 2));
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
