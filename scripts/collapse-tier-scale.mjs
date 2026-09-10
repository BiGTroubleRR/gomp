// One-time relabel for the tier scale shrinking from S/A/B/C/D to S/A/B (see src/lib/passmark.ts —
// too many distinct labels nudges toward FOMO-driven buying instead of a calm comparison). S and A
// keep their exact old meaning and are left untouched; old B, C, and D all collapse into the new
// floor tier B. Run this BEFORE the schema migration in supabase/schema.sql tightens the tier
// check constraints to ('S','A','B') — that constraint would reject any row still sitting on C/D.
//
// Usage: node --env-file=.env.local scripts/collapse-tier-scale.mjs [--apply]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');
const OLD_TO_NEW = { S: 'S', A: 'A', B: 'B', C: 'B', D: 'B' };
const TABLES = ['components', 'prebuilt_pcs'];

for (const table of TABLES) {
  const { data: rows, error } = await supabase.from(table).select('id,tier');
  if (error) { console.error(`${table}: SELECT failed —`, error.message); continue; }

  const before = {};
  const toUpdate = [];
  for (const row of rows) {
    const tier = row.tier;
    before[tier ?? 'null'] = (before[tier ?? 'null'] ?? 0) + 1;
    if (tier && OLD_TO_NEW[tier] !== tier) toUpdate.push({ id: row.id, from: tier, to: OLD_TO_NEW[tier] });
  }

  console.log(`\n${table}: ${rows.length} rows — before: ${JSON.stringify(before)}`);
  console.log(`${table}: ${toUpdate.length} rows need relabeling (B/C/D → B; S/A untouched)`);

  if (apply) {
    for (const { id, to } of toUpdate) {
      const { error: updErr } = await supabase.from(table).update({ tier: to }).eq('id', id);
      if (updErr) console.error(`${table}: UPDATE failed for ${id} —`, updErr.message);
    }
    const { data: after } = await supabase.from(table).select('tier');
    const afterCounts = {};
    for (const row of after ?? []) afterCounts[row.tier ?? 'null'] = (afterCounts[row.tier ?? 'null'] ?? 0) + 1;
    console.log(`${table}: after: ${JSON.stringify(afterCounts)}`);
  }
}

console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to actually relabel)');
