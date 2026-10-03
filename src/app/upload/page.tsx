import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { UploadForm } from "@/components/upload-form";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register artwork" };

export default async function UploadPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/upload");

  const count = db
    .prepare("SELECT COUNT(*) AS n FROM artworks WHERE artist_id = ?")
    .get(user.id) as { n: number };

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header>
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-brass uppercase">
          New certificate
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Register artwork</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          We hash the file, scan it against every registered piece for copies, then write the
          certificate into the blockchain. This usually takes a few seconds.
        </p>
      </header>

      <div className="rule-gold mt-10" />

      <div className="mt-10">
        <UploadForm />
      </div>

      <Card className="mt-14 p-6">
        <h2 className="text-sm font-semibold">What happens to your file</h2>
        <ol className="mt-4 space-y-3 text-sm text-ink-muted">
          {[
            "A SHA-256 hash is computed. This is your artwork's permanent fingerprint.",
            "The image is stored content-addressed, so its address is derived from its own hash.",
            "A perceptual fingerprint is compared against the gallery to catch re-saved copies.",
            "Title, artist, hash and address are written to the ArtworkRegistry contract.",
            "You get a QR code to print and attach to the physical painting.",
          ].map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="font-mono text-xs text-brass-dim">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-ink-faint">
          You have anchored {count.n} artwork{count.n === 1 ? "" : "s"} so far.{" "}
          <Link href="/dashboard" className="text-brass hover:text-ink">
            View your dashboard →
          </Link>
        </p>
      </Card>
    </div>
  );
}