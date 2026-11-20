import './ts-resolve-hook.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { catalogGrossPrice, DOUBLE_KIT_SUFFIX } = await import('./checkout-pricing.ts');

const catalog = new Map([
  ['Ryzen 5 7600', { price: 100, sitePrice: null }],
  ['RTX 5060', { price: 300, sitePrice: 400 }], // manual site price wins over net + VAT
  ['Kingston 16GB', { price: 51, sitePrice: null }],
  ['Corsair 32GB', { price: 80, sitePrice: 120 }],
]);

test('a catalog item costs net + VAT, or its own site price when set', () => {
  assert.equal(catalogGrossPrice('Ryzen 5 7600', catalog, 21), 121);
  assert.equal(catalogGrossPrice('RTX 5060', catalog, 21), 400);
});

test('a name that is not in the catalog is refused, whatever the browser claims', () => {
  assert.equal(catalogGrossPrice('does-not-exist', catalog, 21), null);
  assert.equal(catalogGrossPrice('', catalog, 21), null);
});

test('the configurator\'s "(2× kits)" RAM bundle is priced from its base kit, doubled', () => {
  assert.equal(catalogGrossPrice('Kingston 16GB' + DOUBLE_KIT_SUFFIX, catalog, 21), 123); // round(51 * 2) = 102 net -> 123 gross (same maths as the screen)
  assert.equal(catalogGrossPrice('Corsair 32GB' + DOUBLE_KIT_SUFFIX, catalog, 21), 240); // an override is per kit
});

test('a "(2× kits)" name whose base kit is unknown is refused', () => {
  assert.equal(catalogGrossPrice('Nothing' + DOUBLE_KIT_SUFFIX, catalog, 21), null);
});
