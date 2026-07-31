'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { readJSON, writeJSON } from '@/lib/gomp-storage';
import { useIsMobile } from '@/lib/use-media-query';

type TabId = 'orders' | 'addresses' | 'profile' | 'security';

type Address = {
  label: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  default: boolean;
};

type AddressDraft = Omit<Address, 'default'>;

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type PwdForm = {
  current: string;
  newPass: string;
  confirm: string;
};

type OrderStatus = 'Building' | 'Shipped' | 'Delivered';

type Order = {
  id: string;
  name_en: string;
  name_sk: string;
  date_en: string;
  date_sk: string;
  totalEur: number;
  status_en: OrderStatus;
  status_sk: string;
  eta_en: string;
  eta_sk: string;
  items: string[];
};

const ORDERS: Order[] = [
  {
    id: 'GOMP-X7K2-8341',
    name_en: 'Custom Build — The Apex Predator',
    name_sk: 'Vlastná zostava — The Apex Predator',
    date_en: 'March 15, 2026',
    date_sk: '15. marca 2026',
    totalEur: 3870,
    status_en: 'Building',
    status_sk: 'Vo výrobe',
    eta_en: 'Est. delivery July 8, 2026',
    eta_sk: 'Predpokladané doručenie 8. júla 2026',
    items: [
      'NVIDIA RTX 5090 FE',
      'AMD Ryzen 9 9950X',
      'G.Skill Trident Z5 32GB DDR5',
      'Samsung 990 Pro 2TB NVMe',
      'NZXT Kraken 360 AIO',
      'Corsair HX1200i ATX 3.0',
      'Lian Li PC-O11D XL',
    ],
  },
  {
    id: 'GOMP-M3N9-2107',
    name_en: 'Custom Build — The Marauder',
    name_sk: 'Vlastná zostava — The Marauder',
    date_en: 'January 8, 2026',
    date_sk: '8. januára 2026',
    totalEur: 2739,
    status_en: 'Delivered',
    status_sk: 'Doručené',
    eta_en: 'Delivered January 21, 2026',
    eta_sk: 'Doručené 21. januára 2026',
    items: [
      'NVIDIA RTX 4090 FE',
      'Intel Core i9-14900K',
      'Corsair Dominator 32GB DDR5',
      'WD Black SN850X 2TB',
      'be quiet! Pure Loop 2 FX 360',
      'Seasonic Focus GX-1000',
      'Fractal Design Define 7',
    ],
  },
  {
    id: 'GOMP-P5J1-4492',
    name_en: 'Accessories Pack',
    name_sk: 'Balík príslušenstva',
    date_en: 'November 2, 2025',
    date_sk: '2. novembra 2025',
    totalEur: 286,
    status_en: 'Delivered',
    status_sk: 'Doručené',
    eta_en: 'Delivered November 9, 2025',
    eta_sk: 'Doručené 9. novembra 2025',
    items: ['GOMP Cable Management Kit', 'Arctic MX-6 Thermal Paste 3-pack', 'GOMP Branded Mousepad XL'],
  },
];

// Amber/gold for in-progress, muted maroon for shipped (unused by current seed data,
// kept for completeness), muted green for delivered — consistent with the site palette.
const STATUS_COLORS: Record<OrderStatus, { color: string; bg: string; border: string }> = {
  Building: { color: '#92400E', bg: 'rgba(146,64,14,0.08)', border: 'rgba(146,64,14,0.2)' },
  Shipped: { color: '#6E1423', bg: 'rgba(110,20,35,0.08)', border: 'rgba(110,20,35,0.2)' },
  Delivered: { color: '#14532D', bg: 'rgba(20,83,45,0.08)', border: 'rgba(20,83,45,0.2)' },
};

const DEFAULT_ADDRESSES: Address[] = [
  { label: 'Home', street: 'Václavské náměstí 1', city: 'Prague', zip: '110 00', country: 'Czech Republic', default: true },
  { label: 'Work', street: 'Na Příkopě 14', city: 'Prague', zip: '110 00', country: 'Czech Republic', default: false },
];

