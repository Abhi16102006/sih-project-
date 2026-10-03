/**
 * Hand-drawn marks, generated with rough.js.
 *
 * Every path here is produced by rough.js's geometry, so the wobble is real
 * double-stroke sketching rather than a filter or a hand-tuned bezier. Nothing
 * ships to the browser: this is a server component, so the geometry is turned
 * into path data once at request time and emitted as plain inline SVG.
 *
 * Two rules keep this from turning into clipart spam:
 *
 *   1. Every mark is `aria-hidden` and never intercepts a pointer. A decoration
 *      that a screen reader has to skip through is a decoration that should not
 *      be in the document.
 *   2. `stroke="currentColor"`, so a mark inherits whatever ink the component
 *      around it already uses. One colour per page, decided by context.
 *
 * Positions are always absolute overlays with negative offsets, so a doodle
 * annotates the thing next to it rather than pushing layout around. See
 * `.doodle` in globals.css for the shared anchoring.
 */

import rough from "roughjs";
import type { Drawable, Options, OpSet } from "roughjs/bin/core";

export type DoodleVariant =
  | "circle"
  | "ellipse"
  | "box"
  | "dashedBox"
  | "underline"
  | "doubleUnderline"
  | "arrowRight"
  | "arrowDown"
  | "arrowLeft"
  | "star"
  | "sparkle"
  | "check"
  | "cross"
  | "brace"
  | "bracketLeft"
  | "scribble"
  | "loop";

/** One generator for the whole process; rough.js is stateless per drawable. */
const gen = rough.generator();

/** Rough options tuned for hairlines on paper rather than for a marker pen. */
const SKETCH: Options = {
  roughness: 1.1,
  bowing: 1.2,
  stroke: "currentColor",
  strokeWidth: 1.5,
  fill: "none",
  fillStyle: "solid",
};

type Sketch = { d: string; fill?: string };

/** rough.js centres shapes on the given point, so all maths below is in
 *  half-extent space. Keeping it explicit stops the off-by-half errors that
 *  otherwise come from mixing `rectangle` (corner origin) with `ellipse`
 *  (centre origin). */
