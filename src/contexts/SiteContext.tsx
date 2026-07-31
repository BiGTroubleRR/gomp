'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Currency, Lang, fmtPrice, getCurrency, getLang, setCurrency as persistCurrency, setLang as persistLang } from '@/lib/gomp-storage';

type SiteContextValue = {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  fmt: (eur: number) => string;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  // Defaults match the original site's getLang()/getCurrency() fallbacks. Real values are
  // adopted from localStorage on mount (client-only) to avoid an SSR/client markup mismatch.
  const [lang, setLangState] = useState<Lang>('en');
  const [currency, setCurrencyState] = useState<Currency>('eur');

  useEffect(() => {
    setLangState(getLang());
    setCurrencyState(getCurrency());
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
      fmt: (eur: number) => fmtPrice(eur, currency),
    }),
    [lang, currency],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
