// Deep links into secondhand marketplaces for a Budget Build request — deliberately just URL
// construction, not scraping. Facebook Marketplace's ToS explicitly prohibits automated data
// collection (and Meta pursues this legally/technically), and Bazoš's terms are the same kind of
// "no automated access" as most classifieds sites — so this hands the admin a ready-to-click
// search instead of fetching/parsing results on their behalf. A human opening these in a browser
// is just... browsing normally.
export type MarketplaceLink = { label: string; url: string };

export function marketplaceSearchLinks(term: string): MarketplaceLink[] {
  const q = term.trim();
  if (!q) return [];
  const encoded = encodeURIComponent(q);
  return [
    { label: 'Bazoš.cz', url: `https://www.bazos.cz/search.php?hledat=${encoded}` },
    { label: 'Bazoš.sk', url: `https://www.bazos.sk/search.php?hledat=${encoded}` },
    { label: 'Facebook Marketplace', url: `https://www.facebook.com/marketplace/search/?query=${encoded}` },
  ];
}
