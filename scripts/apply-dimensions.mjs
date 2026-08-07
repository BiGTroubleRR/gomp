// One-off script: applies the buildcores-matches.json dimension data to the live
// `components` table by name, for the case/gpu/cooler/psu categories. Run once after
// the dimension columns exist on the table.
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const matches = JSON.parse(readFileSync(new URL('./buildcores-matches.json', import.meta.url), 'utf8'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateRow(category, name, patch) {
  const { data, error } = await supabase.from('components').update(patch).eq('category', category).eq('name', name).select('id');
  if (error) {
    console.log('FAIL', category, name, error.message);
    return;
  }
  console.log(data.length ? 'OK  ' : 'MISS', category, name, JSON.stringify(patch));
}

for (const [name, m] of Object.entries(matches.case)) {
  await updateRow('case', name, {
    case_width_mm: m.dimensions_mm.width,
    case_height_mm: m.dimensions_mm.height,
    case_depth_mm: m.dimensions_mm.depth,
    max_gpu_length_mm: m.max_video_card_length,
    max_cooler_height_mm: m.max_cpu_cooler_height,
    max_psu_length_mm: m.max_psu_length,
  });
}

for (const [name, m] of Object.entries(matches.gpu)) {
  await updateRow('gpu', name, { gpu_length_mm: m.length, gpu_slot_width: m.total_slot_width });
}

for (const [name, m] of Object.entries(matches.cooler)) {
  await updateRow('cooler', name, { cooler_height_mm: m.height ?? null, cooler_radiator_mm: m.radiator_size ?? null });
}

for (const [name, m] of Object.entries(matches.psu)) {
  await updateRow('psu', name, { psu_length_mm: m.length });
}
