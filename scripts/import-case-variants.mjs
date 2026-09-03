// One-off import: adds real cases from major manufacturers to the catalog, mined from
// buildcores-open-db's PCCase category (~3,749 entries). Bucketed by the largest motherboard
// form factor each candidate supports (the same signal CASE_FORM_FACTOR_SUPPORT in
// component-db-seed.ts uses for compatibility), not raw height — this catalog's Full/Mid/Mini
// Tower / SFF categories are about motherboard support, not physical size (e.g. Fractal Design
// Pop Air is fairly tall but categorized "Mini Tower" here because it only takes mATX/Mini-ITX).
//
// buildcores-open-db has no radiator-support or fan-mount data for cases at all (confirmed —
// those have always been hand-sourced for this category, see the comment on FanMountSpec in
// component-db-seed.ts). Every new row borrows max_psu_length_mm/max_radiator_mm/fan_mounts
// (including whatever fans that reference case ships pre-installed) from whichever EXISTING
// curated case is already in the same bucket, so a newly added case still shows real rendered
// fans in the 3D viewport by default (see defaultFanConfigForCase in src/app/build/page.tsx,
// which only populates a mount's fans when preinstalledCount is set) instead of looking bare —
// this is a heuristic default, not verified per-model, refinable later via Admin.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

function normalizeFormFactor(raw) {
  const s = (raw || '').toUpperCase().replace(/[\s-]/g, '');
  if (s.includes('EATX') || s.includes('EXTENDEDATX')) return 'E-ATX';
  if (s === 'ATX') return 'ATX';
  if (s.includes('MICROATX') || s === 'MATX') return 'mATX';
  if (s.includes('MINIITX') || s.includes('ITX')) return 'Mini-ITX';
  return null;
}

// Mirrors CASE_FORM_FACTOR_SUPPORT's own bucket definitions: Full Tower is the only bucket that
// takes E-ATX, Mid Tower's largest is ATX, Mini Tower's largest is mATX, SFF is Mini-ITX only.
function classifyBucket(supportedRaw) {
  const set = new Set((supportedRaw || []).map(normalizeFormFactor).filter(Boolean));
  if (set.has('E-ATX')) return 'Full Tower';
  if (set.has('ATX')) return 'Mid Tower';
  if (set.has('mATX')) return 'Mini Tower';
  if (set.has('Mini-ITX')) return 'SFF';
  return null;
}

// Form-factor support alone isn't a reliable enough signal on its own — plenty of physically
// mid-tower-sized cases now support E-ATX (getting bucketed "Full Tower" despite their own
// product name saying "Mid Tower"), and a chunk of buildcores-open-db's Mini-ITX-only entries
// are horizontal desktop/HTPC/cube cases whose width/height/depth don't map onto a vertical
// tower shape the way this engine's simple box-render (and every other case's data) assumes.
// This is a coarse plausibility check on top of the form-factor bucket, not a precise real-world
// boundary — it exists to catch outliers like a 435mm-tall "SFF" case, not to relitigate exactly
// where Mid Tower ends and Full Tower begins.
const HEIGHT_RANGE_MM = {
  'Full Tower': [500, 750],
  'Mid Tower': [400, 560],
  'Mini Tower': [300, 460],
  SFF: [0, 280],
};
function isPlausibleShape(bucket, dims) {
  const [min, max] = HEIGHT_RANGE_MM[bucket];
  if (dims.height < min || dims.height > max) return false;
  return dims.width < dims.height; // taller than wide — rules out horizontal desktop/HTPC cases
}

const BUCKETS = ['Full Tower', 'Mid Tower', 'Mini Tower', 'SFF'];

const dir = `${OPEN_DB}/PCCase`;
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
      c.metadata?.manufacturer &&
      c.metadata?.name &&
      c.dimensions_mm?.width &&
      c.dimensions_mm?.height &&
      c.dimensions_mm?.depth,
  )
  .map((c) => ({ ...c, bucket: classifyBucket(c.supported_motherboard_form_factors) }))
  .filter((c) => c.bucket && isPlausibleShape(c.bucket, c.dimensions_mm));

const { data: existing } = await supabase
  .from('components')
  .select('name,price,tier,case_size,max_psu_length_mm,max_radiator_mm,fan_mounts')
  .eq('category', 'case');

// One reference row per bucket to borrow fan_mounts/max_radiator_mm/max_psu_length_mm/price from
// — same hand-sourced convention this category has always used for the fields buildcores-open-db
// doesn't have.
const referenceByBucket = {};
for (const row of existing) {
  if (!referenceByBucket[row.case_size]) referenceByBucket[row.case_size] = row;
}
const existingNames = new Set(existing.map((r) => normalize(r.name)));

const TARGET_PER_BUCKET = 4;
const results = [];

for (const bucket of BUCKETS) {
  const ref = referenceByBucket[bucket];
  if (!ref) {
    console.log(`${bucket}: no existing case in this bucket to borrow fan_mounts/radiator/PSU-length/price from — skipping`);
    continue;
  }
  const bucketCandidates = candidates.filter((c) => c.bucket === bucket);

  const chosen = [];
  const seenName = new Set();
  const seenMfr = new Set();
  for (const c of bucketCandidates) {
    if (chosen.length >= TARGET_PER_BUCKET) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (existingNames.has(nameKey) || seenName.has(nameKey)) continue;
    if (seenMfr.has(mfr)) continue; // one per manufacturer, same diversity rule as import-cooler-variants.mjs
    chosen.push(c);
    seenName.add(nameKey);
    seenMfr.add(mfr);
  }

  console.log(`${bucket}: found ${chosen.length}/${TARGET_PER_BUCKET} manufacturers from ${bucketCandidates.length} candidates (borrowing fan_mounts/radiator/PSU-length/price from "${ref.name}")`);

  chosen.forEach((c) => {
    const { width, height, depth } = c.dimensions_mm;
    results.push({
      category: 'case',
      name: c.metadata.name,
      price: Number(ref.price),
      specs: `${bucket} · ${width}×${height}×${depth}mm`,
      tier: null,
      case_size: bucket,
      case_width_mm: width,
      case_height_mm: height,
      case_depth_mm: depth,
      max_gpu_length_mm: c.max_video_card_length ?? null,
      max_cooler_height_mm: c.max_cpu_cooler_height ?? null,
      max_psu_length_mm: ref.max_psu_length_mm ?? null,
      max_radiator_mm: ref.max_radiator_mm ?? null,
      fan_mounts: ref.fan_mounts ?? null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new case rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows`);
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
