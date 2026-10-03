"use client";

import { useState, type ReactNode } from "react";
import { IconCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

export function CopyValue({
  value,
  display,
  href,
  mono = true,
  className,
}: {
  value: string;
  display: ReactNode;
  href?: string;
  mono?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    // When wrapped in an <a>, copying must not also follow the link.
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // The Clipboard API needs a secure context; fall back so the demo works
      // over plain http://localhost too.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      } finally {
        document.body.removeChild(ta);
      }
      if (!ok) return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const chip = (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy ${value}`}
      aria-label="Copy to clipboard"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded border border-line-soft",
        "bg-surface-2 px-2 py-1 text-xs text-ink-muted transition-colors hover:border-brass-dim hover:text-ink",
        mono && "font-mono",
        copied && "border-brass text-brass",
        className,
      )}
    >
      <span className="truncate">{display}</span>
      {copied ? (
        <IconCheck className="size-3 shrink-0" />
      ) : (
        <svg viewBox="0 0 16 16" className="size-3 shrink-0 opacity-60" aria-hidden>
          <rect x="5.5" y="5.5" width="8" height="9" rx="1.5" fill="none" stroke="currentColor" />
          <path
            d="M10.5 3.5v-1a1 1 1 0 0 0-1-1h-7a1 1 1 0 0 0-1 1v7a1 1 1 0 0 0 1 1h1"
            fill="none"
            stroke="currentColor"
          />
        </svg>
      )}
    </button>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="inline-block max-w-full">
        {chip}
      </a>
    );
  }
  return chip;
}