const DEFAULT_PROFILE: Profile = {
  firstName: 'Jakub',
  lastName: 'Novák',
  email: 'jakub.novak@email.cz',
  phone: '+420 777 123 456',
};

const TRANSLATIONS = {
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_build: 'Build',
    nav_about: 'About',
    nav_account: 'Account',
    member_since: 'Member since',
    member_date: 'Jan 2026',
    sign_out: 'Sign out →',
    my_account: 'My Account',
    my_orders: 'My Orders',
    addresses: 'Addresses',
    profile: 'Profile',
    security: 'Security',
    components: 'Components',
    delivery: 'Delivery',
    warranty_note: '3-year warranty on all parts & labor. Contact support if anything needs attention.',
    track_order: 'Track Order',
    download_invoice: 'Download Invoice',
    add_address: 'Add Address',
    default_badge: 'Default',
    edit: 'Edit',
    set_default: 'Set Default',
    remove: 'Remove',
    label_field: 'Label',
    label_placeholder: 'e.g. Home',
    street_address: 'Street Address',
    city: 'City',
    zip: 'ZIP',
    country: 'Country',
    cancel: 'Cancel',
    save_address: 'Save Address',
    new_address: 'New Address',
    edit_address: 'Edit Address',
    edit_profile: 'Edit Profile',
    profile_updated: 'Profile updated successfully',
    first_name: 'First Name',
    last_name: 'Last Name',
    email_address: 'Email Address',
    phone: 'Phone',
    save_changes: 'Save Changes',
    change_password: 'Change Password',
    change_password_desc: "Choose a unique password you don't use elsewhere.",
    current_password: 'Current Password',
    new_password: 'New Password',
    confirm_new_password: 'Confirm New Password',
    password_updated: 'Password updated successfully',
    update_password: 'Update Password',
    recent_activity: 'Recent Activity',
    last_signin: 'Last sign in',
    previous_signin: 'Previous sign in',
    signin_location: 'Prague, Czech Republic · Chrome · macOS',
    today_time: 'Today, 11:32 AM',
    previous_time: 'Jun 29, 9:14 AM',
    danger_zone: 'Danger Zone',
    delete_account: 'Delete Account',
    delete_account_desc:
      'Permanently delete your account, order history, addresses, and all associated data. This cannot be undone.',
    type_delete: 'Type',
    to_confirm: 'to confirm permanent deletion:',
    confirm_delete: 'Confirm Delete',
  },
  sk: {
    nav_home: 'Domov',
    nav_shop: 'Obchod',
    nav_build: 'Zostaviť',
    nav_about: 'O nás',
    nav_account: 'Účet',
    member_since: 'Členom od',
    member_date: 'jan 2026',
    sign_out: 'Odhlásiť sa →',
    my_account: 'Môj účet',
    my_orders: 'Moje objednávky',
    addresses: 'Adresy',
    profile: 'Profil',
    security: 'Zabezpečenie',
    components: 'Komponenty',
    delivery: 'Doručenie',
    warranty_note: 'Trojročná záruka na všetky diely a prácu. V prípade problémov kontaktujte podporu.',
    track_order: 'Sledovať objednávku',
    download_invoice: 'Stiahnuť faktúru',
    add_address: 'Pridať adresu',
    default_badge: 'Predvolená',
    edit: 'Upraviť',
    set_default: 'Nastaviť ako predvolenú',
    remove: 'Odstrániť',
    label_field: 'Názov',
    label_placeholder: 'napr. Domov',
    street_address: 'Ulica a číslo',
    city: 'Mesto',
    zip: 'PSČ',
    country: 'Krajina',
    cancel: 'Zrušiť',
    save_address: 'Uložiť adresu',
    new_address: 'Nová adresa',
    edit_address: 'Upraviť adresu',
    edit_profile: 'Upraviť profil',
    profile_updated: 'Profil bol úspešne aktualizovaný',
    first_name: 'Meno',
    last_name: 'Priezvisko',
    email_address: 'E-mailová adresa',
    phone: 'Telefón',
    save_changes: 'Uložiť zmeny',
    change_password: 'Zmeniť heslo',
    change_password_desc: 'Zvoľte si jedinečné heslo, ktoré nepoužívate inde.',
    current_password: 'Súčasné heslo',
    new_password: 'Nové heslo',
    confirm_new_password: 'Potvrdiť nové heslo',
    password_updated: 'Heslo bolo úspešne aktualizované',
    update_password: 'Aktualizovať heslo',
    recent_activity: 'Nedávna aktivita',
    last_signin: 'Posledné prihlásenie',
    previous_signin: 'Predchádzajúce prihlásenie',
    signin_location: 'Praha, Česká republika · Chrome · macOS',
    today_time: 'Dnes, 11:32',
    previous_time: '29. jún, 9:14',
    danger_zone: 'Nebezpečná zóna',
    delete_account: 'Vymazať účet',
    delete_account_desc:
      'Natrvalo vymažete svoj účet, históriu objednávok, adresy a všetky súvisiace údaje. Túto akciu nemožno vrátiť späť.',
    type_delete: 'Napíšte',
    to_confirm: 'na potvrdenie trvalého vymazania:',
    confirm_delete: 'Potvrdiť vymazanie',
  },
};

