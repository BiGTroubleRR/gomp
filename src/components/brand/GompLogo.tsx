import type { SVGProps } from "react";

/**
 * GOMP logo – inline SVG, žiadna závislosť na fonte ani na obrázkoch.
 *
 *   <GompLogo />                                   horizontálne, zlatý znak + krémové písmo (tmavé pozadie)
 *   <GompLogo tone="green" />                      na svetlom podklade
 *   <GompLogo variant="stacked" height={160} />    stohované
 *   <GompMark size={32} />                         samotný znak
 *
 * Veľkosť sa nastavuje výškou (alebo šírkou); pomer strán ostáva zachovaný.
 */

export type GompTone = "gold" | "green" | "white" | "black";

const TONES: Record<GompTone, { mark: string; word: string }> = {
  gold: { mark: "#c4a35a", word: "#ebe6da" }, // na tmavom (predvolené)
  green: { mark: "#1f8a55", word: "#0d0d0c" }, // na svetlom
  white: { mark: "#fdfaf4", word: "#fdfaf4" }, // na zelenej / fotke
  black: { mark: "#0d0d0c", word: "#0d0d0c" }, // tlač v jednej farbe
};

type SvgProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children" | "width" | "height">;

const MARK_PATH = "M70 28 L50 8 L8 50 L50 92 L92 50 L56 50";

const LETTERS: ReadonlyArray<readonly [number, string]> = [
  [5, "M52 0 L14 0 L0 14 L0 56 L14 70 L42 70 L56 56 L56 38 L30 38"], // G
  [85, "M14 0 L42 0 L56 14 L56 56 L42 70 L14 70 L0 56 L0 14 Z"], // O
  [165, "M0 70 L0 0 L37 40 L74 0 L74 70"], // M
  [263, "M0 70 L0 0 L38 0 L52 14 L52 32 L38 46 L0 46"], // P
];

const CLIP_ID = "gomp-cap-clip";

function MarkShape({ color, strokeWidth = 10 }: { color: string; strokeWidth?: number }) {
  return (
    <path
      d={MARK_PATH}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="miter"
      strokeMiterlimit={2}
      strokeLinecap="butt"
    />
  );
}

function WordShape({ color }: { color: string }) {
  return (
    <g clipPath={`url(#${CLIP_ID})`}>
      {LETTERS.map(([x, d]) => (
        <path
          key={x}
          transform={`translate(${x} 0)`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinejoin="miter"
          strokeMiterlimit={20}
          strokeLinecap="butt"
        />
      ))}
    </g>
  );
}

const Defs = () => (
  <defs>
    <clipPath id={CLIP_ID}>
      <rect x={-10} y={-5} width={340} height={80} />
    </clipPath>
  </defs>
);

export interface GompLogoProps extends SvgProps {
  variant?: "horizontal" | "stacked";
  tone?: GompTone;
  /** Výška v px (alebo CSS hodnota). Ak je zadaná aj šírka, platí šírka a výška sa dopočíta. */
  height?: number | string;
  width?: number | string;
  title?: string;
}

export function GompLogo({
  variant = "horizontal",
  tone = "gold",
  height,
  width,
  title = "GOMP",
  ...rest
}: GompLogoProps) {
  const c = TONES[tone];
  const stacked = variant === "stacked";
  const vb = stacked ? "-2 -2 324 243" : "-2 -7 438 84";
  const ratio = stacked ? 324 / 243 : 438 / 84;

  // Predvolene výška 32 px v hlavičke; ak je zadaná len šírka, výška sa dopočíta z pomeru strán.
  const h = height ?? (width === undefined ? 32 : undefined);
  const size =
    h !== undefined
      ? { height: h, width: typeof h === "number" ? Math.round(h * ratio) : "auto" }
      : { width, height: typeof width === "number" ? Math.round(width / ratio) : "auto" };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={vb}
      role="img"
      aria-label={title}
      {...size}
      {...rest}
    >
      <title>{title}</title>
      <Defs />
      {stacked ? (
        <>
          <g transform="translate(97.5 0) scale(1.25)">
            <MarkShape color={c.mark} />
          </g>
          <g transform="translate(0 164)">
            <WordShape color={c.word} />
          </g>
        </>
      ) : (
        <>
          <g transform="translate(0 -7) scale(0.84)">
            <MarkShape color={c.mark} />
          </g>
          <g transform="translate(114 0)">
            <WordShape color={c.word} />
          </g>
        </>
      )}
    </svg>
  );
}

export interface GompMarkProps extends SvgProps {
  tone?: GompTone;
  /** Strana v px. Pod 24 px použi strokeWidth={13} (hrubší ťah, ako vo favicone). */
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export function GompMark({ tone = "gold", size = 32, strokeWidth = 10, title = "GOMP", ...rest }: GompMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      {...rest}
    >
      <title>{title}</title>
      <MarkShape color={TONES[tone].mark} strokeWidth={strokeWidth} />
    </svg>
  );
}

export default GompLogo;
