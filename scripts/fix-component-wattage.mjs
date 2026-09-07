// One-off data backfill: the app has no separate wattage column — every component's power draw
// is parsed live out of its own `specs` display string (see extractWatts, src/lib/
// component-db-seed.ts:224-227), deliberately, so the number shown to a shopper and the number
// used for PSU sizing can never drift apart. The eD GPU import (scripts/import-edsystem-gpus.mjs)
// never had a wattage figure to put there — eD's GPU listing cards don't expose power draw the
// way they exposed CPU TDP — so 79 of 80 newly-imported GPU rows silently contribute 0W to every
// PSU-sizing estimate in /build and auto-build.ts. 14 of 50 CPU rows have the same gap (eD's own
// listing had no inline TDP for those specific SKUs at scrape time).
//
// This appends the real, publicly published reference TDP to each affected row's existing specs
// string — an append, not a rewrite, since every affected row's specs already has its
// capacity/memory-type (GPU) or is a bare socket fallback (CPU). A handful of fictional/future
// SKUs (Intel Core Ultra "... Plus") have no confirmed real TDP and are left untouched and
// reported, not guessed at.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

function extractWatts(specs) {
  const m = (specs || '').match(/(\d+)\s?W\b/);
  return m ? Number(m[1]) : null;
}

// NVIDIA's published reference-board TDP (TBP) for each Blackwell RTX 50-series chip. 575W for
// the 5090 already matches the pre-existing curated "NVIDIA RTX 5090 FE" row's own specs exactly
// — the cross-check that these figures are right.
const GPU_TDP = {
  'RTX 5060': 145,
  'RTX 5060 Ti': 180,
  'RTX 5070': 250,
  'RTX 5070 Ti': 300,
  'RTX 5080': 360,
  'RTX 5090': 575,
};
// Mirrors the chip-extraction regex proven in import-edsystem-gpus.mjs.
const CHIP_RE = /RTX\s?(40|50)(\d0)(?:\s?(Ti\s?Super|Super|Ti))?/i;
function chipFor(name) {
  const m = name.match(CHIP_RE);
  if (!m) return null;
  const num = m[1] + m[2];
  let suf = '';
  if (m[3]) {
    const s = m[3].toLowerCase().replace(/\s+/g, ' ');
    if (s === 'ti super') suf = ' Ti Super';
    else if (s === 'super') suf = ' Super';
    else if (s === 'ti') suf = ' Ti';
  }
  return `RTX ${num}${suf}`;
}

// Real published TDP for each resolvable CPU. Keyed by the exact stored name (case matters —
// the DB itself has an "INTEL"/"Intel" casing inconsistency from two different import passes).
const CPU_TDP = {
  'AMD RYZEN 7 7700X WOF': 105,
  'AMD RYZEN 9 7900X WOF': 170,
  'AMD RYZEN 5 7600X WOF': 105,
  'AMD Ryzen 5 7400': 65,
  'AMD RYZEN 7 9850X3D': 120,
  'AMD Ryzen 5 7500X3D': 65,
  'INTEL Core i9-14900KF': 125,
  'INTEL Core i9-14900F': 65,
  'INTEL Core i5-14600KF': 125,
  'INTEL Core i5-12400F': 65,
  'INTEL Core i3-14100F': 58,
};

async function main() {
  console.log('=== GPU: rows missing a wattage token ===');
  const { data: gpus, error: gpuErr } = await supabase.from('components').select('id,name,specs').eq('category', 'gpu');
  if (gpuErr) throw new Error(gpuErr.message);
  const gpuMissing = gpus.filter((r) => extractWatts(r.specs) == null);
  console.log(`${gpuMissing.length}/${gpus.length} gpu rows missing wattage.`);

  const gpuUpdates = [];
  const gpuUnresolved = [];
  for (const row of gpuMissing) {
    const chip = chipFor(row.name);
    const tdp = chip ? GPU_TDP[chip] : undefined;
    if (tdp == null) {
      gpuUnresolved.push(row.name);
      continue;
    }
    gpuUpdates.push({ id: row.id, name: row.name, newSpecs: `${row.specs} · ${tdp}W · PCIe 5.0` });
  }
  console.log(`Resolvable: ${gpuUpdates.length}. Unresolved (no chip match, left as-is): ${gpuUnresolved.length}`, JSON.stringify(gpuUnresolved));
  console.log('Sample:', JSON.stringify(gpuUpdates.slice(0, 3), null, 2));

  console.log('\n=== CPU: rows missing a wattage token ===');
  const { data: cpus, error: cpuErr } = await supabase.from('components').select('id,name,specs').eq('category', 'cpu');
  if (cpuErr) throw new Error(cpuErr.message);
  const cpuMissing = cpus.filter((r) => extractWatts(r.specs) == null);
  console.log(`${cpuMissing.length}/${cpus.length} cpu rows missing wattage.`);

  const cpuUpdates = [];
  const cpuUnresolved = [];
  for (const row of cpuMissing) {
    const tdp = CPU_TDP[row.name];
    if (tdp == null) {
      cpuUnresolved.push(row.name);
      continue;
    }
    cpuUpdates.push({ id: row.id, name: row.name, newSpecs: `${row.specs} · ${tdp}W` });
  }
  console.log(`Resolvable: ${cpuUpdates.length}. No confirmed TDP — left as-is: ${cpuUnresolved.length}`, JSON.stringify(cpuUnresolved));
  console.log('Sample:', JSON.stringify(cpuUpdates.slice(0, 3), null, 2));

  if (!apply) {
    console.log('\n(dry run — pass --apply to actually write these specs changes)');
    return;
  }

  console.log('\n=== Applying ===');
  for (const u of [...gpuUpdates, ...cpuUpdates]) {
    const { error } = await supabase.from('components').update({ specs: u.newSpecs }).eq('id', u.id);
    if (error) console.error(`UPDATE FAILED for ${u.name}: ${error.message}`);
    else console.log(`Updated ${u.name} -> "${u.newSpecs}"`);
  }
  console.log('\nDone.');
}

await main();
