'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Currency, Lang, clearStoredLang, fmtPrice, getCurrency, getLang, langRedirectUrl, setCurrency as persistCurrency, setLang as persistLang } from '@/lib/gomp-storage';
import { applyVat } from '@/lib/component-db-seed';
import { DEFAULT_VAT_RATE_PCT, fetchStoreSettings } from '@/lib/supabase/store-settings';

type SiteContextValue = {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  fmt: (czk: number) => string;
  // The live VAT rate (%, e.g. 21) — defaults to DEFAULT_VAT_RATE_PCT until the shared
  // store_settings row loads, so pricing never flashes an un-taxed number first.
  vatRatePct: number;
  // Every stored price is pre-tax (see applyVat's own comment) — this is the one conversion
  // every customer-facing price display should go through; fmt itself stays raw/untaxed, used
  // by Admin to show the pre-tax figure alongside this one.
  fmtGross: (netCzk: number) => string;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children, initialLang = 'sk' }: { children: React.ReactNode; initialLang?: Lang }) {
  // Defaults match the original site's getLang()/getCurrency() fallbacks. Real values are
  // adopted from localStorage on mount (client-only) to avoid an SSR/client markup mismatch.
  // initialLang comes from the domain on the server (gomp.cz -> cz), so the first paint is already in the right language.
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [currency, setCurrencyState] = useState<Currency>('czk');
  const [vatRatePct, setVatRatePct] = useState<number>(DEFAULT_VAT_RATE_PCT);

  useEffect(() => {
    // A visitor sent over from gomp.sk to gomp.cz to sign in arrives with ?lang=sk&cur=eur — keep their language and
    // currency (storage is per domain) and tidy the address bar. Set directly, so it does not bounce back to gomp.sk.
    const params = new URLSearchParams(window.location.search);
    const qLang = params.get('lang');
    const qCur = params.get('cur');
    if (qLang === 'sk' || qLang === 'cz' || qLang === 'en') persistLang(qLang);
    if (qCur === 'eur' || qCur === 'czk') persistCurrency(qCur);
    if (qLang || qCur) {
      params.delete('lang');
      params.delete('cur');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }
    setLangState(getLang());
    setCurrencyState(getCurrency());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchStoreSettings().then((s) => {
      if (!cancelled) setVatRatePct(s.vatRatePct);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SiteContextValue>(
    () => ({
      lang,
      currency,
      setLang: (l: Lang) => {
        // gomp.sk <-> gomp.cz: picking the other country's language moves to that domain, same page.
        const url = langRedirectUrl(l);
        if (url) {
          clearStoredLang();
          window.location.assign(url);
          return;
        }
        persistLang(l);
        setLangState(l);
      },
      setCurrency: (c: Currency) => {
        persistCurrency(c);
        setCurrencyState(c);
      },
      fmt: (czk: number) => fmtPrice(czk, currency),
      vatRatePct,
      fmtGross: (netCzk: number) => fmtPrice(applyVat(netCzk, vatRatePct), currency),
    }),
    [lang, currency, vatRatePct],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
