import './ts-resolve-hook.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { normalizeText, matchesQuery, searchComponents, compatibleCandidates, budgetCapFor, applyBudgetCap, priceGross } =
  await import('./build-filter.ts');

const VAT = 21;
const c = (category, name, price, extra = {}) => ({ id: name, category, name, price, specs: '', ...extra });

const catalog = {
  cpu: [c('cpu', 'Ryzen 5 7600', 100, { socket: 'AM5' }), c('cpu', 'Ryzen 9 9950X', 600, { socket: 'AM5' }), c('cpu', 'Core i5', 90, { socket: 'LGA1700' })],
  gpu: [c('gpu', 'RTX 5060', 300), c('gpu', 'RTX 5080 Gigabyte', 1000)],
  ram: [c('ram', 'Kingston 16GB', 50, { ramGeneration: 5, ramSpeedMhz: 6400 })],
  mobo: [c('mobo', 'B650', 120, { socket: 'AM5' }), c('mobo', 'B760', 110, { socket: 'LGA1700' })],
  cooler: [c('cooler', 'Air', 30)],
  storage: [c('storage', 'SSD 1TB', 60)],
  psu: [c('psu', 'PSU 750', 80)],
  case: [c('case', 'Case A', 70)],
};

test('normalizeText drops accents and case', () => {
  assert.equal(normalizeText('Skriňa ČERNÁ'), 'skrina cerna');
});

test('matchesQuery is multi-word, order-free, accent-insensitive', () => {
  assert.ok(matchesQuery(catalog.gpu[1], 'gigabyte rtx 5080'));
  assert.ok(!matchesQuery(catalog.gpu[0], 'gigabyte'));
  assert.ok(matchesQuery(catalog.ram[0], 'ddr5 6400'));
  assert.ok(matchesQuery(catalog.cpu[0], ''));
});

test('searchComponents filters and passes through on empty query', () => {
  assert.equal(searchComponents(catalog.cpu, 'ryzen').length, 2);
  assert.equal(searchComponents(catalog.cpu, '  ').length, 3);
});

test('compatibleCandidates follows the picked board socket', () => {
  const out = compatibleCandidates('cpu', catalog, { mobo: catalog.mobo[0] });
  assert.deepEqual(out.map((x) => x.name), ['Ryzen 5 7600', 'Ryzen 9 9950X']);
});

test('budgetCapFor reserves the cheapest part of every empty slot', () => {
  const gross = (n) => priceGross({ price: n }, VAT);
  // nothing picked: budget − cheapest of the other 7 slots (cpu 90 is cheapest cpu; mobo 110)
  const others = [110, 90, 30, 50, 300, 60, 80, 70].filter((_, i) => i !== 1); // minus the cpu slot's own
  const reserve = others.reduce((a, n) => a + gross(n), 0);
  const cap = budgetCapFor('cpu', { budgetGross: 5000, catalog, picks: {}, vatRatePct: VAT });
  assert.ok(Math.abs(cap - (5000 - reserve)) < 1e-6);
});

test('budgetCapFor counts picked parts instead of reserving for them', () => {
  const picks = { gpu: catalog.gpu[1] };
  const withPick = budgetCapFor('cpu', { budgetGross: 5000, catalog, picks, vatRatePct: VAT });
  const without = budgetCapFor('cpu', { budgetGross: 5000, catalog, picks: {}, vatRatePct: VAT });
  assert.ok(withPick < without); // the 1000 gpu costs more than the reserved 300
});

test('applyBudgetCap hides the over-cap parts but keeps the picked one', () => {
  const cap = priceGross(catalog.cpu[0], VAT);
  const r = applyBudgetCap(catalog.cpu, cap, VAT);
  assert.deepEqual(r.shown.map((x) => x.name), ['Ryzen 5 7600', 'Core i5']);
  assert.equal(r.hidden, 1);
  const kept = applyBudgetCap(catalog.cpu, cap, VAT, (x) => x.name === 'Ryzen 9 9950X');
  assert.equal(kept.hidden, 0);
});
