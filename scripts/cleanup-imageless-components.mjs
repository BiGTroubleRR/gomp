// One-off cleanup: delete every cpu/gpu/mobo row with no image_url, and backfill a real PassMark
// score (from the curated table in src/lib/passmark.ts) onto any surviving row that has a picture
// but no score yet. Mirrors the CPU import's own note that PassMark only rates CPU/GPU — mobo
// rows are never touched by the backfill step, only by the deletion step.
//
// The backfill match is deliberately conservative: it only fills in a score when the DB row's
// name is functionally the exact same silicon as a curated passmark.ts entry once a cosmetic
// suffix is stripped — "WOF" (AMD's boxed-without-fan SKU marker) or a trailing "F" (Intel's
// no-iGPU marker on an otherwise identical K-series die). Rows that don't reduce to a curated
// name this way (a smaller/older SKU, or a newer one the curated table doesn't track yet) are
// left alone and reported, not guessed at.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

// Mirrors passmark.ts's CPU table (can't import a .ts module from this plain Node script) —
// only the entries actually needed to resolve the current gaps, keyed by curated display name.
const CPU_PASSMARK_LIST = [
  { name: 'AMD Ryzen 7 7700X', score: 35496, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700X&id=5036' },
  { name: 'AMD Ryzen 9 7900X', score: 51238, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7900X&id=5027' },
  { name: 'Intel Core i9-14900K', score: 58254, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717' },
  { name: 'Intel Core i5-14600K', score: 38412, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-14600K&id=5720' },
];
// Case-insensitive index — eD's own titles are ALL-CAPS ("AMD RYZEN 7 7700X"), the curated
// table uses normal title case ("AMD Ryzen 7 7700X"); only the casing differs, same chip.
const CPU_PASSMARK = Object.fromEntries(CPU_PASSMARK_LIST.map((e) => [e.name.toLowerCase(), e]));

function tierFromScore(score) {
  if (score >= 63000) return 'S';
  if (score >= 55000) return 'A';
  if (score >= 45000) return 'B';
  if (score >= 30000) return 'C';
  return 'D';
}

// "AMD RYZEN 7 7700X WOF" -> "AMD Ryzen 7 7700X"; "INTEL Core i9-14900KF" -> "Intel Core i9-14900K"
function baseNameFor(name) {
  let s = name.replace(/\s+WOF$/i, '');
  s = s.replace(/\b(i[3579]-\d{4,5})KF\b/i, '$1K');
  return s;
}

async function main() {
  console.log('=== Step 1: delete cpu/gpu/mobo rows with no picture ===');
  let totalToDelete = 0;
  const toDeleteByCat = {};
  for (const cat of ['cpu', 'gpu', 'mobo']) {
    const { data, error } = await supabase.from('components').select('id,name').eq('category', cat).is('image_url', null);
    if (error) throw new Error(`Failed reading ${cat}: ${error.message}`);
    toDeleteByCat[cat] = data;
    totalToDelete += data.length;
    console.log(`${cat}: ${data.length} rows with no picture`);
  }

  console.log(`\nTotal to delete: ${totalToDelete}`);

  console.log('\n=== Step 2: find cpu rows with a picture but no PassMark that a curated score covers ===');
  const { data: cpuNoScore, error: cpuErr } = await supabase
    .from('components')
    .select('id,name,tier')
    .eq('category', 'cpu')
    .not('image_url', 'is', null)
    .is('passmark', null);
  if (cpuErr) throw new Error(`Failed reading cpu: ${cpuErr.message}`);

  const resolvable = [];
  const unresolved = [];
  for (const row of cpuNoScore) {
    const base = baseNameFor(row.name);
    const ref = CPU_PASSMARK[base.toLowerCase()];
    if (ref) resolvable.push({ ...row, base, score: ref.score, url: ref.url, tier: tierFromScore(ref.score) });
    else unresolved.push(row.name);
  }
  console.log(`Resolvable via curated table: ${resolvable.length}`, JSON.stringify(resolvable.map((r) => ({ name: r.name, base: r.base, score: r.score, tier: r.tier })), null, 2));
  console.log(`No curated match (left untouched):`, JSON.stringify(unresolved, null, 2));

  console.log('\n=== Step 3: gpu/mobo rows with a picture but no PassMark ===');
  const { data: gpuNoScore } = await supabase.from('components').select('id,name').eq('category', 'gpu').not('image_url', 'is', null).is('passmark', null);
  console.log(`gpu: ${gpuNoScore.length} (nothing to backfill here)`);
  console.log(`mobo: PassMark doesn't rate motherboards — not touched, per passmark.ts's own scope.`);

  if (!apply) {
    console.log('\n(dry run — pass --apply to actually delete rows and write PassMark scores)');
    return;
  }

  console.log('\n=== Applying ===');
  for (const cat of ['cpu', 'gpu', 'mobo']) {
    const ids = toDeleteByCat[cat].map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase.from('components').delete().in('id', chunk);
      if (error) console.error(`DELETE FAILED for ${cat} chunk ${i}: ${error.message}`);
    }
    console.log(`Deleted ${ids.length} ${cat} rows.`);
  }

  for (const r of resolvable) {
    const { error } = await supabase.from('components').update({ passmark: r.score, passmark_url: r.url, tier: r.tier }).eq('id', r.id);
    if (error) console.error(`UPDATE FAILED for ${r.name}: ${error.message}`);
    else console.log(`Updated ${r.name} -> passmark=${r.score}, tier=${r.tier}`);
  }

  console.log('\nDone.');
}

await main();
