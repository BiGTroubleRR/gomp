// Refreshes src/lib/passmark.ts's hardcoded GPU/CPU score tables against PassMark's own public
// charts (videocardbenchmark.net/high_end_gpus.html, cpubenchmark.net/multithread/) — both plain,
// fully server-rendered HTML, confirmed by a direct fetch before writing this script. No
// HTML-parsing library, matching this repo's existing scraper scripts (scripts/fetch-edsystem-gpu-
// dims.mjs, scripts/check-edsystem-gpu-availability.mjs): plain fetch() + regex, no dependencies.
//
// Unlike those scripts, this one never touches Supabase — passmark.ts is a code file, not a
// database table, so "applying" the refresh just means rewriting that one file's literals.
//
// Matching is anchored on PassMark's own numeric id (the `&id=NNNN` already embedded in each
// entry's stored `url`), never on the display name — a name can drift ("SUPER" capitalization,
// "GeForce" prefix wording) but the id is stable, and it's independent of this table's own
// GOMP-catalog-specific `names: [...]` aliases (e.g. 'NVIDIA RTX 5090 FE'), which a scraper has no
// way to reconstruct from PassMark's data alone and this script never touches.
//
// Only rewrites `score`/`url` on entries that already exist here, and only if something actually
// changed. Never adds or removes an entry automatically — a genuinely new top-25 part needs a
// human to write its GOMP-catalog name aliases, so new candidates are only reported.
import { readFileSync, writeFileSync } from 'fs';

const PASSMARK_TS_URL = new URL('../src/lib/passmark.ts', import.meta.url);
const dryRun = process.argv.includes('--dry-run');

const SOURCES = [
  { kind: 'gpu', domain: 'videocardbenchmark.net', listPath: '/high_end_gpus.html' },
  { kind: 'cpu', domain: 'cpubenchmark.net', listPath: '/multithread/' },
];

// PassMark's raw charts mix in workstation/datacenter cards, non-x86 chips, mobile parts, and
// outright junk (a capture-card "HDMI Adapter" has genuinely shown up on the GPU chart) — a
// blacklist alone chases an unbounded list of one-off garbage, so both filters start from a
// whitelist of real consumer desktop naming and only then exclude regional/mobile variants of
// those. This only affects the informational "new candidates" report below, never the id-anchored
// score refresh above, so getting it slightly wrong here is low-stakes by design.
const GPU_WHITELIST = /^(GeForce (RTX|GTX)|Radeon RX|Intel Arc)\s/i;
const GPU_EXCLUDE = /\blaptop\b|\bmax-?q\b|\bmobile\b|\sd(\s*v\d+)?$/i;
const CPU_WHITELIST = /^(AMD Ryzen \d|Intel Core (i\d-|Ultra \d))/i;
const CPU_EXCLUDE = /\bpro\b|hx\d*d?\b|\bhs\b|\bplus\b|\blaptop\b|\bmobile\b/i;

async function fetchList(source) {
  const res = await fetch(`https://www.${source.domain}${source.listPath}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`${source.domain}: HTTP ${res.status}`);
  const html = await res.text();
  return parseRows(html, source);
}

function parseRows(html, source) {
  const byId = new Map();
  const ordered = [];
  // Every ranked entry starts with `<li id="rkNNNN">` on both sites — splitting on that marker
  // and regexing each resulting chunk is simpler and safer than one big cross-row regex over a
  // 700KB+ page.
  const chunks = html.split('<li id="rk');
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const idMatch = chunk.match(/^(\d+)"/);
    const nameMatch = chunk.match(/<span class="prdname"[^>]*>([^<]+)<\/span>/);
    const scoreMatch = chunk.match(/<span class="count">([\d,]+)<\/span>/);
    const hrefMatch = chunk.match(/href="\/?((?:gpu|cpu)\.php\?[^"]+)"/);
    if (!idMatch || !nameMatch || !scoreMatch || !hrefMatch) continue;
    const id = idMatch[1];
    if (byId.has(id)) continue; // both sites repeat the same row in more than one chart widget
    const entry = {
      id,
      name: nameMatch[1].trim(),
      score: Number(scoreMatch[1].replace(/,/g, '')),
      url: `https://www.${source.domain}/${hrefMatch[1].replace(/&amp;/g, '&')}`,
    };
    byId.set(id, entry);
    ordered.push(entry);
  }
  return { byId, ordered };
}

