# Nový dizajn homepage (tmavý, racing green)

## Súbory

| Súbor | Čo robí |
|---|---|
| `src/app/page.tsx` | Nová homepage. Nahrádza súčasný `src/app/page.tsx` (starý si odlož). |
| `src/components/home/GompHome.tsx` | Celá homepage: hero slider, bannery, výhody, odporúčané zostavy s 3D, promo, zoznamy, hodnoty, značky. |
| `src/components/home/GompHeader.tsx` | Horná lišta, hlavička (logo, vyhľadávanie, košík) a zelené menu. Dá sa použiť na všetkých stránkach. |
| `src/components/home/GompFooter.tsx` | Pätička. Dá sa použiť na všetkých stránkach. |
| `src/components/home/gomp-home.css` | Všetky štýly. Všetko je pod triedou `.gomp-home`, takže nezasahuje do ostatných stránok. |
| `src/components/home/home-data.ts` | Typ `HomeBuild`, aktuálnych 6 zostáv a `guessPc3DSpec()`. |
| `src/lib/pc3d.ts` | 3D náhľad zostavy (three.js): živý model a statické náhľady. |
| `public/images/home/*.jpg` | Fotky pre hero, bannery a 3D promo. |

Nepotrebuje žiadny nový balík. `three` aj `next` už v projekte máš a písmo DM Sans sa berie z `--font-sans` v `layout.tsx`.

## Napojenie na Supabase

`GompHome` berie prop `builds: HomeBuild[]`. Bez neho ukazuje aktuálnych 6 zostáv z `home-data.ts`.

Napojenie na `fetchPrebuilts()` vyzerá zhruba takto (polia uprav podľa svojho typu `Build`):

```tsx
'use client';
import { useEffect, useState } from 'react';
import GompHome from '@/components/home/GompHome';
import { DEFAULT_HOME_BUILDS, guessPc3DSpec, type HomeBuild } from '@/components/home/home-data';
import { fetchPrebuilts } from '@/lib/supabase/prebuilts';

export default function HomeLive() {
  const [builds, setBuilds] = useState<HomeBuild[]>(DEFAULT_HOME_BUILDS);
  useEffect(() => {
    fetchPrebuilts().then((rows) => {
      setBuilds(rows.filter((r) => r.isLive !== false).map((r) => ({
        id: r.name,
        href: `/build?prebuilt=${r.id}`,
        cls: r.cat, // preklad: flagship → 'Vlajková loď' atď.
        cat: 'Vlajkové', // podľa r.cat
        tier: r.tier,
        rating: r.rating,
        tag: r.taglineSk,
        gpu: r.gpu, cpu: r.cpu, ram: r.ram, ssd: r.storage, cool: r.cooler,
        priceCzk: 0, // cenu s DPH vypočítaj ako na /shop (computeBuildTotalGross)
        p3: guessPc3DSpec({ gpu: r.gpu, cooler: r.cooler, ram: r.ram, case: r.case }),
      })));
    });
  }, []);
  return <GompHome builds={builds} />;
}
```

## Dizajn na ostatných stránkach

Na ľubovoľnej stránke obal obsah do `<div className="gomp-home">` a použi `GompHeader` a `GompFooter`. Farby a písmo sú CSS premenné na `.gomp-home` (`--bg`, `--panel`, `--green`, `--green-hi`, `--gold`…), dajú sa použiť aj v ďalších komponentoch.

## 3D

- Odporúčaná zostava je živý model: otáča sa sám aj myšou, ventilátory sa točia. Pri `prefers-reduced-motion` stojí.
- Karty a zoznamy dostanú statické náhľady, vyrenderované raz v prehliadači. Na stránke beží vždy len jedna 3D scéna.
- `three` sa načíta až v prehliadači (dynamický import), takže nespomaľuje prvé zobrazenie stránky.
- Vzhľad zostavy určuje `p3` (`Pc3DSpec`): skrinka, AIO alebo vzduchový chladič, dĺžka GPU, počet ventilátorov, RAM.
