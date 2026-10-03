"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { IconWallet, IconAlert } from "@/components/icons";

/* ------------------------------------------------------------------ */
/*  Transfer ownership on-chain                                        */
/* ------------------------------------------------------------------ */

export function TransferButton({ artworkId }: { artworkId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      setMsg(null);
      try {
        const res = await fetch(`/api/artworks/${artworkId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note, to: to.trim() || undefined }),
        });
        const json = await res.json();
        if (!res.ok) {
          setMsg({ err: json.error ?? "Transfer failed" });
          return;
        }
        setMsg({ ok: `Transferred · tx ${json.txHash.slice(0, 10)}…` });
        setOpen(false);
        setNote("");
        setTo("");
        router.refresh();
      } catch {
        setMsg({ err: "Network error" });
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass("secondary", "md")}
      >
        <IconWallet className="size-4" />
        Record a transfer
      </button>

      {open ? (
        <div className="mt-4 w-full max-w-md rounded-lg border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold">Record a transfer on-chain</h3>
          <p className="mt-1.5 text-xs text-ink-muted">
            Sale, gift or consignment — the note is stored permanently in the provenance chain.
          </p>

          <label className="mt-4 block text-xs text-ink-faint" htmlFor="to-addr">
            Recipient wallet (optional)
          </label>
          <input
            id="to-addr"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x… leave blank to transfer to the demo wallet"
            className="mt-1.5 h-10 w-full rounded-md border border-line bg-surface-2 px-3 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
          />

          <label className="mt-3 block text-xs text-ink-faint" htmlFor="to-note">
            Note
          </label>
          <input
            id="to-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sold to collector via Kalakatha Auction, Pune"
            className="mt-1.5 h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
          />

          {msg ? (
            <p className={cn("mt-3 text-xs", msg.err ? "text-crimson" : "text-sage")}>
              {msg.err ?? msg.ok}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className={buttonClass("primary", "sm")}
            >
              {pending ? "Submitting…" : "Confirm transfer"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonClass("ghost", "sm")}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flag a suspected forgery                                           */
/* ------------------------------------------------------------------ */

export function FlagButton({ artworkId }: { artworkId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      setMsg(null);
      try {
        const res = await fetch(`/api/artworks/${artworkId}/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const json = await res.json();
        if (!res.ok) {
          setMsg({ err: json.error ?? "Could not submit report" });
          return;
        }
        setMsg({ ok: "Report recorded on-chain" });
        setOpen(false);
        router.refresh();
      } catch {
        setMsg({ err: "Network error" });
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass("secondary", "md")}
      >
        <IconAlert className="size-4" />
        Report as a forgery
      </button>

      {open ? (
        <div className="mt-4 w-full max-w-md rounded-lg border border-crimson/30 bg-crimson/6 p-5">
          <h3 className="text-sm font-semibold">Report this artwork</h3>
          <p className="mt-1.5 text-xs text-ink-muted">
            Flags are written to the blockchain and permanently visible on the certificate. Use
            this only for genuine forgeries.
          </p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="This painting matches a work already registered to a different artist…"
            className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brass-dim focus:outline-none"
          />

          {msg ? (
            <p className={cn("mt-3 text-xs", msg.err ? "text-crimson" : "text-sage")}>
              {msg.err ?? msg.ok}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className={buttonClass("danger", "sm")}
            >
              {pending ? "Submitting…" : "Submit report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
