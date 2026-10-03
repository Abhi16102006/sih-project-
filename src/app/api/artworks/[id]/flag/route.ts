import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { db, type Artwork } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import {
  getReporterSigner,
  ABI,
  CONTRACT_ADDRESS,
  describeChainError,
  withGasEstimate,
} from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/artworks/[id]/flag — report a suspected forgery. */
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

  let reason = "Suspected forgery";
  try {
    const body = (await req.json()) as { reason?: string };
    if (typeof body.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 300);
    }
  } catch {
    /* optional */
  }

  const signerPromise = getReporterSigner();
  if (!signerPromise) {
    return NextResponse.json({ error: "Blockchain signer unavailable" }, { status: 503 });
  }

  try {
    const signer = await signerPromise;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.flagArtwork(row.token_id, reason, {
      ...(await withGasEstimate(
        () => contract.flagArtwork.estimateGas(row.token_id as number, reason),
        400_000n,
      )),
    });
    const receipt = await tx.wait();
    return NextResponse.json({ ok: true, txHash: receipt.hash });
  } catch (e) {
    return NextResponse.json(
      { error: describeChainError(e) },
      { status: 500 },
    );
  }
}