function build(
  variant: DoodleVariant,
  w: number,
  h: number,
  seed: number,
): Sketch[] {
  const o: Options = { ...SKETCH, seed };
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const path = (d: Drawable | Drawable[], fill?: string): Sketch[] => {
    const sets: OpSet[] = Array.isArray(d) ? d.flatMap((x) => x.sets) : d.sets;
    return sets.map((set) => ({
      d: gen.opsToPath(set, 1),
      ...(fill ? { fill } : {}),
    }));
  };

  switch (variant) {
    case "circle":
      return path(gen.circle(cx, cy, Math.min(w, h) / 2 - 1, o));

    case "ellipse":
      return path(gen.ellipse(cx, cy, rx - 1, ry - 1, o));

    case "box":
      return path(gen.rectangle(1, 1, w - 2, h - 2, o));

    case "dashedBox":
      return path(
        gen.rectangle(1, 1, w - 2, h - 2, {
          ...o,
          strokeLineDash: [7, 6],
        }),
      );

    case "underline":
      // A single swash that overshoots both ends, the way a hand does.
      return path(
        gen.linearPath(
          [
            [-2, 3],
            [w * 0.22, 1],
            [w * 0.48, 4],
            [w * 0.74, 0.5],
            [w + 2, 2.5],
          ],
          o,
        ),
      );

    case "doubleUnderline":
      return [
        ...path(
          gen.linearPath(
            [
              [0, 2],
              [w * 0.35, 0],
              [w * 0.68, 3],
              [w, 1],
            ],
            o,
          ),
        ),
        ...path(
          gen.linearPath(
            [
              [2, 6],
              [w * 0.4, 5],
              [w * 0.72, 7.5],
              [w - 1, 5.5],
            ],
            { ...o, seed: seed + 7 },
          ),
        ),
      ];

    case "arrowRight":
      // A shaft, then two barbs. rough.js has no arrow primitive on the
      // generator, so it is assembled the way a hand would.
      return [
        ...path(
          gen.linearPath(
            [
              [1, cy - 1],
              [w * 0.4, cy + 2],
              [w * 0.72, cy - 1.5],
              [w - 9, cy],
            ],
            o,
          ),
        ),
        ...path(
          gen.linearPath(
            [
              [w - 9, cy - 6.5],
              [w - 1.5, cy],
              [w - 8.5, cy + 6],
            ],
            { ...o, seed: seed + 3 },
          ),
        ),
      ];

    case "arrowLeft":
      return [
        ...path(
          gen.linearPath(
            [
              [w - 1, cy - 1],
              [w * 0.6, cy + 2],
              [w * 0.28, cy - 1.5],
              [9, cy],
            ],
            o,
          ),
        ),
        ...path(
          gen.linearPath(
            [
              [9, cy - 6.5],
              [1.5, cy],
              [8.5, cy + 6],
            ],
            { ...o, seed: seed + 3 },
          ),
        ),
      ];

    case "arrowDown":
      return [
        ...path(
          gen.linearPath(
            [
              [cx - 1, 1],
              [cx + 2, h * 0.36],
              [cx - 1.5, h * 0.68],
              [cx, h - 9],
            ],
            o,
          ),
        ),
        ...path(
          gen.linearPath(
            [
              [cx - 6.5, h - 9],
              [cx, h - 1.5],
              [cx + 6, h - 8.5],
            ],
            { ...o, seed: seed + 3 },
          ),
        ),
      ];

    case "star": {
      // Four-point sparkle: two crossed strokes, pinched at the middle.
      const pts: [number, number][] = [];
      const arms = 8;  // 8 segments of 45 degrees, every other one at full reach.
      for (let i = 0; i <= arms; i += 1) {
        const t = (Math.PI * 2 * i) / arms - Math.PI / 2;
        // Pinch the horizontal reach so the mark reads as a four-point sparkle
        // rather than a four-point blob when the box is wide.
        const rxR = Math.min(rx * 0.52, ry * 0.52);
        const r = i % 2 === 0 ? 1 : 0.2;
        pts.push([
          cx + Math.cos(t) * (rxR * r),
          cy + Math.sin(t) * ((ry - 1) * r),
        ]);
      }
      return path(gen.polygon(pts, o));
    }

    case "sparkle":
      return [
        ...path(
          gen.line(cx, 1, cx, h - 1, o),
        ),
        ...path(gen.line(1, cy, w - 1, cy, o)),
        ...path(
          gen.line(cx - w * 0.18, cy - h * 0.18, cx + w * 0.18, cy + h * 0.18, o),
        ),
        ...path(
          gen.line(cx + w * 0.18, cy - h * 0.18, cx - w * 0.18, cy + h * 0.18, o),
        ),
      ];

    case "check":
      return path(
        gen.linearPath(
          [
            [2, h * 0.55],
            [w * 0.36, h - 2],
            [w - 2, 1],
          ],
          { ...o, strokeWidth: 2, bowing: 0.8 },
        ),
      );

    case "cross":
      return [
        ...path(gen.line(2, 2, w - 2, h - 2, { ...o, strokeWidth: 2 })),
        ...path(
          gen.line(w - 2, 2, 2, h - 2, { ...o, strokeWidth: 2, seed: seed + 5 }),
        ),
      ];

    case "brace":
      return path(
        gen.linearPath(
          [
            [w - 2, 1],
            [w * 0.55, h * 0.12],
            [w * 0.62, h * 0.44],
            [2, h * 0.5],
            [w * 0.62, h * 0.56],
            [w * 0.55, h * 0.88],
            [w - 2, h - 1],
          ],
          o,
        ),
      );

    case "bracketLeft":
      return path(
        gen.linearPath(
          [
            [w - 1, 1],
            [2, 1],
            [2, h - 1],
            [w - 1, h - 1],
          ],
          o,
        ),
      );

    case "scribble": {
      // A hand running back and forth, used as a section divider.
      const pts: [number, number][] = [];
      const steps = Math.max(6, Math.round(w / 12));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        pts.push([t * w, cy + (i % 2 === 0 ? -1 : 1) * ry * 0.62]);
      }
      return path(gen.linearPath(pts, { ...o, bowing: 0.5 }));
    }

    case "loop":
      // A roughly circular flourish, for annotating a value.
      return path(
        gen.ellipse(cx, cy, rx - 1, ry - 1, { ...o, seed: seed + 11 }),
      );

    default:
      return [];
  }
}

export function Doodle({
  variant,
  width = 100,
  height = 40,
  seed = 1,
  strokeWidth,
  className,
  style,
  stretch = false,
}: {
  variant: DoodleVariant;
  /** ViewBox width. Overlaid marks are sized by CSS, not by this. */
  width?: number;
  height?: number;
  /** Same variant + same seed always draws the same mark. Vary it for variety. */
  seed?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Stretch the mark to fill its box instead of letterboxing it. Needed for
   * anything CSS-sized to fit text, otherwise the pen shrinks to the viewBox
   * and sits in the middle of the word instead of around it.
   */
  stretch?: boolean;
}) {
  const draws = build(variant, width, height, seed);
  if (draws.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      {draws.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? "none"}
          stroke="currentColor"
          strokeWidth={strokeWidth ?? SKETCH.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/**
 * A circle drawn around inline text. The text is laid out normally and the
 * mark is an absolutely positioned overlay scaled to fit, so the circle always
 * tracks the real text box instead of being hand-positioned per breakpoint.
 */
export function CircleAround({
  children,
  seed = 5,
  className,
  style,
}: {
  children: React.ReactNode;
  seed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`doodle-circle ${className ?? ""}`} style={style}>
      {children}
      <Doodle
        variant="circle"
        width={110}
        height={44}
        seed={seed}
        strokeWidth={2}
        stretch
        className="doodle-circle__mark"
      />
    </span>
  );
}

/**
 * A hand-drawn swash under a run of text, for emphasising a phrase without
 * changing its colour or weight.
 */
export function Underline({
  children,
  seed = 3,
  double = false,
  className,
}: {
  children: React.ReactNode;
  seed?: number;
  double?: boolean;
  className?: string;
}) {
  return (
    <span className={`doodle-underline ${className ?? ""}`}>
      {children}
      <Doodle
        variant={double ? "doubleUnderline" : "underline"}
        width={110}
        height={double ? 12 : 8}
        seed={seed}
        strokeWidth={2.2}
        stretch
        className="doodle-underline__mark"
      />
    </span>
  );
}
