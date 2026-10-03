import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ambienceStyle, NEUTRAL, type Ambience } from "@/lib/palette";

/* ===========================================================================
   Primitives
   =========================================================================== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-tight " +
  "transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none " +
  "whitespace-nowrap select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  // Ink, not brass. A black button on white paper is unambiguous and needs no
  // gradient to look solid.
  primary:
    "bg-ink text-white hover:bg-ink-muted active:bg-ink",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line-soft",
  ghost:
    "text-ink-muted hover:text-ink border border-transparent hover:bg-surface-2",
  danger: "bg-crimson text-white hover:brightness-110",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

type ButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function ActionButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

/* ===========================================================================
   Badge — a catalogue stamp, not a chat pill. Square corners, hairline rule,
   wide tracking, so it reads as something printed next to a plate number.
   =========================================================================== */

type Tone = "brass" | "sage" | "crimson" | "neutral" | "terracotta";

const tones: Record<Tone, string> = {
  brass: "text-brass border-brass/25 bg-brass-tint",
  sage: "text-sage border-sage/25 bg-sage/8",
  crimson: "text-crimson border-crimson/25 bg-crimson/8",
  terracotta: "text-terracotta border-terracotta/25 bg-terracotta/8",
  neutral: "text-ink-muted border-line bg-surface-2",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px]",
        "text-[10px] font-semibold tracking-[0.14em] uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ===========================================================================
   Card — a surface with a top highlight and a soft cast shadow. Optional
   ambience lets it take on the colour of whatever it is describing.
   =========================================================================== */

export function Card({
  id,
  className,
  ambience,
  children,
}: {
  id?: string;
  className?: string;
  ambience?: Ambience;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      style={ambience ? ambienceStyle(ambience) : undefined}
      className={cn("relative rounded-lg border border-line-soft bg-surface", className)}
    >
      {children}
    </div>
  );
}

/* ===========================================================================
   Plate — an artwork hung on a wall. The mat is drawn by .plate in globals,
   the image sits inside it, and the whole thing settles into place on load.
   =========================================================================== */

export function Plate({
  src,
  alt,
  className,
  frameClassName,
  ambience = NEUTRAL,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  frameClassName?: string;
  ambience?: Ambience;
  priority?: boolean;
}) {
  return (
    <div
      style={ambienceStyle(ambience)}
      className={cn("plate overflow-hidden rounded-sm", frameClassName)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "block size-full object-cover",
          "animate-[settle_0.7s_cubic-bezier(0.16,1,0.3,1)_both]",
          className,
        )}
      />
    </div>
  );
}

/* ===========================================================================
   Section heading — numbered like a catalogue entry so sections read as
   chapters rather than as marketing sections.
   =========================================================================== */

export function SectionTitle({
  number,
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  number?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {(number || eyebrow) && (
        <div
          className={cn(
            "mb-4 flex items-center gap-3",
            align === "center" && "justify-center",
          )}
        >
          {number && (
            <span className="font-mono text-xs text-brass tabular-nums">{number}</span>
          )}
          {number && eyebrow && <span className="h-px w-6 bg-line" aria-hidden />}
          {eyebrow && <span className="catalogue text-ink-faint">{eyebrow}</span>}
        </div>
      )}
      <h2 className="text-3xl leading-[1.1] font-semibold text-balance sm:text-[2.625rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-muted text-pretty">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ===========================================================================
   Empty state
   =========================================================================== */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-20 text-center">
      {icon ? <div className="mb-5 text-line">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

/* ===========================================================================
   ScoreBadge — the authenticity mark. The number is the headline; the word is
   small, quiet, and set in the display face so it reads as a judgement rather
   than a status pill.
   =========================================================================== */

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 90 ? "sage" : score >= 70 ? "brass" : "crimson";
  const label = score >= 90 ? "genuine" : score >= 70 ? "review" : "suspect";
  return (
    <Badge tone={tone} className={className}>
      <span className="font-mono tabular-nums">{score}</span>
      <span className="opacity-70">· {label}</span>
    </Badge>
  );
}
