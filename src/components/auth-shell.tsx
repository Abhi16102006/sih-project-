import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
      {footer ? (
        <div className="mt-7">
          <div className="flex items-center gap-2.5" aria-hidden>
            <span className="h-px flex-1 bg-line-soft" />
            <span className="size-1 rotate-45 bg-brass-soft" />
            <span className="h-px flex-1 bg-line-soft" />
          </div>
          <p className="mt-4 text-center text-sm text-ink-faint">{footer}</p>
        </div>
      ) : null}
    </>
  );
}
