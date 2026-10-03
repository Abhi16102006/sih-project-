"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { IconSearch, IconArrow } from "@/components/icons";

type Recent = { id: number; title: string; authenticity: number; artist: string }[];

export function VerifyPanel({ recent }: { recent: Recent }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-surface text-brass">
          <IconSearch className="size-6" />
        </span>
        <h1 className="mt-7 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Verify an artwork
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-muted text-balance">
          Enter the certificate number found on the painting or its QR label. No login, no app —
          anyone can check.
        </p>
      </div>

      <Card className="mt-10 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(q.trim().replace(/^#/, ""));
            if (Number.isInteger(n) && n > 0) router.push(`/verify/${n}`);
          }}
        >
          <label htmlFor="cert" className="mb-2 block text-xs font-medium text-ink-muted">
            Certificate ID
          </label>
          <div className="flex gap-2">
            <input
              id="cert"
              type="text"
              inputMode="numeric"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. 3"
              className="h-12 w-full rounded-md border border-line bg-surface-2 px-4 text-sm text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
            />
            <button type="submit" className="shrink-0 px-6">
              <span className="flex items-center gap-2">
                Check
                <IconArrow className="size-4" />
              </span>
            </button>
          </div>
        </form>

        {recent.length > 0 ? (
          <>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] tracking-wide text-ink-faint uppercase">or try one</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <ul className="space-y-1">
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/verify/${r.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="w-8 shrink-0 font-mono text-xs text-brass">#{r.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{r.title}</span>
                      <span className="block truncate text-xs text-ink-faint">{r.artist}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">
                      {r.authenticity}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      <p className="mt-6 text-center text-xs text-ink-faint">
        Scanning the QR on a painting brings you straight here.
      </p>

      <div className="mt-14">
        <Button href="/how-it-works" variant="ghost" size="sm" className="w-full">
          How verification actually works →
        </Button>
      </div>
    </div>
  );
}
