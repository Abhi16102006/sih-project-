import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Artwork } from "@/lib/db";
import { readOwner, readProvenance, shortAddress } from "@/lib/chain";
import { Badge, Card, Plate, buttonClass } from "@/components/ui";
import { CopyValue } from "@/components/copy-value";
import { FlagButton, TransferButton } from "@/components/artwork-actions";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  shortCid,
  truncateHash,
  EXPLORER_BASE,
} from "@/lib/utils";
import {
  IconCheck,
  IconAlert,
  IconClock,
  IconLayers,
  IconDownload,
  IconLink,
  IconExternal,
  IconWallet,
} from "@/components/icons";
import { currentUser } from "@/lib/auth";
import { ambienceFrom, ambienceStyle } from "@/lib/palette";
import { Doodle, Underline } from "@/components/doodle";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const row = db.prepare("SELECT title FROM artworks WHERE id = ?").get(Number(id)) as
    | { title: string }
    | undefined;
  return { title: row ? `${row.title} · Certificate` : "Certificate" };
}

export default async function ArtworkPage({ params }: { params: Params }) {
  const { id } = await params;
  const artworkId = Number(id);
  if (!Number.isInteger(artworkId)) notFound();

  const row = db
    .prepare(
      `SELECT a.*, u.name AS artist_name, u.wallet AS artist_wallet, u.id AS artist_id
       FROM artworks a JOIN users u ON u.id = a.artist_id
       WHERE a.id = ?`,
    )
    .get(artworkId) as
    | (Artwork & { artist_name: string; artist_wallet: string | null; artist_id: number })
    | undefined;

  if (!row) notFound();

  const user = await currentUser();
  const owner = row.token_id ? await readOwner(row.token_id) : null;
  const provenance = row.token_id ? await readProvenance(row.token_id) : [];

  const isOwner = user?.id === row.artist_id;
  const score = row.authenticity;
  const tone = score >= 90 ? "sage" : score >= 70 ? "brass" : "crimson";

  // The room this certificate sits in is lit by the painting it describes.
  const amb = ambienceFrom(row.dhash);

  return (
    <div style={ambienceStyle(amb)} className="mx-auto max-w-6xl px-5 py-12">
      <nav className="mb-8 flex items-center gap-2 text-xs text-ink-faint">
        <Link href="/gallery" className="hover:text-ink">
          Gallery
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-ink-muted">{row.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        {/* ------------------------- image + QR ------------------------- */}
        <div className="relative">
          <Plate
            src={`/api/ipfs/${row.ipfs_cid}`}
            alt={row.title}
            ambience={amb}
            priority
            frameClassName="aspect-[4/3]"
          />
          <Doodle
            variant="bracketLeft"
            width={26}
            height={26}
            seed={19}
            strokeWidth={1.8}
            className="doodle-mark -top-3 -left-4"
          />

          <Card className="mt-5 flex flex-col items-start gap-5 p-6 sm:flex-row">
            {/* Real label stock, as it would be printed and stuck to the frame. */}
            <div className="rounded-sm bg-paper p-2.5 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.9)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/artworks/${row.id}/qr`}
                alt={`QR code for verifying ${row.title}`}
                width={132}
                height={132}
                className="size-32 rounded-[2px]"
              />
            </div>
            <div className="text-left">
              <h2 className="font-display text-lg font-semibold">
                Print this <Underline seed={15}>label</Underline>
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Stick the QR beside the signature on the physical painting. Anyone who scans it
                lands on{" "}
                <Link href={`/verify/${row.id}`} className="text-brass hover:text-ink">
                  /verify/{row.id}
                </Link>{" "}
                and can check the certificate without an account.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/api/ipfs/${row.ipfs_cid}`}
                  download={`kalasecure-${row.id}-original.png`}
                  className={buttonClass("secondary", "sm")}
                >
                  <IconDownload className="size-3.5" />
                  Download painting
                </a>
                <a
                  href={`/api/artworks/${row.id}/qr`}
                  download={`kalasecure-${row.id}-qr.png`}
                  className={buttonClass("secondary", "sm")}
                >
                  Download QR label
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                Try it: re-upload that file after resizing or re-saving it from{" "}
                <Link href="/upload" className="text-brass hover:text-ink">
                  the upload page
                </Link>
                . KalaSecure matches it against this certificate, calls it a
                copy, and caps its authenticity score.
              </p>
            </div>
          </Card>
        </div>

        {/* --------------------------- details --------------------------- */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {row.token_id ? (
              <Badge tone="brass">
                <IconLayers className="size-3" /> Token #{row.token_id}
              </Badge>
            ) : (
              <Badge tone="neutral">Pending mint</Badge>
            )}
            <Badge tone={tone}>
              {score >= 90 ? <IconCheck className="size-3" /> : <IconAlert className="size-3" />}
              {score}/100 {score >= 90 ? "verified" : score >= 70 ? "review" : "suspect"}
            </Badge>
          </div>

          <h1 className="mt-5 font-display text-4xl leading-tight font-semibold tracking-tight text-balance">
            {row.title}
          </h1>
          <p className="mt-2 text-lg text-ink-muted">
            by{" "}
            <Link href={`/artists#${row.artist_id}`} className="text-brass hover:text-ink">
              {row.artist_name}
            </Link>
          </p>

          {row.description ? (
            <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">{row.description}</p>
          ) : null}

          {/* score meter */}
          <div className="mt-8 rounded-lg border border-line-soft p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="catalogue text-ink-faint">Authenticity</h2>
              <p className="font-display text-4xl leading-none font-semibold tabular-nums"
                 style={{ color: score >= 70 ? "var(--amb-accent)" : "var(--color-crimson)" }}>
                {score}
              </p>
            </div>
            {/* Square-cut gauge with tick marks, not a rounded progress pill. */}
            <div className="mt-4 flex gap-[3px]" role="img"
                 aria-label={`Authenticity ${score} out of 100`}>
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="h-6 flex-1 rounded-[1px]"
                  style={{
                    background:
                      i < Math.round((score / 100) * 20)
                        ? score >= 90
                          ? "var(--color-sage)"
                          : score >= 70
                            ? "var(--amb-accent)"
                            : "var(--color-crimson)"
                        : "var(--color-surface-3)",
                    opacity: i < Math.round((score / 100) * 20) ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Set by the perceptual scan at registration.{" "}
              {score >= 90 ? (
                <>
                  No near match was found, so this score is <Underline seed={6}>as high as it goes</Underline>.
                </>
              ) : (
                "A detected copy cannot score high."
              )}
            </p>
          </div>

          {/* facts */}
          <Card className="mt-5 divide-y divide-line-soft">
            <Fact label="Medium" value={row.medium || "—"} />
            <Fact label="Dimensions" value={row.dimensions || "—"} />
            <Fact label="Year" value={row.year ? String(row.year) : "—"} />
            <Fact
              label="Registered"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <IconClock className="size-3.5 text-ink-faint" />
                  {formatDate(row.created_at)}
                </span>
              }
            />
            <Fact label="File size" value={formatBytes(row.file_size)} />
            {row.price_eth > 0 ? (
              <Fact label="Asking price" value={`${row.price_eth} ETH`} />
            ) : null}
          </Card>

          {/* on-chain */}
          <div className="mt-9 mb-3.5 flex items-center gap-2.5">
            <h2 className="catalogue text-ink-faint">On-chain certificate</h2>
            <span className="h-px flex-1 bg-line-soft" aria-hidden />
          </div>
          <Card className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-ink-faint">Content address (IPFS CID)</span>
              <CopyValue value={row.ipfs_cid} display={shortCid(row.ipfs_cid)} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-ink-faint">SHA-256</span>
              <CopyValue value={row.content_hash} display={truncateHash(row.content_hash, 12, 10)} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-ink-faint">Current owner</span>
              <CopyValue
                value={owner ?? row.artist_wallet ?? ""}
                display={
                  <span className="inline-flex items-center gap-1.5">
                    <IconWallet className="size-3" />
                    {shortAddress(owner ?? row.artist_wallet)}
                  </span>
                }
              />
            </div>
            {row.tx_hash ? (
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs text-ink-faint">Registration tx</span>
                <CopyValue
                  value={row.tx_hash}
                  display={truncateHash(row.tx_hash, 10, 8)}
                  href={`${EXPLORER_BASE}/tx/${row.tx_hash}`}
                />
              </div>
            ) : null}
          </Card>

          {isOwner ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <TransferButton artworkId={row.id} />
            </div>
          ) : user ? (
            <div className="mt-5">
              <FlagButton artworkId={row.id} />
            </div>
          ) : (
            <p className="mt-5 text-xs text-ink-faint">
              <Link href="/login" className="text-brass hover:text-ink">
                Log in
              </Link>{" "}
              to report this artwork if you believe it is a forgery.
            </p>
          )}
        </div>
      </div>

      {/* ------------------------- provenance ------------------------- */}
      <section className="mt-20">
        <div className="flex items-center gap-2.5">
          <h2 className="catalogue text-ink-faint">Provenance chain</h2>
          <span className="h-px flex-1 bg-line-soft" aria-hidden />
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Appended on-chain at every handover. Entries cannot be edited or removed.
        </p>

        {provenance.length === 0 ? (
          <Card className="mt-6 p-8 text-center text-sm text-ink-faint">
            No on-chain history yet — this record is still pending its mint.
          </Card>
        ) : (
          <ol className="mt-8 space-y-0">
            {provenance
              .slice()
              .reverse()
              .map((p, i, arr) => (
                <li key={`${p.timestamp}-${i}`} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span
                      className={
                        i === 0
                          ? "mt-1 size-3 shrink-0 rounded-full bg-brass shadow-[0_0_0_4px_rgba(201,162,39,0.15)]"
                          : "mt-1 size-3 shrink-0 rounded-full bg-line"
                      }
                    />
                    {i < arr.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
                  </div>
                  <div className="pb-8">
                    <p className="text-sm font-medium capitalize">
                      {p.action.replace(/_/g, " ")}
                    </p>
                    {p.note ? <p className="mt-1 text-sm text-ink-muted">{p.note}</p> : null}
                    <p className="mt-1.5 font-mono text-xs text-ink-faint">
                      {shortAddress(p.actor)} · {formatDateTime(p.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </section>

      {/* share */}
      <section className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-line-soft bg-surface/50 px-6 py-5">
        <IconLink className="size-4 text-brass" />
        <p className="text-sm text-ink-muted">
          Anyone can independently re-check this certificate — no account needed.
        </p>
        <div className="ml-auto flex gap-2">
          <Link href={`/verify/${row.id}`} className={buttonClass("secondary", "sm")}>
            Open verifier
            <IconExternal className="size-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-xs text-ink-faint">{label}</span>
      <span className="text-sm text-ink-muted">{value}</span>
    </div>
  );
}