function cleanTop25(ordered, whitelistRe, excludeRe) {
  return ordered.filter((e) => whitelistRe.test(e.name) && !excludeRe.test(e.name)).slice(0, 25);
}

async function main() {
  const results = {};
  for (const source of SOURCES) {
    results[source.kind] = await fetchList(source);
    if (results[source.kind].ordered.length < 25) {
      throw new Error(`${source.domain}: only parsed ${results[source.kind].ordered.length} rows — page structure may have changed`);
    }
    // polite delay between the two requests, matching this repo's existing scraper convention
    await new Promise((r) => setTimeout(r, 150));
  }

  const passmarkTs = readFileSync(PASSMARK_TS_URL, 'utf8');
  const entryRe = /\{ score: (\d+), url: '([^']+)', names: (\[[^\]]*\]) \}/g;

  let changedCount = 0;
  const changed = [];
  const notFound = [];
  const trackedIds = { gpu: new Set(), cpu: new Set() };

  const updatedTs = passmarkTs.replace(entryRe, (full, scoreStr, url, namesLiteral) => {
    const domain = url.includes('cpubenchmark.net') ? 'cpu' : 'gpu';
    const idMatch = url.match(/[?&]id=(\d+)/);
    if (!idMatch) return full; // shouldn't happen — leave untouched rather than guess
    const id = idMatch[1];
    trackedIds[domain].add(id);
    const fresh = results[domain].byId.get(id);
    if (!fresh) {
      notFound.push({ domain, id, url });
      return full;
    }
    const oldScore = Number(scoreStr);
    if (fresh.score === oldScore && fresh.url === url) return full; // no change
    changedCount++;
    changed.push({ domain, id, name: fresh.name, oldScore, newScore: fresh.score });
    return `{ score: ${fresh.score}, url: '${fresh.url}', names: ${namesLiteral} }`;
  });

  const newCandidates = [];
  for (const kind of ['gpu', 'cpu']) {
    const whitelistRe = kind === 'gpu' ? GPU_WHITELIST : CPU_WHITELIST;
    const excludeRe = kind === 'gpu' ? GPU_EXCLUDE : CPU_EXCLUDE;
    const top25 = cleanTop25(results[kind].ordered, whitelistRe, excludeRe);
    for (const entry of top25) {
      if (!trackedIds[kind].has(entry.id)) newCandidates.push({ kind, ...entry });
    }
  }

  console.log(`Checked ${trackedIds.gpu.size} tracked GPU + ${trackedIds.cpu.size} tracked CPU entries against live PassMark data.`);

  if (changed.length) {
    console.log(`\n${changed.length} score(s) changed:`);
    for (const c of changed) console.log(`  [${c.domain}] ${c.name} (id ${c.id}): ${c.oldScore.toLocaleString()} -> ${c.newScore.toLocaleString()}`);
  }
  if (notFound.length) {
    console.log(`\n${notFound.length} tracked entry(ies) NOT found in the current chart (may have been delisted/re-ranked off the page — verify manually):`);
    for (const n of notFound) console.log(`  [${n.domain}] id ${n.id} — ${n.url}`);
  }
  if (newCandidates.length) {
    console.log(`\n${newCandidates.length} untracked part(s) currently in the clean top 25 (reported only — add manually with GOMP catalog name aliases if wanted):`);
    for (const n of newCandidates) console.log(`  [${n.kind}] ${n.name} — ${n.score.toLocaleString()} — ${n.url}`);
  }

  if (!changed.length) {
    console.log('\nNo changes — passmark.ts is already current.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const finalTs = updatedTs.replace(/export const PASSMARK_UPDATED = '[^']+';/, `export const PASSMARK_UPDATED = '${today}';`);

  if (dryRun) {
    console.log(`\n(dry run — pass without --dry-run to write these ${changed.length} change(s) and bump PASSMARK_UPDATED to ${today})`);
    return;
  }

  writeFileSync(PASSMARK_TS_URL, finalTs);
  console.log(`\nWrote ${changed.length} change(s) to src/lib/passmark.ts and bumped PASSMARK_UPDATED to ${today}.`);
}

main().catch((err) => {
  console.error('refresh-passmark failed:', err.message);
  process.exit(1);
});
