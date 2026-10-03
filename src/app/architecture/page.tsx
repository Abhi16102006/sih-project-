import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { Doodle, Underline } from "@/components/doodle";
import { RPC_URL, CONTRACT_ADDRESS } from "@/lib/chain";
import deployment from "@/lib/contract/deployment.json";

export const metadata: Metadata = { title: "Architecture" };

const LAYERS = [
  {
    name: "Presentation",
    tech: "Next.js 16 · React 19 · Tailwind v4",
    body: "App Router with server components for data-heavy pages and client components only where interactivity is required (upload, verify, transfer). No external UI kit; the design system is defined in CSS tokens.",
  },
  {
    name: "Application",
    tech: "Next.js Route Handlers · Server Actions",
    body: "Auth, upload, transfer, flagging and QR generation. Validation with Zod, sessions as signed httpOnly JWT cookies, passwords hashed with bcrypt.",
  },
  {
    name: "Data",
    tech: "SQLite (better-sqlite3) · content-addressed blob store",
    body: "Artists, certificates and similarity checks in SQLite with WAL mode. Artwork bytes are stored under data/ipfs-blocks/ keyed by their real IPFS CID, so moving to a public gateway later requires no code change.",
  },
  {
    name: "Analysis",
    tech: "sharp · perceptual hashing",
    body: "A 256-bit difference hash plus a 4x4 average-RGB grid produce a copy-resistant fingerprint, compared in Hamming space against the full catalogue.",
  },
  {
    name: "Chain",
    tech: "Solidity 0.8 · ERC-721 · Hardhat",
    body: "ArtworkRegistry stores certificates as tokens and refuses duplicate content hashes. Transfers are appended to an immutable provenance array inside the contract.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header className="relative">
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-brass uppercase">
          Under the hood
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          <Underline seed={17}>Architecture</Underline>
        </h1>
        <Doodle
          variant="arrowDown"
          width={20}
          height={32}
          seed={29}
          strokeWidth={1.7}
          className="doodle-mark top-1 right-2 hidden -rotate-[20deg] lg:block"
        />
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Five layers, each replaceable on its own. The app runs fully offline against a local
          chain; pointing it at Polygon is a matter of changing two constants.
        </p>
      </header>

      {/* The stack drawn as a cutaway: each layer in the margin, then its job. */}
      <ol className="mt-12 border-t border-line-soft">
        {LAYERS.map((l, i) => (
          <li
            key={l.name}
            className="grid gap-x-8 gap-y-2 border-b border-line-soft py-7 sm:grid-cols-[2rem_11rem_minmax(0,1fr)] sm:items-baseline"
          >
            <span className="font-mono text-sm text-brass tabular-nums">
              L{i + 1}
            </span>
            <div>
              <h2 className="font-display text-lg leading-tight font-semibold">{l.name}</h2>
              <p className="mt-1 font-mono text-[11px] text-ink-faint">{l.tech}</p>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{l.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 mb-4 flex items-center gap-2.5">
        <h2 className="catalogue text-ink-faint">Deployed contract</h2>
        <span className="h-px flex-1 bg-line-soft" aria-hidden />
      </div>
      <div className="divide-y divide-line-soft rounded-lg border border-line-soft bg-surface/50">
        <Row label="Name" value={deployment.contractName ?? "ArtworkRegistry"} />
        <Row label="Address" value={CONTRACT_ADDRESS} mono />
        <Row label="Chain ID" value={String(deployment.chainId)} />
        <Row label="RPC" value={RPC_URL} mono />
        <Row label="Solidity" value="0.8.28 (optimizer, 200 runs, Cancun EVM)" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/how-it-works" className={buttonClass("primary", "md")}>
          Read the full pipeline
        </Link>
        <Link href="/verify" className={buttonClass("secondary", "md")}>
          Try the verifier
        </Link>
      </div>

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-ink-faint">
        Polygon-compatible by design. Nothing in the contract depends on chain-specific logic, so
        moving off the local chain is a configuration change, not a rewrite.
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-xs text-ink-faint">{label}</span>
      <span className={`truncate text-sm text-ink-muted ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