type T = typeof TRANSLATIONS.en;

const ACTIVE_COLOR = '#6E1423';
const INACTIVE_COLOR = '#7A7469';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 10,
  fontWeight: 600,
  color: '#7A7469',
  letterSpacing: 2,
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 8,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '0.5px solid rgba(28,28,26,0.2)',
  borderRadius: 2,
  background: '#F5F0E6',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: '#1C1C1A',
};

const panelStyle: CSSProperties = {
  background: '#FDFAF4',
  border: '0.5px solid rgba(28,28,26,0.14)',
  borderRadius: 2,
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        style={inputStyle}
      />
    </div>
  );
}

function TabHeader({ t, title, action, isMobile }: { t: T; title: string; action?: React.ReactNode; isMobile: boolean }) {
  return (
    <div
      style={{
        marginBottom: isMobile ? 24 : 40,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        justifyContent: 'space-between',
        gap: isMobile ? 14 : 0,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            fontWeight: 600,
            color: '#7A7469',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {t.my_account}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: isMobile ? 30 : 48,
            fontWeight: 600,
            color: '#1C1C1A',
            letterSpacing: -1.5,
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

export default function Account() {
  const { lang, currency, setLang, setCurrency, fmt } = useSite();
  const t = TRANSLATIONS[lang];
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<TabId>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>(DEFAULT_ADDRESSES);
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addrDraft, setAddrDraft] = useState<AddressDraft>({ label: '', street: '', city: '', zip: '', country: '' });

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [profileDraft, setProfileDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [editProfile, setEditProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [pwdForm, setPwdForm] = useState<PwdForm>({ current: '', newPass: '', confirm: '' });
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const deleteInputRef = useRef<HTMLInputElement>(null);

  // Adopt any persisted addresses on mount (client-only, avoids SSR/client markup mismatch).
  useEffect(() => {
    setAddresses(readJSON('gomp_addresses', DEFAULT_ADDRESSES));
  }, []);

  useEffect(() => {
    if (showDeleteConfirm) deleteInputRef.current?.focus();
  }, [showDeleteConfirm]);

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${(profile.firstName || ' ')[0]}${(profile.lastName || ' ')[0]}`.toUpperCase();
  const deleteReady = deleteInput.trim().toUpperCase() === 'DELETE';
  const showAddressForm = editingAddressIdx !== null || addingAddress;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'orders', label: t.my_orders },
    { id: 'addresses', label: t.addresses },
    { id: 'profile', label: t.profile },
    { id: 'security', label: t.security },
  ];

  function openAddAddress() {
    setAddingAddress(true);
    setEditingAddressIdx(null);
    setAddrDraft({ label: '', street: '', city: '', zip: '', country: 'Czech Republic' });
  }

  function openEditAddress(i: number) {
    const a = addresses[i];
    setEditingAddressIdx(i);
    setAddingAddress(false);
    setAddrDraft({ label: a.label, street: a.street, city: a.city, zip: a.zip, country: a.country });
  }

  function cancelAddressForm() {
    setEditingAddressIdx(null);
    setAddingAddress(false);
  }

  function saveAddress() {
    let next: Address[];
    if (addingAddress) {
      next = [...addresses, { ...addrDraft, default: addresses.length === 0 }];
    } else if (editingAddressIdx !== null) {
      next = addresses.map((a, i) => (i === editingAddressIdx ? { ...addrDraft, default: a.default } : a));
    } else {
      return;
    }
    writeJSON('gomp_addresses', next);
    setAddresses(next);
    setEditingAddressIdx(null);
    setAddingAddress(false);
  }

  function setDefaultAddress(i: number) {
    const next = addresses.map((a, j) => ({ ...a, default: j === i }));
    writeJSON('gomp_addresses', next);
    setAddresses(next);
  }

  function removeAddress(i: number) {
    const next = addresses.filter((_, j) => j !== i);
    writeJSON('gomp_addresses', next);
    setAddresses(next);
  }

  function startEditProfile() {
    setProfileDraft(profile);
    setEditProfile(true);
    setProfileSaved(false);
  }

  function saveProfile() {
    setProfile(profileDraft);
    setEditProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  function submitPassword() {
    if (pwdForm.current && pwdForm.newPass && pwdForm.newPass === pwdForm.confirm) {
      setPasswordChanged(true);
      setPwdForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordChanged(false), 3000);
    }
  }

  function openDeleteConfirm() {
    setShowDeleteConfirm(true);
    setDeleteInput('');
  }

  function cancelDeleteConfirm() {
    setShowDeleteConfirm(false);
    setDeleteInput('');
  }

  function executeDelete() {
    if (deleteReady) {
      setShowDeleteConfirm(false);
      setDeleteInput('');
    }
  }

  return (
    <div style={{ position: 'relative', zIndex: 2, background: '#F5F0E6', minHeight: '100vh' }}>
      {/* Nav */}
      <SiteNav />

      <div style={{ minHeight: '100vh', padding: isMobile ? '90px 20px 48px' : '100px 60px 80px' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '224px 1fr',
            gap: isMobile ? 32 : 64,
            alignItems: 'start',
          }}
        >
          {/* Sidebar */}
          <aside style={isMobile ? {} : { position: 'sticky', top: 84 }}>
            <div style={{ marginBottom: 36 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#6E1423',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 19, fontWeight: 600, color: '#FDFAF4', letterSpacing: 1 }}>
                  {initials}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 24,
                  fontWeight: 600,
                  color: '#1C1C1A',
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                  marginBottom: 4,
                }}
              >
                {fullName}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: '#7A7469',
                  fontWeight: 300,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 200,
                }}
              >
                {profile.email}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 36 }}>
              {TABS.map((tb) => {
                const active = tab === tb.id;
                return (
                  <div
                    key={tb.id}
                    onClick={() => setTab(tb.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 13px',
                      cursor: 'pointer',
                      borderLeft: `2px solid ${active ? '#6E1423' : 'transparent'}`,
                      background: active ? 'rgba(110,20,35,0.065)' : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        color: active ? '#1C1C1A' : '#7A7469',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {tb.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)', paddingTop: 20 }}>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 10,
                  color: '#7A7469',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {t.member_since}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1C1C1A', marginBottom: 18 }}>{t.member_date}</div>
              <TransitionLink
                href="/"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: '#7A7469',
                  textDecoration: 'none',
                  borderBottom: '0.5px solid rgba(122,116,105,0.35)',
                  paddingBottom: 1,
                }}
              >
                {t.sign_out}
              </TransitionLink>
            </div>
          </aside>

          {/* Main */}
          <main>
            <div key={tab} style={{ animation: 'fadeUp 0.5s cubic-bezier(.16,1,.3,1) forwards' }}>
              {tab === 'orders' && (
                <>
                  <TabHeader t={t} title={t.my_orders} isMobile={isMobile} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ORDERS.map((order) => {
                      const expanded = expandedOrderId === order.id;
                      const s = STATUS_COLORS[order.status_en];
                      const name = lang === 'sk' ? order.name_sk : order.name_en;
                      const date = lang === 'sk' ? order.date_sk : order.date_en;
                      const eta = lang === 'sk' ? order.eta_sk : order.eta_en;
                      const status = lang === 'sk' ? order.status_sk : order.status_en;
                      return (
                        <div key={order.id} style={{ ...panelStyle, overflow: 'hidden' }}>
                          <div
                            onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                            style={{
                              padding: isMobile ? '16px 16px' : '22px 28px',
                              cursor: 'pointer',
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                              gap: isMobile ? 12 : 20,
                              alignItems: isMobile ? 'stretch' : 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7A7469', letterSpacing: 0.8, marginBottom: 5 }}>
                                {order.id}
                              </div>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#1C1C1A', marginBottom: 3 }}>
                                {name}
                              </div>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', fontWeight: 300 }}>{date}</div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? 12 : 20,
                                justifyContent: isMobile ? 'space-between' : 'flex-start',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: '#1C1C1A', whiteSpace: 'nowrap' }}>
                                {fmt(order.totalEur)}
                              </div>
                              <div style={{ padding: '4px 11px', borderRadius: 2, background: s.bg, border: `0.5px solid ${s.border}` }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: s.color,
                                    letterSpacing: 1.5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {status}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 15,
                                  color: '#7A7469',
                                  width: 16,
                                  textAlign: 'center',
                                  userSelect: 'none',
                                }}
                              >
                                {expanded ? '−' : '+'}
                              </div>
                            </div>
                          </div>
                          {expanded && (
                            <div
                              style={{
                                borderTop: '0.5px solid rgba(28,28,26,0.09)',
                                padding: isMobile ? '18px 16px 20px' : '20px 28px 24px',
                                background: 'rgba(28,28,26,0.018)',
                              }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 20 : 32, marginBottom: 20 }}>
                                <div>
                                  <div
                                    style={{
                                      fontFamily: 'var(--font-sans)',
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: '#7A7469',
                                      letterSpacing: 2,
                                      textTransform: 'uppercase',
                                      marginBottom: 10,
                                    }}
                                  >
                                    {t.components}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {order.items.map((part) => (
                                      <div
                                        key={part}
                                        style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#1C1C1A', display: 'flex', alignItems: 'baseline', gap: 8 }}
                                      >
                                        <span style={{ color: 'rgba(28,28,26,0.28)', flexShrink: 0 }}>—</span>
                                        <span>{part}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontFamily: 'var(--font-sans)',
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: '#7A7469',
                                      letterSpacing: 2,
                                      textTransform: 'uppercase',
                                      marginBottom: 10,
                                    }}
                                  >
                                    {t.delivery}
                                  </div>
                                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#1C1C1A', marginBottom: 8 }}>{eta}</div>
                                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', fontWeight: 300, lineHeight: 1.65 }}>
                                    {t.warranty_note}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => {}}
                                  style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    border: '0.5px solid rgba(28,28,26,0.18)',
                                    borderRadius: 2,
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: 12,
                                    color: '#7A7469',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {t.track_order}
                                </button>
                                <button
                                  onClick={() => {}}
                                  style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    border: '0.5px solid rgba(28,28,26,0.18)',
                                    borderRadius: 2,
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: 12,
                                    color: '#7A7469',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {t.download_invoice}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {tab === 'addresses' && (
                <>
                  <TabHeader
                    t={t}
                    title={t.addresses}
                    isMobile={isMobile}
                    action={
                      !showAddressForm && (
                        <button
                          onClick={openAddAddress}
                          style={{
                            padding: '10px 20px',
                            background: '#6E1423',
                            color: '#FDFAF4',
                            border: 'none',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            letterSpacing: 0.3,
                          }}
                        >
                          + {t.add_address}
                        </button>
                      )
                    }
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {addresses.map((addr, idx) => (
                      <div
                        key={`${addr.label}-${idx}`}
                        style={{
                          ...panelStyle,
                          border: `0.5px solid ${addr.default ? 'rgba(110,20,35,0.22)' : 'rgba(28,28,26,0.14)'}`,
                          padding: isMobile ? '18px 16px 16px' : '22px 22px 18px',
                          position: 'relative',
                        }}
                      >
                        {addr.default && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 13,
                              right: 13,
                              padding: '2px 8px',
                              background: 'rgba(110,20,35,0.07)',
                              border: '0.5px solid rgba(110,20,35,0.18)',
                              borderRadius: 2,
                            }}
                          >
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#6E1423', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                              {t.default_badge}
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#7A7469',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            marginBottom: 10,
                          }}
                        >
                          {addr.label}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#1C1C1A', lineHeight: 1.8, marginBottom: 14 }}>
                          {addr.street}
                          <br />
                          {addr.city}, {addr.zip}
                          <br />
                          {addr.country}
                        </div>
                        <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12, display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => openEditAddress(idx)}
                            style={{
                              padding: '7px 14px',
                              background: 'transparent',
                              border: '0.5px solid rgba(28,28,26,0.2)',
                              borderRadius: 2,
                              fontFamily: 'var(--font-sans)',
                              fontSize: 11,
                              color: '#7A7469',
                              cursor: 'pointer',
                            }}
                          >
                            {t.edit}
                          </button>
                          {!addr.default && (
                            <>
                              <button
                                onClick={() => setDefaultAddress(idx)}
                                style={{
                                  padding: '7px 14px',
                                  background: 'transparent',
                                  border: '0.5px solid rgba(28,28,26,0.2)',
                                  borderRadius: 2,
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 11,
                                  color: '#7A7469',
                                  cursor: 'pointer',
                                }}
                              >
                                {t.set_default}
                              </button>
                              <button
                                onClick={() => removeAddress(idx)}
                                style={{
                                  padding: '7px 14px',
                                  background: 'transparent',
                                  border: '0.5px solid rgba(28,28,26,0.1)',
                                  borderRadius: 2,
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 11,
                                  color: 'rgba(28,28,26,0.35)',
                                  cursor: 'pointer',
                                }}
                              >
                                {t.remove}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {showAddressForm && (
                    <div style={{ ...panelStyle, border: '0.5px solid rgba(28,28,26,0.18)', padding: isMobile ? 20 : 28 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: '#1C1C1A', letterSpacing: 0.2, marginBottom: 20 }}>
                        {editingAddressIdx !== null ? t.edit_address : t.new_address}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <Field
                          label={t.label_field}
                          value={addrDraft.label}
                          onChange={(v) => setAddrDraft((d) => ({ ...d, label: v }))}
                          placeholder={t.label_placeholder}
                        />
                        <Field
                          label={t.street_address}
                          value={addrDraft.street}
                          onChange={(v) => setAddrDraft((d) => ({ ...d, street: v }))}
                        />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                          gap: 14,
                          marginBottom: isMobile ? 14 : 22,
                        }}
                      >
                        <Field label={t.city} value={addrDraft.city} onChange={(v) => setAddrDraft((d) => ({ ...d, city: v }))} />
                        <Field label={t.zip} value={addrDraft.zip} onChange={(v) => setAddrDraft((d) => ({ ...d, zip: v }))} />
                        {!isMobile && (
                          <Field label={t.country} value={addrDraft.country} onChange={(v) => setAddrDraft((d) => ({ ...d, country: v }))} />
                        )}
                      </div>
                      {isMobile && (
                        <div style={{ marginBottom: 22 }}>
                          <Field label={t.country} value={addrDraft.country} onChange={(v) => setAddrDraft((d) => ({ ...d, country: v }))} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={cancelAddressForm}
                          style={{
                            padding: '11px 20px',
                            background: 'transparent',
                            border: '0.5px solid rgba(28,28,26,0.2)',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            color: '#7A7469',
                            cursor: 'pointer',
                          }}
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={saveAddress}
                          style={{
                            padding: '11px 22px',
                            background: '#6E1423',
                            color: '#FDFAF4',
                            border: 'none',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {t.save_address}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'profile' && (
                <>
                  <TabHeader
                    t={t}
                    title={t.profile}
                    isMobile={isMobile}
                    action={
                      !editProfile && (
                        <button
                          onClick={startEditProfile}
                          style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: '0.5px solid rgba(28,28,26,0.2)',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            color: '#7A7469',
                            cursor: 'pointer',
                          }}
                        >
                          {t.edit_profile}
                        </button>
                      )
                    }
                  />
                  {profileSaved && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 16px',
                        background: 'rgba(20,83,45,0.07)',
                        border: '0.5px solid rgba(20,83,45,0.2)',
                        borderRadius: 2,
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#14532D', fontWeight: 500 }}>
                        ✓ {t.profile_updated}
                      </span>
                    </div>
                  )}
                  {!editProfile && (
                    <div style={{ ...panelStyle, overflow: 'hidden' }}>
                      {[
                        { label: t.first_name, value: profile.firstName },
                        { label: t.last_name, value: profile.lastName },
                        { label: t.email_address, value: profile.email },
                        { label: t.phone, value: profile.phone },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: isMobile ? 4 : 0,
                            padding: isMobile ? '14px 16px' : '17px 26px',
                            borderBottom: i === arr.length - 1 ? 'none' : '0.5px solid rgba(28,28,26,0.07)',
                          }}
                        >
                          <div
                            style={{
                              width: isMobile ? 'auto' : 160,
                              flexShrink: 0,
                              fontFamily: 'var(--font-sans)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#7A7469',
                              letterSpacing: 2,
                              textTransform: 'uppercase',
                            }}
                          >
                            {row.label}
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#1C1C1A' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {editProfile && (
                    <div style={{ ...panelStyle, padding: isMobile ? 20 : 28 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <Field
                          label={t.first_name}
                          value={profileDraft.firstName}
                          onChange={(v) => setProfileDraft((d) => ({ ...d, firstName: v }))}
                        />
                        <Field
                          label={t.last_name}
                          value={profileDraft.lastName}
                          onChange={(v) => setProfileDraft((d) => ({ ...d, lastName: v }))}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Field
                          label={t.email_address}
                          value={profileDraft.email}
                          onChange={(v) => setProfileDraft((d) => ({ ...d, email: v }))}
                          type="email"
                        />
                      </div>
                      <div style={{ marginBottom: 28 }}>
                        <Field label={t.phone} value={profileDraft.phone} onChange={(v) => setProfileDraft((d) => ({ ...d, phone: v }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => setEditProfile(false)}
                          style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: '0.5px solid rgba(28,28,26,0.2)',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            color: '#7A7469',
                            cursor: 'pointer',
                          }}
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={saveProfile}
                          style={{
                            padding: '12px 24px',
                            background: '#6E1423',
                            color: '#FDFAF4',
                            border: 'none',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {t.save_changes}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'security' && (
                <>
                  <TabHeader t={t} title={t.security} isMobile={isMobile} />
                  <div style={{ ...panelStyle, padding: isMobile ? 20 : 28, marginBottom: 14 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: '#1C1C1A', marginBottom: 4 }}>
                      {t.change_password}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', fontWeight: 300, marginBottom: 24 }}>
                      {t.change_password_desc}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                      <Field
                        label={t.current_password}
                        value={pwdForm.current}
                        onChange={(v) => setPwdForm((f) => ({ ...f, current: v }))}
                        type="password"
                      />
                      <Field
                        label={t.new_password}
                        value={pwdForm.newPass}
                        onChange={(v) => setPwdForm((f) => ({ ...f, newPass: v }))}
                        type="password"
                      />
                      <Field
                        label={t.confirm_new_password}
                        value={pwdForm.confirm}
                        onChange={(v) => setPwdForm((f) => ({ ...f, confirm: v }))}
                        type="password"
                      />
                    </div>
                    {passwordChanged && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          background: 'rgba(20,83,45,0.07)',
                          border: '0.5px solid rgba(20,83,45,0.2)',
                          borderRadius: 2,
                          marginBottom: 16,
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#14532D', fontWeight: 500 }}>
                          ✓ {t.password_updated}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={submitPassword}
                      style={{
                        padding: '12px 24px',
                        background: '#6E1423',
                        color: '#FDFAF4',
                        border: 'none',
                        borderRadius: 2,
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {t.update_password}
                    </button>
                  </div>

                  <div style={{ ...panelStyle, padding: isMobile ? '16px 18px' : '20px 26px', marginBottom: 14 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#7A7469',
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        marginBottom: 14,
                      }}
                    >
                      {t.recent_activity}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: '0.5px solid rgba(28,28,26,0.07)',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#1C1C1A', marginBottom: 2 }}>{t.last_signin}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', fontWeight: 300 }}>{t.signin_location}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7A7469', whiteSpace: 'nowrap' }}>{t.today_time}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#1C1C1A', marginBottom: 2 }}>{t.previous_signin}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', fontWeight: 300 }}>{t.signin_location}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7A7469', whiteSpace: 'nowrap' }}>{t.previous_time}</div>
                    </div>
                  </div>

                  <div style={{ border: '0.5px solid rgba(176,32,32,0.18)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ padding: isMobile ? '12px 16px' : '13px 22px', background: 'rgba(176,32,32,0.03)', borderBottom: '0.5px solid rgba(176,32,32,0.1)' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: 'rgba(176,32,32,0.6)', letterSpacing: 2, textTransform: 'uppercase' }}>
                        {t.danger_zone}
                      </span>
                    </div>
                    <div style={{ padding: isMobile ? 16 : 22 }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'stretch' : 'flex-start',
                          justifyContent: 'space-between',
                          gap: isMobile ? 14 : 24,
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#1C1C1A', marginBottom: 5 }}>
                            {t.delete_account}
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A7469', fontWeight: 300, lineHeight: 1.65, maxWidth: isMobile ? '100%' : 400 }}>
                            {t.delete_account_desc}
                          </div>
                        </div>
                        <button
                          onClick={openDeleteConfirm}
                          style={{
                            flexShrink: 0,
                            padding: '9px 18px',
                            background: 'transparent',
                            border: '0.5px solid rgba(176,32,32,0.3)',
                            borderRadius: 2,
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'rgba(176,32,32,0.7)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            alignSelf: isMobile ? 'flex-start' : undefined,
                          }}
                        >
                          {t.delete_account}
                        </button>
                      </div>
                      {showDeleteConfirm && (
                        <div
                          style={{
                            marginTop: 20,
                            padding: isMobile ? 14 : 18,
                            background: 'rgba(176,32,32,0.04)',
                            border: '0.5px solid rgba(176,32,32,0.14)',
                            borderRadius: 2,
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#1C1C1A', marginBottom: 12 }}>
                            {t.type_delete} <strong>DELETE</strong> {t.to_confirm}
                          </div>
                          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
                            <input
                              ref={deleteInputRef}
                              value={deleteInput}
                              onChange={(e) => setDeleteInput(e.target.value)}
                              placeholder="DELETE"
                              style={{
                                flex: 1,
                                width: isMobile ? '100%' : undefined,
                                padding: '10px 14px',
                                border: '0.5px solid rgba(176,32,32,0.25)',
                                borderRadius: 2,
                                background: '#FDFAF4',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                color: '#1C1C1A',
                                letterSpacing: 1,
                              }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={cancelDeleteConfirm}
                                style={{
                                  padding: '10px 16px',
                                  background: 'transparent',
                                  border: '0.5px solid rgba(28,28,26,0.18)',
                                  borderRadius: 2,
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 12,
                                  color: '#7A7469',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flex: isMobile ? 1 : undefined,
                                }}
                              >
                                {t.cancel}
                              </button>
                              <button
                                onClick={executeDelete}
                                style={{
                                  padding: '10px 18px',
                                  background: 'rgba(176,32,32,0.85)',
                                  color: '#FDFAF4',
                                  border: 'none',
                                  borderRadius: 2,
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  opacity: deleteReady ? 1 : 0.4,
                                  flex: isMobile ? 1 : undefined,
                                }}
                              >
                                {t.confirm_delete}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
