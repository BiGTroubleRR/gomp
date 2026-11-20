export type Lang = 'en' | 'sk' | 'cz';
export type Currency = 'eur' | 'czk';

const LANG_KEY = 'gomp_lang';
const CURRENCY_KEY = 'gomp_currency';

// The two storefront domains each have their own default language: gomp.cz is Czech, gomp.sk is Slovak. Any other
// host (the vercel.app address, localhost) has no default of its own. Accepts a Host header value or a hostname.
export function langForHost(host: string | null | undefined): Lang | null {
  const h = (host ?? '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  if (h === 'gomp.cz') return 'cz';
  if (h === 'gomp.sk') return 'sk';
  return null;
}

// What the visitor picked themselves (language switch) wins; otherwise the domain decides; otherwise Slovak.
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'sk';
  try {
    return (localStorage.getItem(LANG_KEY) as Lang) || langForHost(window.location.hostname) || 'sk';
  } catch {
    return langForHost(window.location.hostname) || 'sk';
  }
}

// On the two storefront domains, picking Czech or Slovak moves the visitor to the matching domain (gomp.cz / gomp.sk),
// on the same page. Returns the URL to go to, or null when no move is needed (English, an unrelated host such as the
// vercel.app address or localhost, or already on the right domain). The www prefix of the current host is kept.
export function langRedirectUrl(lang: Lang): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  const base = host.replace(/^www\./, '');
  if (base !== 'gomp.cz' && base !== 'gomp.sk') return null;
  const wanted = lang === 'cz' ? 'gomp.cz' : lang === 'sk' ? 'gomp.sk' : null;
  if (!wanted || wanted === base) return null;
  const { protocol, pathname, search, hash } = window.location;
  return `${protocol}//${host.startsWith('www.') ? 'www.' : ''}${wanted}${pathname}${search}${hash}`;
}

// Forget a stored choice (used just before moving to the other domain, so the old domain does not keep a language that
// no longer matches it).
export function clearStoredLang() {
  try {
    localStorage.removeItem(LANG_KEY);
  } catch {}
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export function getCurrency(): Currency {
  if (typeof window === 'undefined') return 'czk';
  try {
    return (localStorage.getItem(CURRENCY_KEY) as Currency) || 'czk';
  } catch {
    return 'czk';
  }
}

export function setCurrency(currency: Currency) {
  try {
    localStorage.setItem(CURRENCY_KEY, currency);
  } catch {}
}

// Prices are stored/native in CZK (Kč) — every Component.price/Build.price number is a real
// koruna amount (sourced directly from eD systems for cpu/gpu/mobo). EUR is the derived display
// currency, converted at the same reference rate GOMP has always quoted (1 € ≈ 24.30 Kč). The
// number and currency symbol are joined with a non-breaking space, not a plain one, so the pair
// can never wrap onto separate lines at narrow widths (a plain space let the symbol drop onto
// its own line mid-resize, which read as the currency sign "jumping around").
export const CZK_PER_EUR = 24.3;
export function fmtPrice(czk: number, currency: Currency): string {
  if (currency === 'eur') {
    const eur = Math.round(czk / CZK_PER_EUR);
    return eur.toLocaleString('sk-SK') + ' €';
  }
  return czk.toLocaleString('cs-CZ') + ' Kč';
}

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
