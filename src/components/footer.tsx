import Link from "next/link";
import { IconPalette } from "./icons";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/gallery", label: "Gallery" },
      { href: "/artists", label: "Artists" },
      { href: "/upload", label: "Register artwork" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/verify", label: "Verify a certificate" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/architecture", label: "Architecture" },
    ],
  },
];

export function Footer() {
  return (
    // Reads as a colophon: the back matter of a printed catalogue.
    <footer className="border-t border-line-soft">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-sm border border-line bg-surface text-brass">
                <IconPalette className="size-4" />
              </span>
              <span className="font-display text-base font-semibold">
                Kala<span className="text-brass">Secure</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-faint">
              An artist-first copyright and provenance layer for fine art. Built for Smart
              India Hackathon 2026.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="flex items-center gap-2.5 text-ink-faint">
                <span className="catalogue">{col.title}</span>
                <span className="h-px flex-1 bg-line-soft" aria-hidden />
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-faint transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line-soft pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Next.js, Solidity, Hardhat and perceptual hashing. No proprietary APIs.</p>
          <p className="font-mono tracking-[0.1em]">SIH 2026 / FINE ARTS</p>
        </div>
      </div>
    </footer>
  );
}