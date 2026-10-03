import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { db, type Artwork } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import {
  getSigner,
  ABI,
  CONTRACT_ADDRESS,
  describeChainError,
  withGasEstimate,
} from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/artworks/[id]/transfer  — move ownership, appending provenance. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const artworkId = Number(id);
  const user = await currentUser();

  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const row = db.prepare("SELECT * FROM artworks WHERE id = ?").get(artworkId) as
    | Artwork
    | undefined;
  if (!row) return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  if (!row.token_id) {
    return NextResponse.json({ error: "Artwork has not been minted yet" }, { status: 409 });
  }

  let note = "Ownership transferred";
  let to: string | null = null;
  try {
    const body = (await req.json()) as { note?: string; to?: string };
    if (typeof body.note === "string") note = body.note.slice(0, 200);
    if (typeof body.to === "string") to = body.to;
  } catch {
    /* body optional */
  }

  const signerPromise = getSigner();
  if (!signerPromise) {
    return NextResponse.json({ error: "Blockchain signer unavailable" }, { status: 503 });
  }

  try {
    const signer = await signerPromise;
    if (!signer) throw new Error("No signer");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.transferArtwork(to ?? signer.address, row.token_id, note, {
      ...(await withGasEstimate(
        () => contract.transferArtwork.estimateGas(to, row.token_id, note),
        800_000n,
      )),
    });
    const receipt = await tx.wait();
    return NextResponse.json({ ok: true, txHash: receipt.hash, tokenId: row.token_id });
  } catch (e) {
    return NextResponse.json(
      { error: describeChainError(e) },
      { status: 500 },
    );
  }
}