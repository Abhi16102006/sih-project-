import type { Metadata } from "next";
import { db } from "@/lib/db";
import { VerifyPanel } from "@/components/verify-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Independently check any KalaSecure artwork certificate. No account required.",
};

export default async function VerifyIndexPage() {
  const recent = db
    .prepare(
      `SELECT a.id, a.title, a.authenticity, u.name AS artist
       FROM artworks a JOIN users u ON u.id = a.artist_id
       ORDER BY a.id DESC LIMIT 8`,
    )
    .all() as { id: number; title: string; authenticity: number; artist: string }[];

  return <VerifyPanel recent={recent} />;
}
