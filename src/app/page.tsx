import Link from "next/link";
import { db } from "@/lib/db";
import { chainIsLive } from "@/lib/chain";
import { Plate, SectionTitle, buttonClass } from "@/components/ui";
import {
  IconArrow,
  IconCpu,
  IconLink,
  IconQr,
  IconShield,
} from "@/components/icons";
import { ambienceFrom } from "@/lib/palette";
import { Doodle, CircleAround, Underline } from "@/components/doodle";

export const dynamic = "force-dynamic";

const PIPELINE = [
  {
    icon: IconLink,
    title: "Upload once",
    body: "The file is hashed with SHA-256 and saved under an address derived from its own contents. Change one pixel and the address changes.",
  },
  {
    icon: IconCpu,
    title: "Copies get caught",
    body: "A 256-bit shape fingerprint and a colour signature are compared against every registered work. A copy that was resized, re-saved or screenshotted is found before it can be listed.",
  },
  {
    icon: IconShield,
    title: "Anchored on-chain",
    body: "Title, artist, CID and hash are written into a Solidity contract. That record cannot be edited or deleted afterwards, including by us.",
  },
  {
    icon: IconQr,
    title: "Proven by scan",
    body: "Every artwork gets a printable QR label. Stick it to the frame; anyone who scans it sees the full ownership history.",
  },
];

const GAPS = [
  {
    t: "A certificate can be photocopied",
    d: "A scanned copyright certificate is a PDF. The same painting can be registered dozens of times under different names, and nothing in the file connects them.",
  },
  {
    t: "A stolen copy looks identical",
    d: "Once a painting leaves the studio there is no reliable way to tell the original from a high-resolution photograph of it.",
  },
  {
    t: "Disputes take years",
    d: "Without an immutable timestamped record, proving authorship means litigation, which is well beyond what an artist can afford.",
  },
];

