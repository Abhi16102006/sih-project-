import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { Doodle, Underline } from "@/components/doodle";
import { IconUser } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import { ambienceFrom } from "@/lib/palette";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Artists" };

export default function ArtistsPage() {
  const artists = db
    .prepare(
      `SELECT u.id, u.name, u.bio, u.location, u.wallet, u.created_at,
              COUNT(a.id) AS works,
              AVG(a.authenticity) AS avg_score,
              SUM(CASE WHEN a.token_id IS NOT NULL THEN 1 ELSE 0 END) AS anchored,
              (SELECT a2.dhash FROM artworks a2
                WHERE a2.artist_id = u.id ORDER BY a2.id DESC LIMIT 1) AS dhash
       FROM users u LEFT JOIN artworks a ON a.artist_id = u.id
       GROUP BY u.id ORDER BY works DESC, u.id ASC`,
    )
    .all() as {
    id: number;
    name: string;
    bio: string;
    location: string;
    wallet: string | null;
    created_at: string;
    works: number;
    avg_score: number | null;
    anchored: number;
    dhash: string | null;
  }[];

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 lg:py-16">
      <header className="relative">
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-brass uppercase">
          The community
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          <Underline seed={11} double>Artists</Underline>
        </h1>
        <Doodle
          variant="arrowDown"
          width={20}
          height={30}
          seed={13}
          strokeWidth={1.7}
          className="doodle-mark top-0 right-2 hidden rotate-[35deg] lg:block"
        />
        <p className="mt-3 text-base text-ink-muted">
          Every registered artist, and what they have anchored so far.
        </p>
      </header>

      <div className="rule-gold mt-10" />

      {artists.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            icon={<IconUser className="size-10" />}
            title="No artists yet"
            description="Be the first to register your work on the ledger."
            action={
              <Link href="/register" className={buttonClass("primary", "md")}>
                Create an artist account
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => {
            const amb = ambienceFrom(a.dhash);
            return (
            <Card
              key={a.id}
              id={`${a.id}`}
              ambience={amb}
              className="group scroll-mt-24 p-6 transition-colors hover:border-line"
            >
              <div className="flex items-start gap-4">
                {/* A monogram plate, the way a catalogue marks an entry. */}
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-sm border font-display text-lg font-semibold"
                  style={{
                    borderColor: `${amb.accent}33`,
                    background: amb.wash,
                    color: amb.deep,
                  }}
                >
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-xl font-semibold">{a.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-ink-faint">
                    {a.location || "Location not set"}
                  </p>
                </div>
              </div>

              {a.bio ? (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-muted">{a.bio}</p>
              ) : null}

              <dl className="mt-6 grid grid-cols-3 border-t border-line-soft pt-4">
                <Mini label="Works" value={a.works} />
                <Mini label="Anchored" value={a.anchored} />
                <Mini
                  label="Avg score"
                  value={a.avg_score === null ? "—" : Math.round(a.avg_score)}
                />
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-ink-faint">
                  {a.wallet ? `${a.wallet.slice(0, 8)}…${a.wallet.slice(-4)}` : "—"}
                </span>
                <span className="text-[11px] text-ink-faint">
                  since {formatDate(a.created_at)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Badge tone={a.anchored === a.works && a.works > 0 ? "sage" : "neutral"}>
                  {a.anchored === a.works && a.works > 0 ? "Fully anchored" : "Partially anchored"}
                </Badge>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-l border-line-soft pl-3 first:border-l-0 first:pl-0">
      <dd className="font-display text-lg leading-none font-semibold tabular-nums">{value}</dd>
      <dt className="mt-1.5 text-[10px] tracking-[0.12em] text-ink-faint uppercase">{label}</dt>
    </div>
  );
}
