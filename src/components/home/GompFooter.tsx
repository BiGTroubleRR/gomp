import Link from 'next/link';

// '#' = stránka zatiaľ neexistuje (rovnako ako na starom webe)
const COLS = [
  { title: 'PRODUKTY', links: [{ href: '/shop', label: 'Hotové zostavy' }, { href: '/build', label: 'Vlastná konfigurácia' }, { href: '#', label: 'Príslušenstvo' }] },
  { title: 'SPOLOČNOSŤ', links: [{ href: '/about', label: 'O nás' }, { href: '#', label: 'Blog' }, { href: '#', label: 'Kariéra' }] },
  { title: 'PODPORA', links: [{ href: '#', label: 'FAQ' }, { href: '#', label: 'Záruka' }, { href: '/contact', label: 'Kontakt' }] },
  { title: 'PRÁVNE', links: [{ href: '/terms', label: 'Obchodné podmienky' }, { href: '/privacy', label: 'Ochrana osobných údajov' }] },
];

export default function GompFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div>
            <div className="logo"><i />GOMP</div>
            <p>Ručne stavané herné počítače presne podľa vašich požiadaviek. Staviame ich hráči pre hráčov.</p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>{c.links.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="legal">
          <div><b>© 2026 GOMP. Všetky práva vyhradené.</b> Ručne vyrábané v Prahe, ČR</div>
          <div>Všetky ceny obsahujú DPH (21%). Ceny sú uvedené v Kč; suma v € je približný prepočet (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.</div>
          <div>Každý GOMP má hodnotenie na škále S (najvyššie) až D (základné), vypočítané ako priemer úrovní jeho jednotlivých komponentov.</div>
        </div>
      </div>
    </footer>
  );
}