export default async function HomePage() {
  const live = await chainIsLive().catch(() => false);

  const stats = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM artworks) AS artworks,
         (SELECT COUNT(*) FROM users)    AS artists,
         (SELECT COUNT(*) FROM artworks WHERE status = 'registered') AS anchored`,
    )
    .get() as { artworks: number; artists: number; anchored: number };

  const flagged = db
    .prepare(`SELECT COUNT(*) AS n FROM artworks WHERE authenticity < 80`)
    .get() as { n: number };

  // Five works, hung as a wall. `dhash` supplies each plate's own light.
  const wall = db
    .prepare(
      `SELECT a.id, a.title, a.ipfs_cid, a.authenticity, a.medium, a.dhash,
              a.dimensions, u.name AS artist
       FROM artworks a JOIN users u ON u.id = a.artist_id
       ORDER BY a.id ASC LIMIT 5`,
    )
    .all() as {
    id: number;
    title: string;
    ipfs_cid: string;
    authenticity: number;
    medium: string;
    dimensions: string;
    dhash: string;
    artist: string;
  }[];

  return (
    <>
      {/* ===================== THE WALL + THE STATEMENT ==================== */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 pt-16 pb-20 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16 lg:pb-28">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <span
                className={`size-1.5 rounded-full ${live ? "bg-sage" : "bg-ink-faint"}`}
                aria-hidden
              />
              <span className="catalogue text-ink-faint">
                {live ? "Chain live" : "Chain offline"}
              </span>
              <span className="h-px w-8 bg-line" aria-hidden />
              <span className="font-mono text-[11px] text-ink-faint">chain 31337</span>
            </div>

            <h1 className="mt-7 text-[2.75rem] leading-[0.98] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[4.25rem]">
              A certificate
              <br />
              you can&apos;t <Underline seed={4} double>photocopy</Underline>.
            </h1>
            {/* A hand-drawn asterisk in the margin, the way a reader marks
                the one line they want to remember. */}
            <Doodle
              variant="star"
              width={34}
              height={34}
              seed={12}
              strokeWidth={1.8}
              className="doodle-mark -top-2 right-0 hidden lg:block"
            />

            <p className="mt-7 max-w-lg text-[1.0625rem] leading-relaxed text-ink-muted text-pretty">
              KalaSecure anchors each artwork to a blockchain, catches copied work before
              it is listed, and lets anyone confirm a painting with one scan. No account,
              no wallet, no app.
            </p>

            <div className="relative mt-9 flex flex-wrap items-center gap-3">
              <Link href="/upload" className={buttonClass("primary", "lg")}>
                Register an artwork
                <IconArrow className="size-4" />
              </Link>
              <Link href="/verify" className={buttonClass("secondary", "lg")}>
                Verify a certificate
              </Link>
              <Doodle
                variant="arrowDown"
                width={22}
                height={34}
                seed={8}
                strokeWidth={1.8}
                className="doodle-mark -bottom-11 left-6 rotate-[28deg]"
              />
            </div>

            <p className="mt-5 text-xs text-ink-faint">
              The demo signer holds the keys, so no MetaMask prompt interrupts the flow.
            </p>
          </div>

          {/* Hung plates, deliberately uneven. Each throws light in its own colour. */}
          <div className="relative">
            <div className="grid grid-cols-6 gap-3 sm:gap-4">
              {wall.map((w, i) => {
                const amb = ambienceFrom(w.dhash);
                const spans = [
                  "col-span-4 aspect-[4/3]",
                  "col-span-2 aspect-square",
                  "col-span-2 aspect-square",
                  "col-span-4 aspect-[4/3]",
                  "col-span-4 aspect-[16/10] sm:col-span-6 sm:aspect-[16/7]",
                ][i];
                return (
                  <Link
                    key={w.id}
                    href={`/artwork/${w.id}`}
                    className={`group block ${spans} ${
                      i === 4 ? "col-start-2" : ""
                    }`}
                  >
                    <Plate
                      src={`/api/ipfs/${w.ipfs_cid}`}
                      alt={w.title}
                      ambience={amb}
                      frameClassName="h-full transition-transform duration-500 ease-out group-hover:-translate-y-1"
                      className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colophon strip: catalogue figures on one line, divided by rules. */}
        <div className="relative border-y border-line-soft">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line-soft sm:grid-cols-4">
            <Figure n={stats.artworks} label="Artworks anchored" />
            <Figure n={stats.anchored} label="Recorded on-chain" />
            <Figure n={stats.artists} label="Registered artists" />
            <Figure n={flagged.n} label="Held as copies" />
          </dl>
        </div>
      </section>

      {/* ============================= THE SEQUENCE ======================== */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
        <SectionTitle
          number="01"
          eyebrow="The sequence"
          title="Four things happen when you register"
          description="Each one closes a gap that currently has no practical answer for a working artist."
        />

        {/* A chain, drawn as a chain. One continuous line through all four. */}
        <ol className="mt-14 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((s, i) => (
            <li
              key={s.title}
              className="relative border-t border-line-soft pt-7 pr-6 pb-8 sm:pr-8"
            >
              <span
                className="absolute -top-[4.5px] left-0 size-2 rotate-45 border border-brass-dim bg-canvas"
                aria-hidden
              />
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-brass-dim tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <s.icon className="size-4.5 text-brass/70" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============================== THE GAP =========================== */}
      <section className="border-y border-line-soft">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-24">
            <div>
              <SectionTitle
                number="02"
                eyebrow="The gap"
                title="The paper certificate is the weakest link"
                description="A bank account settles on a public ledger. A painting settles on a signature somebody can copy."
              />

              <ul className="mt-10 space-y-0">
                {GAPS.map((g, i) => (
                  <li
                    key={g.t}
                    className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line-soft py-6"
                  >
                    <span className="font-mono text-xs text-brass-dim tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{g.t}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{g.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:pt-16">
              <p className="catalogue mb-7 text-ink-faint">What changes</p>
              <div className="space-y-0">
                <Change
                  t="Bound to the bytes, not to a claim"
                  d="The certificate is tied to a SHA-256 hash. The same file cannot be registered twice, because the contract refuses it."
                />
                <Change
                  t="Copies surface instead of hiding"
                  d="A re-saved duplicate is matched before minting, and its authenticity score drops on-chain where buyers can see it."
                />
                <Change
                  t="Every handover is on the record"
                  d="Sales, gifts and consignments append to the chain. The ownership history cannot be rewritten."
                />
                <Change
                  t="Checking costs nothing"
                  d="Scan the label on the painting. No login, no fee, no app to install. It works in an auction room."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ ON THE LEDGER ======================= */}
      {wall.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line-soft pb-6">
            <SectionTitle
              number="03"
              eyebrow="On the ledger"
              title="Recently anchored"
              className="max-w-none"
            />
            <Link
              href="/gallery"
              className="group mb-1 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-brass"
            >
              See all {stats.artworks}
              <IconArrow className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Doodle
              variant="arrowRight"
              width={40}
              height={16}
              seed={21}
              strokeWidth={1.8}
              className="doodle-mark -top-4 right-2 hidden rotate-[-8deg] sm:block"
            />
          </div>

          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {wall.slice(0, 3).map((w) => (
              <ArtworkPlate key={w.id} w={w} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ================================ CLOSE =========================== */}
      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:flex lg:items-center lg:justify-between lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <h2 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              Register your <CircleAround seed={9}>first work</CircleAround>
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
              Upload a file and you get a fingerprint, a certificate on the chain and a
              printable QR label. It takes about thirty seconds.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              Create an artist account
              <IconArrow className="size-4" />
            </Link>
            <Link href="/how-it-works" className={buttonClass("ghost", "lg")}>
              Read the architecture
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Figure({ n, label }: { n: number; label: string }) {
  return (
    <div className="px-5 py-6 sm:px-7">
      <dd className="font-display text-3xl font-semibold text-ink tabular-nums">{n}</dd>
      <dt className="mt-1.5 text-[11px] tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </dt>
    </div>
  );
}

function Change({ t, d }: { t: string; d: string }) {
  return (
    <div className="relative border-t border-line-soft py-6 pl-6">
      {/* A brass margin rule instead of an icon in a rounded square. */}
      <span
        className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-brass/55 via-brass/15 to-transparent"
        aria-hidden
      />
      <h3 className="font-semibold">{t}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{d}</p>
    </div>
  );
}

type WallItem = {
  id: number;
  title: string;
  ipfs_cid: string;
  authenticity: number;
  medium: string;
  dimensions: string;
  dhash: string;
  artist: string;
};

function ArtworkPlate({ w }: { w: WallItem }) {
  const amb = ambienceFrom(w.dhash);
  return (
    <Link href={`/artwork/${w.id}`} className="group block">
      <Plate
        src={`/api/ipfs/${w.ipfs_cid}`}
        alt={w.title}
        ambience={amb}
        frameClassName="aspect-[4/5] transition-transform duration-500 ease-out group-hover:-translate-y-1"
        className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5"
      />
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[1.0625rem] font-semibold">
            {w.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{w.artist}</p>
        </div>
        <span className="shrink-0 font-mono text-xs text-ink-faint tabular-nums">
          {w.authenticity}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] tracking-[0.1em] text-ink-faint uppercase">
        {w.medium}
      </p>
    </Link>
  );
}
