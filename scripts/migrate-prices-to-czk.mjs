// One-off currency migration: makes CZK (Kč) the site's real, native/stored price currency
// instead of a display-only conversion from a stored EUR number. See src/lib/gomp-storage.ts's
// fmtPrice() (flipped alongside this script) — EUR is now the derived display currency.
//
// - Motherboards/CPUs/GPUs (the eD-imported categories): real Kč prices scraped live from eD
//   systems' own "Vaše cena" (logged in), matched to catalog rows by name using the exact same
//   cleanName() each import script already used. 474/475 mobo, 50/50 cpu, 79/80 gpu matched.
// - Every other component (ram/psu/storage/cooler/case/fan, plus the 2 unmatched cpu/gpu/mobo
//   rows that predate the eD imports) has no real Kč source, so its existing EUR price is
//   rescaled at the same ×24.3 reference rate the site has always quoted.
// - The 4 rows with market_price set, and prebuilt_pcs.price_eur (6 rows, already unused for
//   display but kept consistent for Admin's manual field) get the same ×24.3 rescale.
//
// Explicitly NOT touched: orders, checkout_intents, customer_builds, gbb — historical records of
// what was actually shown/charged in EUR at the time; rescaling them after the fact would
// misrepresent history.
//
// Already run once (--apply, all 800 components + 6 prebuilts updated successfully) — kept as a
// record of the approach, not meant to be re-run. The three mobo_kc.json/cpu_kc.json/gpu_kc.json
// files it reads were scraped into a session-scratch directory that no longer exists; re-running
// this would need fresh real-Kč data re-scraped from eD systems the same way (see the GPU/CPU/
// motherboard import scripts' own name-cleaning functions, reused here for the name-matching).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');
const RATE = 24.3;

const SCRATCH = 'C:/Users/JAKUB~1.GON/AppData/Local/Temp/claude/C--Users-jakub-gondkovsky-OneDrive---CHB-Pictures-GOMP/8dd3fa4d-014b-40da-a32b-cfea32b9a3ad/scratchpad';
const realKcById = new Map([
  ...JSON.parse(readFileSync(`${SCRATCH}/mobo_kc.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${SCRATCH}/cpu_kc.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${SCRATCH}/gpu_kc.json`, 'utf8')),
]);

async function main() {
  console.log(`Real eD Kč prices loaded for ${realKcById.size} components.`);

  const { data: allComponents, error: compErr } = await supabase.from('components').select('id,name,category,price,market_price');
  if (compErr) throw new Error(compErr.message);

  const componentUpdates = [];
  let realCount = 0;
  let estimatedCount = 0;
  for (const row of allComponents) {
    if (realKcById.has(row.id)) {
      componentUpdates.push({ id: row.id, price: realKcById.get(row.id) });
      realCount++;
    } else {
      componentUpdates.push({ id: row.id, price: Math.round(row.price * RATE) });
      estimatedCount++;
    }
    if (row.market_price != null) {
      componentUpdates[componentUpdates.length - 1].market_price = Math.round(row.market_price * RATE);
    }
  }
  console.log(`components: ${realCount} real eD prices, ${estimatedCount} rescaled ×${RATE} (of ${allComponents.length} total).`);
  console.log('Sample real:', JSON.stringify(componentUpdates.filter((u) => realKcById.has(u.id)).slice(0, 3)));
  console.log('Sample estimated:', JSON.stringify(componentUpdates.filter((u) => !realKcById.has(u.id)).slice(0, 3)));

  const { data: prebuilts, error: preErr } = await supabase.from('prebuilt_pcs').select('id,name,price_eur');
  if (preErr) throw new Error(preErr.message);
  const prebuiltUpdates = prebuilts.map((p) => ({ id: p.id, price_eur: Math.round(p.price_eur * RATE) }));
  console.log(`prebuilt_pcs: ${prebuiltUpdates.length} rows rescaled ×${RATE}.`);
  console.log(JSON.stringify(prebuiltUpdates.map((u, i) => ({ name: prebuilts[i].name, was: prebuilts[i].price_eur, now: u.price_eur })), null, 2));

  if (!apply) {
    console.log('\n(dry run — pass --apply to actually write these prices)');
    return;
  }

  console.log('\n=== Applying components ===');
  let done = 0;
  for (const u of componentUpdates) {
    const { id, ...fields } = u;
    const { error } = await supabase.from('components').update(fields).eq('id', id);
    if (error) console.error(`UPDATE FAILED for ${id}: ${error.message}`);
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${componentUpdates.length}...`);
  }
  console.log(`Updated ${done} components.`);

  console.log('\n=== Applying prebuilt_pcs ===');
  for (const u of prebuiltUpdates) {
    const { error } = await supabase.from('prebuilt_pcs').update({ price_eur: u.price_eur }).eq('id', u.id);
    if (error) console.error(`UPDATE FAILED for prebuilt ${u.id}: ${error.message}`);
  }
  console.log(`Updated ${prebuiltUpdates.length} prebuilts.`);

  console.log('\nDone.');
}

await main();
