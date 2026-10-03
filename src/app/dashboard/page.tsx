import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db, type Artwork } from "@/lib/db";
import { Badge, Card, ScoreBadge, buttonClass } from "@/components/ui";
import { IconUpload } from "@/components/icons";
import { formatDate, shortCid } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");

  const artworks = db
    .prepare(
      `SELECT id, title, ipfs_cid, authenticity, token_id, status, created_at, medium
       FROM artworks WHERE artist_id = ? ORDER BY id DESC`,
    )
    .all(user.id) as Pick<
    Artwork,
    "id" | "title" | "ipfs_cid" | "authenticity" | "token_id" | "status" | "created_at" | "medium"
  >[];

  const flagged = db
    .prepare(
      `SELECT COUNT(*) AS n FROM similarity_checks
       WHERE match_id IN (SELECT id FROM artworks WHERE artist_id = ?)`,
    )
    .get(user.id) as { n: number };

  const anchored = artworks.filter((a) => a.token_id).length;
  const avg = artworks.length
    ? Math.round(artworks.reduce((s, a) => s + a.authenticity, 0) / artworks.length)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-5 py-14">
      {welcome ? (
        <div className="mb-8 animate-fade-up rounded-lg border border-sage/30 bg-sage/8 px-5 py-4">
          <p className="text-sm font-medium text-sage">Account created. Welcome to KalaSecure.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Your demo wallet{" "}
            <span className="font-mono text-xs text-ink">
              {user.wallet ? `${user.wallet.slice(0, 10)}…${user.wallet.slice(-6)}` : "—"}
            </span>{" "}
            is ready, so you can register artwork without installing MetaMask.
          </p>
        </div>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="catalogue text-ink-faint">Artist dashboard</span>
            <span className="h-px w-8 bg-line" aria-hidden />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {user.name}
          </h1>
          <p className="mt-2 text-sm text-ink-faint">
            {user.location || "Location not set"} · {user.email}
          </p>
        </div>
        <Link href="/upload" className={buttonClass("primary", "md")}>
          <IconUpload className="size-4" />
          Register new artwork
        </Link>
      </header>

      {/* stats */}
      <dl className="mt-10 grid grid-cols-2 border-y border-line-soft lg:grid-cols-4">
        <Stat value={artworks.length} label="Total artworks" />
        <Stat value={anchored} label="Anchored on-chain" />
        <Stat value={`${avg}`} label="Avg authenticity" />
        <Stat value={flagged.n} label="Matched by others" />
      </dl>

      {/* table */}
      <div className="mt-14 mb-4 flex items-center gap-2.5">
        <h2 className="catalogue text-ink-faint">Your certificates</h2>
        <span className="h-px flex-1 bg-line-soft" aria-hidden />
      </div>

      {artworks.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="font-display text-xl font-semibold">Nothing registered yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Upload your first painting and you will have a blockchain certificate and a printable
            QR label in about thirty seconds.
          </p>
          <Link href="/upload" className={buttonClass("primary", "md", "mt-6")}>
            <IconUpload className="size-4" />
            Upload your first artwork
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] tracking-wide text-ink-faint uppercase">
                  <th className="px-5 py-3 font-medium">Artwork</th>
                  <th className="px-5 py-3 font-medium">Token</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">CID</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {artworks.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-5 py-4">
                      <Link href={`/artwork/${a.id}`} className="flex items-center gap-3">
                        <span className="size-11 shrink-0 overflow-hidden rounded bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/ipfs/${a.ipfs_cid}`}
                            alt=""
                            className="size-full object-cover"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{a.title}</span>
                          <span className="block truncate text-xs text-ink-faint">{a.medium}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {a.token_id ? (
                        <Badge tone="brass">#{a.token_id}</Badge>
                      ) : (
                        <Badge tone="neutral">pending</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <ScoreBadge score={a.authenticity} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-faint">
                      {shortCid(a.ipfs_cid)}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-faint">{formatDate(a.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/artwork/${a.id}`}
                        className="text-xs text-brass hover:text-ink"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {artworks.length > 0 ? (
        <p className="mt-4 text-xs text-ink-faint">
          Tip: open any artwork and download its QR label to stick on the physical painting —{" "}
          <Link href="/verify" className="text-brass hover:text-ink">
            test the verifier
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border-line-soft py-5 odd:border-r lg:border-r lg:last:border-r-0 lg:[&:nth-child(odd)]:border-r-0 lg:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(2n)]:pl-6">
      <dd className="font-display text-3xl leading-none font-semibold tabular-nums">{value}</dd>
      <dt className="mt-2.5 text-[10px] tracking-[0.12em] text-ink-faint uppercase">{label}</dt>
    </div>
  );
}
