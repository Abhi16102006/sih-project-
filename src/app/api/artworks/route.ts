import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { put } from "@/lib/ipfs";
import { sha256 } from "@/lib/crypto";
import {
  analyse,
  serialise,
  authenticityScore,
  parseStored,
  fingerprint,
  type CorpusEntry,
} from "@/lib/perceptual-hash";
import { getSigner, ABI, CONTRACT_ADDRESS, describeChainError } from "@/lib/chain";
import { ethers } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

const fields = z.object({
  title: z.string().trim().min(2, "Give your artwork a title").max(160),
  description: z.string().trim().max(2000).optional(),
  medium: z.string().trim().max(80).optional(),
  dimensions: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1000).max(3000).optional(),
  priceEth: z.coerce.number().min(0).max(1000).optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to register artwork" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach an image file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP, GIF or AVIF images are accepted" },
      { status: 400 },
    );
  }

  const parsed = fields.safeParse({
    title: form.get("title"),
    description: form.get("description") ?? "",
    medium: form.get("medium") ?? "",
    dimensions: form.get("dimensions") ?? "",
    year: form.get("year") ?? undefined,
    priceEth: form.get("priceEth") ?? 0,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form" },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentHash = sha256(bytes);

  // ---- 1. content-addressed storage (IPFS-style CID) ----
  const stored = put(bytes);

  // ---- 2. perceptual fingerprint + copy detection ----
  let fp;
  try {
    fp = await fingerprint(bytes);
  } catch {
    return NextResponse.json(
      { error: "We could not analyse that image. Try a PNG or JPEG." },
      { status: 400 },
    );
  }

  const corpus = db
    .prepare(
      `SELECT a.id, a.title, a.dhash, u.name AS artist
       FROM artworks a JOIN users u ON u.id = a.artist_id
       WHERE a.dhash IS NOT NULL`,
    )
    .all() as { id: number; title: string; dhash: string | null; artist: string }[];

  const entries: CorpusEntry[] = [];
  for (const c of corpus) {
    const p = c.dhash ? parseStored(c.dhash) : null;
    if (p) entries.push({ id: c.id, title: c.title, artist: c.artist, ...p });
  }

  const scan = analyse(fp, entries);
  const score = authenticityScore(scan.verdict, scan.similarity);

  // ---- 3. mint on-chain ----
  let tokenId: number | null = null;
  let txHash: string | null = null;
  let chainStatus: "minted" | "queued" | "rejected-copy" = "queued";
  let chainError: string | null = null;

  const walletPromise = getSigner();
  if (walletPromise) {
    try {
      const wallet = await walletPromise;
      if (!wallet) throw new Error("No signer");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

      // The contract returns (tokenId, found) in that order.
      const [existingToken, found] = await contract.findByContentHash(contentHash);
      if (found) {
        chainStatus = "rejected-copy";
        chainError = `This exact file is already registered as token #${existingToken}`;
      } else {
        const input = {
          title: parsed.data.title,
          description: parsed.data.description ?? "",
          contentHash,
          ipfsCid: stored.cid,
          medium: parsed.data.medium ?? "Digital",
          editionSize: 1,
          authenticity: score,
        };
        const tx = await contract.registerArtwork(input, {
          from: wallet.address,
          gasLimit: 3_000_000,
        });
        const receipt = await tx.wait();
        txHash = receipt.hash;
        const total = await contract.totalArtworks();
        tokenId = Number(total);
        chainStatus = "minted";
      }
    } catch (e) {
      chainError = describeChainError(e);
      chainStatus = "queued";
    }
  } else {
    chainError = "Blockchain node not reachable — record saved locally and pending mint";
  }

  // ---- 4. persist ----
  const info = db
    .prepare(
      `INSERT INTO artworks
        (token_id, artist_id, title, description, medium, dimensions, price_eth, year,
         content_hash, dhash, ipfs_cid, mime_type, file_size, authenticity, tx_hash, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      tokenId,
      user.id,
      parsed.data.title,
      parsed.data.description ?? "",
      parsed.data.medium ?? "Digital",
      parsed.data.dimensions ?? "",
      parsed.data.priceEth ?? 0,
      parsed.data.year ?? null,
      contentHash,
      serialise(fp),
      stored.cid,
      file.type,
      stored.size,
      score,
      txHash,
      chainStatus === "minted" ? "registered" : "pending",
    );

  const artworkId = Number(info.lastInsertRowid);

  db.prepare(
    `INSERT INTO similarity_checks (artwork_id, match_id, similarity, verdict)
     VALUES (?,?,?,?)`,
  ).run(artworkId, scan.best?.id ?? null, scan.similarity, scan.verdict);

  return NextResponse.json({
    ok: true,
    artworkId,
    tokenId,
    txHash,
    cid: stored.cid,
    contentHash,
    authenticity: score,
    scan: {
      similarity: scan.similarity,
      verdict: scan.verdict,
      match: scan.best,
    },
    chain: { status: chainStatus, error: chainError },
  });
}