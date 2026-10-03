import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db, type Artwork } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/artworks/[id]/qr -> PNG QR code pointing at the public verify page.
 * The QR is what an artist prints and sticks on the physical painting.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const artworkId = Number(id);

  const row = db
    .prepare("SELECT id, title, ipfs_cid FROM artworks WHERE id = ?")
    .get(artworkId) as Pick<Artwork, "id" | "title" | "ipfs_cid"> | undefined;

  if (!row) return NextResponse.json({ error: "Artwork not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const target = `${origin}/verify/${row.id}`;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1a1512", light: "#f5f0e8" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "no-store",
      "X-QR-Target": target,
    },
  });
}