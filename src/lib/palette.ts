/**
 * Turning a stored fingerprint into a palette for the page that describes it.
 *
 * We already compute a 4x4 grid of average RGB for every registered artwork to
 * catch re-derivations (see `perceptual-hash.ts`). Those 48 bytes describe where
 * the colour sits in the picture, which makes them good for one more job: giving
 * each artwork an accent taken from its own colours.
 *
 * The point is that the accent is not a random colour, and not a category we
 * hand-assigned. Two Konkan monsoon pieces look alike because they contain the
 * same blues and greys, so they get the same accent. Two works by the same
 * artist in different media diverge, and so do their accents.
 *
 * Lightness is held down rather than up. The source colours come out of images
 * at full brightness, which on a near-white page would be unreadable and would
 * read as decoration. At this lightness the accent works as a rule, a mark or a
 * large numeral, and always clears 3:1 against the paper.
 */

export type Ambience = {
  /** Mid-dark saturated hue. Safe as a mark or large numeral on paper. */
  accent: string;
  /** The same hue at near-paper lightness. Used for tinted fills. */
  wash: string;
  /** The same hue as a very pale fill, for hover states. */
  glow: string;
  /** Deepest tone, for ink-on-tint treatments. */
  deep: string;
  /** Which of the 16 cells the accent came from, 0-15. */
  cell: number;
  /** Cell coordinates as "r,c", handy for labelling. */
  cellLabel: string;
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = l - c / 2;
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round((v + m) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

/** Pull the 16 RGB cells out of a stored fingerprint's colour signature. */
export function cellsFromFingerprint(stored: string | null | undefined): Rgb[] | null {
  if (!stored) return null;
  let fp: { histogram?: string };
  try {
    fp = JSON.parse(stored);
  } catch {
    return null;
  }
  const hex = fp?.histogram;
  if (typeof hex !== "string" || hex.length < 96) return null;

  const cells: Rgb[] = [];
  for (let i = 0; i < 16; i += 1) {
    cells.push(hexToRgb(hex.slice(i * 6, i * 6 + 6)));
  }
  return cells;
}

/** Neutral fallback, so a page without a fingerprint still looks deliberate. */
export const NEUTRAL: Ambience = {
  accent: "#a87c12",
  wash: "#f6efdd",
  glow: "rgba(168, 124, 18, 0.08)",
  deep: "#4a3808",
  cell: 0,
  cellLabel: "1,1",
};

/**
 * Build the room. Picks the cell that carries the most character: saturation,
 * nudged by distance from the picture's own mean so we do not simply pick the
 * most colourful square when the whole image is uniformly colourful.
 */
export function ambienceFrom(stored: string | null | undefined): Ambience {
  const cells = cellsFromFingerprint(stored);
  if (!cells) return NEUTRAL;

  const mean = cells.reduce(
    (a, c) => ({ r: a.r + c.r / 16, g: a.g + c.g / 16, b: a.b + c.b / 16 }),
    { r: 0, g: 0, b: 0 },
  );

  let best = 0;
  let bestScore = -Infinity;
  cells.forEach((c, i) => {
    const { s, l } = rgbToHsl(c);
    const dist =
      Math.abs(c.r - mean.r) + Math.abs(c.g - mean.g) + Math.abs(c.b - mean.b);
    // Very dark and very pale cells carry no usable hue; discount them.
    const usable = l > 0.06 && l < 0.96 ? 1 : 0.25;
    const score = (s * 0.75 + (dist / 765) * 0.25) * usable;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });

  const cell = cells[best];
  const { h, s: srcSat } = rgbToHsl(cell);
  const row = Math.floor(best / 4);
  const col = best % 4;

  // A near-neutral cell has no meaningful hue: its HSL hue is just an artefact
  // of floating-point noise, and following it would give a charcoal study a
  // random colour. Those fall back to brass, which is what the room is fitted
  // with anyway.
  const nearNeutral = srcSat < 0.09;
  const hue = nearNeutral ? 84 : h;

  // Chroma follows the source instead of being normalised. A saturated painting
  // gets a saturated room; a muted ink work gets a quiet one. Holding every work
  // at the same intensity is what makes this look generated.
  const sat = nearNeutral ? 0.5 : 0.3 + srcSat * 0.38;
  const lum = 0.32;

  return {
    accent: hslToHex(hue, sat, lum),
    wash: hslToHex(hue, Math.min(sat * 0.5, 0.34), 0.955),
    glow: `hsla(${Math.round(hue)}, ${Math.round(sat * 100)}%, 42%, 0.08)`,
    deep: hslToHex(hue, sat * 0.5, 0.24),
    cell: best,
    cellLabel: `${row + 1},${col + 1}`,
  };
}

/**
 * Inline custom properties so ambience can be applied to any element without a
 * new Tailwind class per colour.
 */
export function ambienceStyle(a: Ambience): React.CSSProperties {
  return {
    ["--amb-accent" as string]: a.accent,
    ["--amb-wash" as string]: a.wash,
    ["--amb-glow" as string]: a.glow,
    ["--amb-deep" as string]: a.deep,
  } as React.CSSProperties;
}
