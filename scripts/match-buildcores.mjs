// One-off script: matches GOMP's existing components against the buildcores-open-db
// dataset (downloaded+extracted to a scratch dir) and prints ONE chosen real-dimension
// record per item for review. Not part of the app — run manually, eyeball the output,
// then hand-apply via update-dimensions.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

function normalize(s) {
  return (s || '')
    .toUpperCase()
    .replace(/[®™]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
function tokens(s) {
  return new Set(normalize(s).split(' ').filter(Boolean));
}
function loadCategory(cat) {
  const dir = `${OPEN_DB}/${cat}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
function score(gompTokens, candidateName) {
  const cTokens = tokens(candidateName);
  let hits = 0;
  gompTokens.forEach((t) => {
    if (cTokens.has(t)) hits++;
  });
  // Penalize candidates with lots of extra tokens beyond the GOMP name (e.g. "Compact",
  // long color/port descriptions) so a closer, plainer name match wins ties.
  return hits - cTokens.size * 0.02;
}
function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function pickCase(gompName, candidates) {
  const gTokens = tokens(gompName);
  const scored = candidates
    .map((c) => ({ c, s: score(gTokens, c.metadata?.name || '') }))
    .filter((x) => x.c.dimensions_mm?.width && x.c.dimensions_mm?.height && x.c.dimensions_mm?.depth)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) return null;
  const top = scored[0].c;
  return {
    matchedName: top.metadata?.name,
    dimensions_mm: top.dimensions_mm,
    max_video_card_length: top.max_video_card_length ?? null,
    max_cpu_cooler_height: top.max_cpu_cooler_height ?? null,
    max_psu_length: top.max_psu_length ?? null,
    volume: top.volume ?? null,
  };
}

function pickGpu(gompName, candidates) {
  const gTokens = tokens(gompName);
  const scored = candidates
    .map((c) => ({ c, s: score(gTokens, c.metadata?.name || '') }))
    .filter((x) => typeof x.c.length === 'number');
  if (!scored.length) return null;
  const maxScore = Math.max(...scored.map((x) => Math.round(x.s)));
  const tier = scored.filter((x) => Math.round(x.s) === maxScore);
  const lengths = tier.map((x) => x.c.length);
  const slots = tier.map((x) => x.c.total_slot_width).filter((n) => typeof n === 'number' && n > 0);
  return {
    matchedFrom: `${tier.length} card(s) at score ${maxScore}, e.g. "${tier[0].c.metadata?.name}"`,
    length: Math.round(median(lengths)),
    total_slot_width: slots.length ? Math.round(median(slots) * 10) / 10 : null,
  };
}

function pickSingle(gompName, candidates, fields) {
  const gTokens = tokens(gompName);
  const scored = candidates.map((c) => ({ c, s: score(gTokens, c.metadata?.name || '') })).sort((a, b) => b.s - a.s);
  const withData = scored.find((x) => fields.some((f) => x.c[f] != null));
  const top = withData?.c || scored[0]?.c;
  if (!top) return null;
  const out = { matchedName: top.metadata?.name };
  fields.forEach((f) => (out[f] = top[f] ?? null));
  return out;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows } = await supabase.from('components').select('category,name').order('category');

const result = { case: {}, gpu: {}, cooler: {}, psu: {} };

const caseCandidates = loadCategory('PCCase');
rows.filter((r) => r.category === 'case').forEach((r) => {
  result.case[r.name] = pickCase(r.name, caseCandidates);
});

const gpuCandidates = loadCategory('GPU');
rows.filter((r) => r.category === 'gpu').forEach((r) => {
  result.gpu[r.name] = pickGpu(r.name, gpuCandidates);
});

const coolerCandidates = loadCategory('CPUCooler');
rows.filter((r) => r.category === 'cooler').forEach((r) => {
  result.cooler[r.name] = pickSingle(r.name, coolerCandidates, ['height', 'radiator_size', 'water_cooled']);
});

const psuCandidates = loadCategory('PSU');
rows.filter((r) => r.category === 'psu').forEach((r) => {
  result.psu[r.name] = pickSingle(r.name, psuCandidates, ['length', 'form_factor']);
});

console.log(JSON.stringify(result, null, 2));
writeFileSync(new URL('./buildcores-matches.json', import.meta.url), JSON.stringify(result, null, 2));
