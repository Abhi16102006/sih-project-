import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-line bg-surface px-3.5 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors " +
  "hover:border-line-soft focus:border-brass-dim focus:outline-none " +
  "disabled:opacity-50";

export function Field({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & ComponentProps<"input">) {
  return (
    <div className={cn("mb-4", className)}>
      <label htmlFor={props.name} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input id={props.name} className={cn(base, "h-11")} {...props} />
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & ComponentProps<"textarea">) {
  return (
    <div className={cn("mb-4", className)}>
      <label htmlFor={props.name} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <textarea id={props.name} rows={3} className={cn(base, "py-2.5")} {...props} />
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
