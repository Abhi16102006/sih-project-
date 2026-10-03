"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconImage, IconClose, IconSpark, IconShield } from "@/components/icons";
import { Doodle } from "@/components/doodle";
import { buttonClass } from "@/components/ui";
import { cn, formatBytes } from "@/lib/utils";

type Phase = "idle" | "analysing" | "minting" | "done" | "error";

type Result = {
  artworkId: number;
  tokenId: number | null;
  txHash: string | null;
  cid: string;
  contentHash: string;
  authenticity: number;
  scan: {
    similarity: number;
    verdict: "unique" | "likely-copy" | "duplicate";
    match: { id: number; title: string; artist: string; similarity: number } | null;
  };
  chain: { status: "minted" | "queued" | "rejected-copy"; error: string | null };
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  analysing: "Hashing and scanning against the gallery…",
  minting: "Anchoring certificate on-chain…",
  done: "Registered",
  error: "Something went wrong",
};

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [drag, setDrag] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That file is not an image. Please choose a PNG, JPEG or WebP.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setError(`That image is ${formatBytes(f.size)} — the limit is 12 MB.`);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image to register.");
      return;
    }

    const body = new FormData(e.currentTarget);
    body.set("image", file);

    try {
      setPhase("analysing");
      // Give the perceptual scan a beat so the stages are legible to a viewer.
      const res = await fetch("/api/artworks", { method: "POST", body });

      setPhase("minting");
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Registration failed");
        setPhase("error");
        return;
      }

      setResult(json as Result);
      setPhase("done");
      router.refresh();
    } catch {
      setError("Network error. Is the dev server still running?");
      setPhase("error");
    }
  }

  if (phase === "done" && result) {
    return <Success result={result} onReset={() => { setPhase("idle"); setResult(null); setFile(null); setPreview(null); }} />;
  }

  const busy = phase === "analysing" || phase === "minting";

  return (
    <form onSubmit={submit}>
      {/* ---------------------- dropzone ---------------------- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={cn(
          "relative overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          drag ? "border-brass bg-brass/5" : "border-line hover:border-brass-dim",
          preview ? "aspect-[16/9]" : "py-16",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected artwork" className="size-full object-contain" />
            {!busy ? (
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-sm border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
                aria-label="Remove image"
              >
                <IconClose className="size-4" />
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 px-6 text-center"
          >
            <Doodle
              variant="arrowDown"
              width={34}
              height={44}
              seed={36}
              strokeWidth={1.8}
              className="text-brass"
            />
            <span className="text-sm font-medium">Drop an image here, or click to browse</span>
            <span className="text-xs text-ink-faint">PNG, JPEG, WebP, GIF or AVIF · up to 12 MB</span>
          </button>
        )}
      </div>

      {file && !preview ? <p className="mt-3 text-sm text-brass">Loading preview…</p> : null}

      {/* ---------------------- metadata ---------------------- */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Meta label="Title" name="title" placeholder="Madhubani Morning Light" required />
        </div>

        <Meta label="Medium" name="medium" placeholder="Acrylic on canvas" defaultValue="Digital" />
        <Meta label="Dimensions" name="dimensions" placeholder="60 x 46 cm" />

        <Meta label="Year" name="year" type="number" placeholder="2026" />
        <Meta label="Asking price (ETH)" name="priceEth" type="number" step="0.01" placeholder="0.85" />

        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-ink-muted">
            Story &amp; description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Painted in the Mithila tradition after three weeks of field research…"
            className="w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-soft focus:border-brass-dim focus:outline-none"
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-md border border-crimson/35 bg-crimson/10 px-4 py-3 text-sm text-crimson"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !file}
          className={buttonClass("primary", "lg", "min-w-52")}
        >
          {busy ? (
            <>
              <Spinner />
              {PHASE_LABEL[phase]}
            </>
          ) : (
            <>
              <IconShield className="size-4" />
              Register &amp; anchor on-chain
            </>
          )}
        </button>
        {!file ? (
          <p className="text-xs text-ink-faint">Choose an image to enable registration.</p>
        ) : null}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Meta({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={props.name} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={props.name}
        className="h-11 w-full rounded-sm border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-soft focus:border-brass-dim focus:outline-none"
        {...props}
      />
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Success({ result, onReset }: { result: Result; onReset: () => void }) {
  const { scan, chain } = result;
  const verdictTone =
    scan.verdict === "duplicate" ? "crimson" : scan.verdict === "likely-copy" ? "brass" : "sage";

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-sm border border-sage/45 text-sage">
          <IconShield className="size-6" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold">Certificate issued</h2>
          <p className="text-sm text-ink-muted">
            {chain.status === "minted"
              ? `Anchored on-chain as token #${result.tokenId}.`
              : "Saved locally. The mint stays pending until the chain node is reachable."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ResultTile label="Authenticity score" value={`${result.authenticity}/100`} big />
        <ResultTile label="Best visual match" value={`${scan.similarity}%`} big />
      </div>

      <div
        className={cn(
          "mt-4 rounded-lg border p-5",
          verdictTone === "crimson" && "border-crimson/35 bg-crimson/8",
          verdictTone === "brass" && "border-brass/35 bg-brass/8",
          verdictTone === "sage" && "border-sage/35 bg-sage/8",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <IconSpark className="size-4" />
          Copy scan:{" "}
          <span className="uppercase">{scan.verdict.replace("-", " ")}</span>
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {scan.match ? (
            <>
              Closest artwork is <em>{scan.match.title}</em> by {scan.match.artist} at{" "}
              {scan.match.similarity}% visual similarity.
            </>
          ) : (
            "No other registered artwork resembles this image."
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-line bg-surface p-5 font-mono text-xs">
        <Row k="CID" v={result.cid} />
        <Row k="SHA-256" v={result.contentHash} />
        {result.txHash ? <Row k="Tx" v={result.txHash} /> : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a href={`/artwork/${result.artworkId}`} className={buttonClass("primary", "md")}>
          View certificate &amp; QR
        </a>
        <button type="button" onClick={onReset} className={buttonClass("secondary", "md")}>
          Register another
        </button>
      </div>
    </div>
  );
}

function ResultTile({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-4">
      <p className="text-xs tracking-wide text-ink-faint uppercase">{label}</p>
      <p className={cn("mt-1.5 font-display font-semibold", big ? "text-3xl" : "text-xl")}>
        {value}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-ink-faint">{k}</span>
      <span className="truncate text-ink-muted" title={v}>
        {v}
      </span>
    </div>
  );
}

export { IconImage };
