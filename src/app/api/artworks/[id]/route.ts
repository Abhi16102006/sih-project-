import { NextResponse } from "next/server";
import { db, type Artwork } from "@/lib/db";

import { verifyOnChain, readOwner, readProvenance } from "@/lib/chain";
import { sha256 } from "@/lib/crypto";
import { get } from "@/lib/ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The public verification endpoint.
 *
 * Combines three independent checks so a buyer is not trusting one source:
 *   1. Does the record exist on-chain?       (contract.verifyArtwork)
 *   2. Does the stored file still hash to the value recorded on-chain?
 *   3. Has any party flagged or revoked it?
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const artworkId = Number(id);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return NextResponse.json({ error: "Invalid artwork id" }, { status: 400 });
  }

  const row = db
    .prepare(
      `SELECT a.*, u.name AS artist_name, u.wallet AS artist_wallet
       FROM artworks a JOIN users u ON u.id = a.artist_id
       WHERE a.id = ?`,
    )
    .get(artworkId) as
    | (Artwork & { artist_name: string; artist_wallet: string | null })
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  const checks: {
    name: string;
    label: string;
    passed: boolean;
    detail: string;
  }[] = [];

  // --- 1. on-chain record ---
  let onchain: Awaited<ReturnType<typeof verifyOnChain>> | null = null;
  if (row.token_id) {
    onchain = await verifyOnChain(row.token_id);
    checks.push({
      name: "onchain",
      label: "Blockchain record",
      passed: onchain.exists,
      detail: onchain.exists
        ? `Token #${row.token_id} exists on-chain`
        : `Token #${row.token_id} not found on-chain`,
    });

    checks.push({
      name: "hash-match",
      label: "Hash matches certificate",
      passed: onchain.exists && onchain.contentHash === row.content_hash,
      detail:
        onchain.exists && onchain.contentHash === row.content_hash
          ? "On-chain SHA-256 equals the stored file"
          : "On-chain SHA-256 differs from the stored file",
    });

    checks.push({
      name: "not-revoked",
      label: "Not revoked or flagged",
      passed: onchain.valid,
      detail: onchain.valid ? "No revocations or flags on record" : "This record has been flagged or revoked",
    });
  } else {
    checks.push({
      name: "onchain",
      label: "Blockchain record",
      passed: false,
      detail: "This artwork is registered locally but has not been minted yet",
    });
  }

  // --- 2. recompute the file hash ---
  let recomputed: string | null = null;
  const bytes = get(row.ipfs_cid);
  if (bytes) {
    recomputed = sha256(bytes);
    checks.push({
      name: "storage",
      label: "Stored file intact",
      passed: recomputed === row.content_hash,
      detail:
        recomputed === row.content_hash
          ? "Recomputed SHA-256 matches the certificate"
          : "Stored bytes no longer match the certificate — the file was altered",
    });
  } else {
    checks.push({
      name: "storage",
      label: "Stored file intact",
      passed: false,
      detail: "Could not retrieve the file from content storage",
    });
  }

  const owner = row.token_id ? await readOwner(row.token_id) : null;
  const provenance = row.token_id ? await readProvenance(row.token_id) : [];

  const passedAll = checks.every((c) => c.passed);

  return NextResponse.json({
    artworkId,
    tokenId: row.token_id,
    title: row.title,
    artist: row.artist_name,
    artistWallet: row.artist_wallet,
    cid: row.ipfs_cid,
    contentHash: row.content_hash,
    recomputedHash: recomputed,
    mimeType: row.mime_type,
    authenticity: row.authenticity,
    medium: row.medium,
    dimensions: row.dimensions,
    year: row.year,
    registeredAt: row.created_at,
    currentOwner: owner,
    txHash: row.tx_hash,
    status: row.status,
    verified: passedAll,
    checks,
    provenance: provenance.map((p) => ({
      action: p.action,
      note: p.note,
      actor: p.actor,
      timestamp: Number(p.timestamp),
    })),
  });
}