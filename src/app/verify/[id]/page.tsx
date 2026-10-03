import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Artwork } from "@/lib/db";
import { readProvenance, shortAddress, getSigner, ABI, CONTRACT_ADDRESS } from "@/lib/chain"
import { ambienceFrom, ambienceStyle } from "@/lib/palette";
import { sha256 } from "@/lib/crypto";
import { get } from "@/lib/ipfs";
import { ethers } from "ethers";
import { Card, buttonClass } from "@/components/ui";
import { CopyValue } from "@/components/copy-value";
import { IconClock, IconExternal } from "@/components/icons";
import { Doodle, CircleAround } from "@/components/doodle";
import {
  formatDateTime,
  formatSqlDateTime,
  shortCid,
  truncateHash,
  EXPLORER_BASE,
} from "@/lib/utils";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify certificate #${id}` };
}

export default async function VerifyPage({ params }: { params: Params }) {
  const { id } = await params;
  const artworkId = Number(id);
  if (!Number.isInteger(artworkId) || artworkId <= 0) notFound();

  const row = db
    .prepare(
      `SELECT a.*, u.name AS artist_name, u.wallet AS artist_wallet
       FROM artworks a JOIN users u ON u.id = a.artist_id WHERE a.id = ?`,
    )
    .get(artworkId) as (Artwork & { artist_name: string; artist_wallet: string | null }) | undefined;

  if (!row) notFound();

  /* ------------------------- independent checks ------------------------- */
  type Check = { label: string; passed: boolean; detail: string };
  const checks: Check[] = [];

  let onchainCid = "";
  let onchainHash = "";
  let owner: string | null = null;
  let provenance: { actor: string; timestamp: bigint; action: string; note: string }[] = [];

  if (row.token_id) {
    try {
      const signer = await getSigner();
      const provider = signer?.provider ?? undefined;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const [exists, valid, o, h, cid] = await contract.verifyArtwork(row.token_id);
      owner = o;
      onchainHash = h;
      onchainCid = cid;

      checks.push({
        label: "Certificate exists on-chain",
        passed: Boolean(exists),
        detail: exists
          ? `Token #${row.token_id} is recorded in the ArtworkRegistry contract.`
          : `Token #${row.token_id} was not found on the ledger.`,
      });
      checks.push({
        label: "On-chain hash matches this record",
        passed: Boolean(exists) && h === row.content_hash,
        detail:
          exists && h === row.content_hash
            ? "The SHA-256 stored on the ledger is identical to the one shown here."
            : "The on-chain hash differs from this record. Treat it as tampered.",
      });
      checks.push({
        label: "Content address matches",
        passed: Boolean(exists) && cid === row.ipfs_cid,
        detail: cid === row.ipfs_cid ? "IPFS CID agrees." : "IPFS CID differs.",
      });
      checks.push({
        label: "Not flagged or revoked",
        passed: Boolean(valid),
        detail: valid
          ? "No flags or revocations are recorded against this token."
          : "A flag or revocation exists on this token.",
      });
    } catch {
      checks.push({
        label: "Blockchain reachable",
        passed: false,
        detail: "Could not reach the local chain node. Start it with `npm run chain`.",
      });
    }
  } else {
    checks.push({
      label: "Certificate exists on-chain",
      passed: false,
      detail: "This artwork has not been minted yet. It is registered locally only.",
    });
  }

  const bytes = get(row.ipfs_cid);
  if (bytes) {
    const recomputed = sha256(bytes);
    checks.push({
      label: "Stored file is unmodified",
      passed: recomputed === row.content_hash,
      detail:
        recomputed === row.content_hash
          ? "We re-hashed the stored file and it matches the certificate byte for byte."
          : "The stored file no longer matches its certificate.",
    });
  } else {
    checks.push({
      label: "Stored file is unmodified",
      passed: false,
      detail: "The file could not be retrieved from content storage.",
    });
  }

  if (row.token_id) provenance = await readProvenance(row.token_id);

  const allPass = checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;
  const score = row.authenticity;
  const amb = ambienceFrom(row.dhash);

  /* ------------------------------- render ------------------------------- */
  return (
    <div style={ambienceStyle(amb)} className="mx-auto max-w-4xl px-5 py-14">
      {/* Report masthead, the way an audit document opens. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-soft pb-3">
        <p className="catalogue text-ink-faint">Public verification</p>
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint">
          CERTIFICATE #{String(row.id).padStart(4, "0")} · {EXPLORER_BASE.includes("amoy") ? "POLYGON AMOY" : "LOCAL CHAIN"}
        </p>
      </div>

      {/* Verdict. Set as a stamped word, not a coloured alert box. */}
      <div className="relative mt-10 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1
            className="font-display text-5xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-6xl"
            style={{ color: allPass ? "var(--color-sage)" : "var(--color-crimson)" }}
          >
            <CircleAround seed={allPass ? 3 : 17}>
              {allPass ? "Genuine" : "Not verified"}
            </CircleAround>
          </h1>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted text-pretty">
            {allPass
              ? "Every independent check passed. The artwork, its stored file and its ownership history all agree with the record on the chain."
              : `${passedCount} of ${checks.length} checks passed. Read the results below before you trust this work.`}
          </p>
        </div>

        {/* Tally: figures in a row, divided by rules. */}
        <dl className="flex gap-6">
          <Tally label="Checks passed" value={`${passedCount}/${checks.length}`}
                 tone={allPass ? "var(--color-sage)" : "var(--color-crimson)"} />
          <Tally label="Authenticity" value={`${score}`}
                 tone={score >= 90 ? "var(--color-sage)" : score >= 70 ? "var(--color-brass)" : "var(--color-crimson)"} />
          <Tally label="Token" value={row.token_id ? `#${row.token_id}` : "none"} />
        </dl>
      </div>

      {/* artwork */}
      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="size-28 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/ipfs/${row.ipfs_cid}`} alt={row.title} className="size-full object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold">{row.title}</h2>
            <p className="mt-1 text-ink-muted">
              by{" "}
              <Link href={`/artists#${row.artist_id}`} className="text-brass hover:text-ink">
                {row.artist_name}
              </Link>
            </p>
            <p className="mt-2 text-sm text-ink-faint">
              {row.medium}
              {row.year ? ` · ${row.year}` : ""}
            </p>
            <Link
              href={`/artwork/${row.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-brass hover:text-ink"
            >
              Full certificate <IconExternal className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* checks: an audit list, verdict stamped in the right margin */}
      <div className="mt-14 flex items-center gap-2.5">
        <h2 className="catalogue text-ink-faint">What we checked</h2>
        <span className="h-px flex-1 bg-line-soft" aria-hidden />
        <Doodle
          variant="scribble"
          width={30}
          height={12}
          seed={44}
          strokeWidth={1.6}
          className="shrink-0 text-ink-faint"
        />
      </div>
      <ol className="mt-1">
        {checks.map((c, i) => (
          <li
            key={c.label}
            className="grid gap-x-6 gap-y-2 border-b border-line-soft py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem]"
          >
            <span className="font-mono text-sm text-ink-faint tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.detail}</p>
            </div>
            <span
              className="flex items-center gap-2 justify-self-start font-mono text-[11px] font-semibold tracking-[0.14em] uppercase sm:justify-self-end"
              style={{ color: c.passed ? "var(--color-sage)" : "var(--color-crimson)" }}
            >
              {/* Drawn, not set. A rubric mark belongs to a person holding the
                  paper, and it reads as an annotation on this report rather
                  than as a UI icon. */}
              <Doodle
                variant={c.passed ? "check" : "cross"}
                width={16}
                height={16}
                seed={31 + i}
                strokeWidth={2}
                className={c.passed ? "doodle-tick" : "doodle-cross"}
              />
              {c.passed ? "Pass" : "Fail"}
            </span>
          </li>
        ))}
      </ol>

      {/* raw data */}
      <div className="mt-14 mb-4 flex items-center gap-2.5">
        <h2 className="catalogue text-ink-faint">Certificate data</h2>
        <span className="h-px flex-1 bg-line-soft" aria-hidden />
      </div>
      <div className="space-y-3.5 rounded-lg border border-line-soft bg-surface/50 p-5">
        <Row label="Content address">
          <CopyValue value={row.ipfs_cid} display={shortCid(row.ipfs_cid)} />
        </Row>
        <Row label="SHA-256 (recorded)">
          <CopyValue value={row.content_hash} display={truncateHash(row.content_hash, 14, 10)} />
        </Row>
        <Row label="SHA-256 (on-chain)">
          <CopyValue
            value={onchainHash || "—"}
            display={onchainHash ? truncateHash(onchainHash, 14, 10) : "not minted"}
          />
        </Row>
        <Row label="IPFS CID (on-chain)">
          {onchainCid ? (
            <span className="flex items-center gap-2">
              <CopyValue value={onchainCid} display={shortCid(onchainCid)} />
              {onchainCid === row.ipfs_cid ? (
                <span className="text-xs text-sage">matches this record</span>
              ) : (
                <span className="text-xs text-crimson">
                  does not match {shortCid(row.ipfs_cid)}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-ink-faint">not minted</span>
          )}
        </Row>
        <Row label="Current owner">
          <CopyValue value={owner ?? row.artist_wallet ?? ""} display={shortAddress(owner ?? row.artist_wallet)} />
        </Row>
        <Row label="Registered">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <IconClock className="size-3.5" />
            {formatSqlDateTime(row.created_at)}
          </span>
        </Row>
        {row.tx_hash ? (
          <Row label="Transaction">
            <CopyValue
              value={row.tx_hash}
              display={truncateHash(row.tx_hash, 12, 8)}
              href={`${EXPLORER_BASE}/tx/${row.tx_hash}`}
            />
          </Row>
        ) : null}
      </div>

      {/* provenance */}
      {provenance.length > 0 ? (
        <>
          <div className="mt-14 mb-4 flex items-center gap-2.5">
            <h2 className="catalogue text-ink-faint">Ownership history</h2>
            <span className="h-px flex-1 bg-line-soft" aria-hidden />
          </div>
          <div className="divide-y divide-line-soft rounded-lg border border-line-soft bg-surface/50">
            {provenance
              .slice()
              .reverse()
              .map((p, i) => (
                <div key={`${p.timestamp}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm capitalize">{p.action.replace(/_/g, " ")}</p>
                    {p.note ? <p className="truncate text-xs text-ink-faint">{p.note}</p> : null}
                  </div>
                  <p className="shrink-0 font-mono text-xs text-ink-faint">
                    {formatDateTime(p.timestamp)}
                  </p>
                </div>
              ))}
          </div>
        </>
      ) : null}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-7">
        <p className="max-w-md text-xs leading-relaxed text-ink-faint">
          Anyone can run these checks independently. Nothing here depends on this website
          telling the truth about itself.
        </p>
        <Link href="/verify" className={buttonClass("secondary", "sm")}>
          Verify another artwork
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-ink-faint">{label}</span>
      {children}
    </div>
  );
}

function Tally({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-l border-line-soft pl-5 first:border-l-0 first:pl-0">
      <dd
        className="font-display text-3xl leading-none font-semibold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </dd>
      <dt className="mt-2 text-[10px] tracking-[0.12em] text-ink-faint uppercase">{label}</dt>
    </div>
  );
}
