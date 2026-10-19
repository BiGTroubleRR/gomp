'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  type OrderTicketData,
  TICKET_T,
  BARCODE_SPACING,
  barcodeBars,
  estimatedDelivery,
  formatTicketDate,
  seedFromString,
  seededRandom,
  ticketMoney,
} from '@/lib/order-ticket';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  ACCENT,
  ACCENT_DEEP,
  BORDER,
  BORDER_STRONG,
  FONT_MONO,
  FONT_SANS,
  FONT_SERIF,
  GOLD,
  GOLD_LIGHT,
  INK,
  MUTED,
  PAGE_BG,
  PANEL_BG,
  SURFACE_ALT,
} from '@/lib/design-tokens';

// The order "ticket" shown on the checkout confirmation screen — the on-screen twin of the
// confirmation email (src/lib/email/resend.ts). Both render the same OrderTicketData with the same
// copy from src/lib/order-ticket.ts. Ported from a Tailwind/shadcn ticket card to this site's
// inline-style + design-token convention.

const CONFETTI_COLORS = [ACCENT, '#2F9E66', GOLD, GOLD_LIGHT, INK, '#5FB98A'];
const CONFETTI_COUNT = 90;

// Confetti positions/timings come from a seeded hash of the reference code, not Math.random(): the
// render stays pure and every ticket gets its own (stable) pattern.
function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const r = (n: number) => seededRandom(seed + i * 7 + n);
        return {
          left: r(1) * 100,
          top: -20 + r(2) * 10,
          rotate: r(3) * 360,
          duration: 2.5 + r(4) * 2.5,
          delay: r(5) * 2,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        };
      }),
    [seed],
  );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 16,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `gompConfettiFall ${p.duration}s ${p.delay}s linear forwards`,
          }}
        />
      ))}
    </div>
  );
}

// Dashed divider with the ticket cut-outs: two page-coloured circles that bite into the card's edges.
function TearLine() {
  const notch = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    [side]: -16,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: PAGE_BG,
    boxShadow: `inset ${side === 'left' ? '-1px' : '1px'} 0 0 ${BORDER_STRONG}`,
  });
  return (
    <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }} aria-hidden="true">
      <div style={notch('left')} />
      <div style={{ flex: 1, margin: '0 24px', borderTop: `2px dashed ${BORDER_STRONG}` }} />
      <div style={notch('right')} />
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: FONT_SANS, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, marginBottom: 4 }}>{children}</div>
  );
}

function Barcode({ value }: { value: string }) {
  const bars = barcodeBars(value);
  const total = bars.reduce((acc, b) => acc + b.width + BARCODE_SPACING, 0) - BARCODE_SPACING;
  const rects = bars.map((b, i) => ({ ...b, x: bars.slice(0, i).reduce((acc, p) => acc + p.width + BARCODE_SPACING, 0) }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={Math.min(total, 280)} viewBox={`0 0 ${total} 50`} height={50} preserveAspectRatio="none" aria-hidden="true" style={{ fill: INK, maxWidth: '100%' }}>
        {rects.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.width} height={50} />
        ))}
      </svg>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: '0.3em', color: MUTED, marginTop: 10 }}>{value}</div>
    </div>
  );
}

export default function OrderTicket({ order }: { order: OrderTicketData }) {
  const t = TICKET_T[order.lang];
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [confettiOn, setConfettiOn] = useState(false);
  useEffect(() => {
    const start = setTimeout(() => setConfettiOn(true), 100);
    const stop = setTimeout(() => setConfettiOn(false), 6500);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, []);

  const money = (n: number) => ticketMoney(n, order.currency);
  const ship = t.shippingNames[order.shippingMethod];
  const sum = (name: string, value: string, color: string = MUTED) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: FONT_SANS, fontSize: 12, color: MUTED, padding: '3px 0' }}>
      <span>{name}</span>
      <span style={{ color, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );

  return (
    <>
      {confettiOn && !reducedMotion && <Confetti seed={seedFromString(order.referenceCode)} />}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          background: PANEL_BG,
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 16,
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)',
          textAlign: 'left',
          animation: 'gompFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Header */}
        <div style={{ padding: '30px 28px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(63,174,116,0.12)',
              border: `1px solid ${ACCENT_DEEP}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'gompPulse 1.8s ease-in-out 0.4s both',
            }}
          >
            <svg width={32} height={32} viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <polyline
                points="8,18 15,25 28,11"
                stroke={ACCENT}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={60}
                strokeDashoffset={60}
                style={{ animation: 'gompCheckDraw 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
              />
            </svg>
          </div>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600, color: INK, margin: '18px 0 6px' }}>{t.heading}</h2>
          <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: 0 }}>{t.subtitle}</p>
        </div>

        <TearLine />

        <div style={{ padding: '14px 28px 0' }}>
          {/* Reference + total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <Label>{t.reference}</Label>
              <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: GOLD }}>{order.referenceCode}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Label>{t.total}</Label>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: ACCENT, whiteSpace: 'nowrap' }}>{money(order.total)}</div>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Label>{t.dateTime}</Label>
            <div style={{ fontFamily: FONT_SANS, fontSize: 14, color: INK }}>{formatTicketDate(order.createdAt, order.lang)}</div>
          </div>

          {/* Delivery / payment / shipping */}
          <div style={{ marginTop: 20, background: SURFACE_ALT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <Label>{t.deliverTo}</Label>
            <div style={{ fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.6, color: INK }}>
              {[order.customerName, ...order.addressLines, order.email].filter(Boolean).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <Label>{t.payment}</Label>
                <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, color: INK }}>{t.payments[order.paymentMethod]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Label>{t.shipping}</Label>
                <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, color: INK }}>{ship.name}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: MUTED }}>{ship.eta}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0' }} />
            <Label>{t.buildTime}</Label>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 15, color: INK }}>{estimatedDelivery(order.createdAt, order.shippingMethod, order.lang)}</div>
          </div>

          {/* Items + breakdown */}
          <div style={{ marginTop: 22 }}>
            <Label>{t.items}</Label>
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i === order.items.length - 1 ? 'none' : `1px solid ${BORDER}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED, marginBottom: 2 }}>{item.category}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: INK }}>{item.name}</div>
                </div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 13, color: INK, whiteSpace: 'nowrap' }}>{money(item.price)}</div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BORDER_STRONG}`, margin: '6px 0 8px' }} />
            {sum(t.parts, money(order.partsTotal))}
            {sum(t.assembly, money(order.assembly))}
            {sum(`${t.shippingFee} · ${ship.name}`, order.shipping > 0 ? money(order.shipping) : t.free)}
            {order.discount > 0 && sum(order.promoCode ? `${t.discount} (${order.promoCode})` : t.discount, `−${money(order.discount)}`, ACCENT)}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `2px solid ${ACCENT_DEEP}`, marginTop: 8, paddingTop: 12 }}>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 16, color: INK }}>{t.total}</span>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 600, color: ACCENT, whiteSpace: 'nowrap' }}>{money(order.total)}</span>
            </div>
            <div style={{ textAlign: 'right', fontFamily: FONT_SANS, fontSize: 11, color: MUTED, marginTop: 6 }}>{t.vatNote}</div>
          </div>
        </div>

        <div style={{ height: 22 }} />
        <TearLine />

        <div style={{ padding: '18px 28px 8px' }}>
          <Barcode value={order.referenceCode} />
        </div>
        <div style={{ padding: '10px 28px 26px', fontFamily: FONT_SANS, fontSize: 11.5, lineHeight: 1.7, color: MUTED }}>{t.note}</div>
      </div>
    </>
  );
}
