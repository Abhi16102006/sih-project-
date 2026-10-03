import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState, Plate, buttonClass } from "@/components/ui";
import { Doodle, Underline } from "@/components/doodle";
import { IconImage } from "@/components/icons";
import { ambienceFrom } from "@/lib/palette";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Every artwork anchored to the KalaSecure blockchain ledger.",
};

type SearchParams = Promise<{ q?: string; sort?: string }>;

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", sort = "recent" } = await searchParams;

  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.ipfs_cid, a.authenticity, a.medium, a.price_eth,
              a.created_at, a.token_id, a.dhash, u.name AS artist, u.id AS artist_id
       FROM artworks a JOIN users u ON u.id = a.artist_id
       WHERE a.title LIKE ? OR u.name LIKE ? OR a.medium LIKE ?
       ORDER BY ${sort === "score" ? "a.authenticity DESC" : "a.id DESC"}`,
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`) as {
    id: number;
    title: string;
    ipfs_cid: string;
    authenticity: number;
    medium: string;
    price_eth: number;
    created_at: string;
    token_id: number | null;
    dhash: string;
    artist: string;
    artist_id: number;
  }[];

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 lg:py-16">
      <header className="relative flex flex-wrap items-end justify-between gap-6">
        <Doodle
          variant="star"
          width={30}
          height={30}
          seed={26}
          strokeWidth={1.7}
          className="doodle-mark top-1 right-1 hidden lg:block"
        />
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="catalogue text-ink-faint">The ledger</span>
            <span className="h-px w-8 bg-line" aria-hidden />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            <Underline seed={7}>Gallery</Underline>
          </h1>
          <p className="mt-3 text-base text-ink-muted">
            {rows.length} artwork{rows.length === 1 ? "" : "s"} anchored
            {q ? ` matching “${q}”` : ""}.
          </p>
        </div>

        <form className="flex gap-2" action="/gallery" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search title, artist or medium…"
            className="h-10 w-56 rounded-md border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink-muted focus:border-brass-dim focus:outline-none"
          >
            <option value="recent">Newest</option>
            <option value="score">Highest score</option>
          </select>
          <button type="submit" className={buttonClass("secondary", "md")}>
            Search
          </button>
        </form>
      </header>

      <div className="rule-gold mt-10" />

      {rows.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            icon={<IconImage className="size-10" />}
            title={q ? "No artworks match that search" : "The gallery is empty"}
            description={
              q
                ? "Try a different title, artist or medium."
                : "Once an artist anchors their first painting it will appear here with its certificate."
            }
            action={
              q ? (
                <Link href="/gallery" className={buttonClass("secondary", "md")}>
                  Clear search
                </Link>
              ) : (
                <Link href="/upload" className={buttonClass("primary", "md")}>
                  Register an artwork
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-x-5 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => {
            const amb = ambienceFrom(a.dhash);
            return (
              <Link key={a.id} href={`/artwork/${a.id}`} className="group block">
                <div className="relative">
                  {/* Each work casts its own light onto the wall behind it. */}
                  <Plate
                    src={`/api/ipfs/${a.ipfs_cid}`}
                    alt={a.title}
                    ambience={amb}
                    frameClassName="aspect-[4/5] transition-transform duration-500 ease-out group-hover:-translate-y-1"
                    className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5"
                  />
                  {a.token_id ? (
                    <span className="absolute top-3 left-3 rounded-sm border border-line bg-surface px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-ink-muted">
                      № {String(a.token_id).padStart(3, "0")}
                    </span>
                  ) : null}
                  <span
                    className={`absolute top-3 right-3 font-mono text-xs tabular-nums backdrop-blur-sm ${
                      a.authenticity >= 90
                        ? "text-sage"
                        : a.authenticity >= 70
                          ? "text-brass"
                          : "text-crimson"
                    }`}
                  >
                    {a.authenticity}
                  </span>
                </div>

                <div className="mt-4 border-t border-line-soft pt-3.5">
                  <h2 className="truncate font-display text-[1.0625rem] font-semibold">
                    {a.title}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">{a.artist}</p>
                  <p className="mt-2 text-[11px] tracking-[0.1em] text-ink-faint uppercase">
                    {a.medium}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
