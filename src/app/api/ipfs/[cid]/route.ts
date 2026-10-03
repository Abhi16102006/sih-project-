import { NextResponse } from "next/server";
import { get } from "@/lib/ipfs";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

/**
 * Local IPFS gateway.
 * `GET /api/ipfs/<cid>` returns the raw bytes addressed by the CID,
 * mirroring `https://ipfs.io/ipfs/<cid>` so swapping to a public gateway
 * needs no code change.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cid: string }> },
) {
  const { cid } = await ctx.params;
  const bytes = get(cid);

  if (!bytes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = db
    .prepare("SELECT mime_type FROM artworks WHERE ipfs_cid = ? LIMIT 1")
    .get(cid) as { mime_type: string } | undefined;

  const type = row?.mime_type ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Content-addressed: this is what makes the URL tamper-evident.
      "X-Content-SHA256": sha256(bytes),
    },
  });
}

export const dynamic = "force-dynamic";