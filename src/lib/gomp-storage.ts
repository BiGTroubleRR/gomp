export type Lang = 'en' | 'sk' | 'cz';
export type Currency = 'eur' | 'czk';

const LANG_KEY = 'gomp_lang';
const CURRENCY_KEY = 'gomp_currency';

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'sk';
  try {
    return (localStorage.getItem(LANG_KEY) as Lang) || 'sk';
  } catch {
    return 'sk';
  }
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
export function fmtPrice(czk: number, currency: Currency): string {
  if (currency === 'eur') {
    const eur = Math.round(czk / 24.3);
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
