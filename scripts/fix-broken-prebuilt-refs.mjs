// One-off fix: cleanup-imageless-components.mjs deleted every no-picture cpu/gpu/mobo row,
// which happened to include several components still referenced by live prebuilt_pcs rows —
// the plain "NVIDIA RTX 4090"/"AMD Ryzen 9 9950X"/Z790 boards were part of the original
// hand-typed seed data that never had a real photo, and no later eD import happened to cover
// an exact replacement (the GPU import only covered RTX 50-series, since that's all eD had in
// stock; several Z790/flagship CPU SKUs simply aren't stocked by eD at all).
//
// Per Jakub's direction, this re-points each broken slot to the closest equivalent that DOES
// exist in the catalog today (same silicon where possible for CPU — a "KF" no-iGPU variant is
// functionally identical to the "K" it replaces — and the nearest RTX 50-series tier for GPU/
// the best available LGA1700 board for motherboard, since Z790 no longer exists at all). Every
// prebuilt whose customer-facing name encodes its GPU model is renamed to match what it now
// actually ships with, so the storefront never advertises a chip it doesn't contain.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const FIXES = [
  {
    match: 'GOMP_FLGSHP_5090',
    changes: { cpu: 'AMD Ryzen 9 9900X3D' }, // was AMD Ryzen 9 9950X (no longer in the catalog at all)
  },
  {
    match: 'GOMP_4090_i9',
    changes: {
      name: 'GOMP_5080_i9',
      gpu: 'MSI GeForce RTX 5080 16G GAMING TRIO OC GDDR7', // was NVIDIA RTX 4090
      mobo: 'ASUS PRO WS W680-ACE', // was MSI MPG Z790 CARBON WIFI (Z790 no longer exists)
      cpu: 'INTEL Core i9-14900KF', // was Intel Core i9-14900K (K-only die no longer stocked, KF is the same silicon minus iGPU)
    },
  },
  {
    match: 'GOMP_4080S_i9',
    changes: {
      name: 'GOMP_5070Ti_i9',
      gpu: 'ASUS GeForce RTX 5070 Ti TUF GAMING 16GB OC GDDR7', // was NVIDIA RTX 4080 Super
      mobo: 'ASUS TUF GAMING H770-PRO WIFI', // was Gigabyte Z790 AORUS ELITE AX
      cpu: 'INTEL Core i9-14900KF', // was Intel Core i9-14900K
    },
  },
  {
    match: 'GOMP_4070TiS_i7',
    changes: {
      name: 'GOMP_5070_i7',
      gpu: 'MSI GeForce RTX 5070 12G GAMING TRIO OC GDDR7', // was NVIDIA RTX 4070 Ti Super
      mobo: 'ASRock B760M STEEL LEGEND WIFI', // was Gigabyte B760M GAMING WIFI DDR5 Micro ATX (same eD import, that specific row just never got an image)
      cpu: 'Intel Core i7-14700KF', // was Intel Core i7-14700K
    },
  },
  {
    match: 'GOMP_4070S_i5',
    changes: {
      name: 'GOMP_5060Ti_i5',
      gpu: 'ASUS GeForce RTX 5060 Ti DUAL OC 16G GDDR7', // was NVIDIA RTX 4070 Super
      mobo: 'GIGABYTE B760M DS3H GEN5', // was MAXSUN B760 iCraft B760M CROSS LGA1700 DDR5 Micro ATX
      cpu: 'INTEL Core i5-14600KF', // was Intel Core i5-14600K
    },
  },
  {
    match: 'GOMP_BGT_4070',
    changes: {
      name: 'GOMP_BGT_5060',
      gpu: 'ASUS GeForce RTX 5060 DUAL OC 8G GDDR7', // was NVIDIA RTX 4070
      mobo: 'ASRock B760M-H2/M.2', // was ASRock B760M-H2/M.2 DDR5 Micro ATX (same board, that exact row just never got an image)
      cpu: 'INTEL Core i5-14600KF', // was Intel Core i5-14600K
    },
  },
];

async function verifyReplacementsExist() {
  const names = new Set();
  FIXES.forEach((f) => {
    ['mobo', 'cpu', 'gpu'].forEach((slot) => {
      if (f.changes[slot]) names.add(f.changes[slot]);
    });
  });
  const { data, error } = await supabase.from('components').select('name,category,image_url').in('name', [...names]);
  if (error) throw new Error(error.message);
  const found = new Map(data.map((r) => [r.name, r]));
  let ok = true;
  names.forEach((n) => {
    const row = found.get(n);
    if (!row) {
      console.error(`MISSING from catalog: "${n}"`);
      ok = false;
    } else if (!row.image_url) {
      console.error(`No picture (would recreate the exact same problem): "${n}"`);
      ok = false;
    }
  });
  return ok;
}

async function main() {
  console.log('=== Verifying every replacement component actually exists and has a picture ===');
  const ok = await verifyReplacementsExist();
  if (!ok) throw new Error('Aborting — fix the FIXES table above before proceeding.');
  console.log('All replacements verified.\n');

  console.log('=== Planned changes ===');
  for (const fix of FIXES) {
    console.log(`${fix.match}:`, JSON.stringify(fix.changes));
  }

  if (!apply) {
    console.log('\n(dry run — pass --apply to actually write these changes)');
    return;
  }

  console.log('\n=== Applying ===');
  for (const fix of FIXES) {
    const { error } = await supabase.from('prebuilt_pcs').update(fix.changes).eq('name', fix.match);
    if (error) console.error(`UPDATE FAILED for ${fix.match}: ${error.message}`);
    else console.log(`Updated ${fix.match}${fix.changes.name ? ` -> ${fix.changes.name}` : ''}`);
  }
  console.log('\nDone.');
}

await main();
