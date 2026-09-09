'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Currency, Lang, fmtPrice, getCurrency, getLang, setCurrency as persistCurrency, setLang as persistLang } from '@/lib/gomp-storage';
import { applyVat } from '@/lib/component-db-seed';
import { DEFAULT_VAT_RATE_PCT, fetchStoreSettings, subscribeStoreSettings } from '@/lib/supabase/store-settings';

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

export function SiteProvider({ children }: { children: React.ReactNode }) {
  // Defaults match the original site's getLang()/getCurrency() fallbacks. Real values are
  // adopted from localStorage on mount (client-only) to avoid an SSR/client markup mismatch.
  const [lang, setLangState] = useState<Lang>('sk');
  const [currency, setCurrencyState] = useState<Currency>('czk');
  const [vatRatePct, setVatRatePct] = useState<number>(DEFAULT_VAT_RATE_PCT);

  useEffect(() => {
    setLangState(getLang());
    setCurrencyState(getCurrency());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchStoreSettings().then((s) => {
      if (!cancelled) setVatRatePct(s.vatRatePct);
    });
    const unsubscribe = subscribeStoreSettings(() => {
      fetchStoreSettings().then((s) => {
        if (!cancelled) setVatRatePct(s.vatRatePct);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<SiteContextValue>(
    () => ({
      lang,
      currency,
      setLang: (l: Lang) => {
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
