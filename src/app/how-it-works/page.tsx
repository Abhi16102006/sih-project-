import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { Doodle, Underline } from "@/components/doodle";
import { IconCheck, IconAlert } from "@/components/icons";

export const metadata: Metadata = {
  title: "How it works",
  description: "The full technical pipeline behind a KalaSecure certificate.",
};

const STEPS = [
  {
    n: "01",
    title: "Hash the file",
      body: "We compute SHA-256 over the raw bytes. The digest is a 256-bit fingerprint: change a single pixel and every digit changes. This value is the artwork's identity for the rest of its life.",
    code: "contentHash = sha256(imageBytes)\n// 0x9f2c…  64 hex characters",
  },
  {
    n: "02",
    title: "Store it content-addressed",
      body: "The bytes are written to storage and labelled with an IPFS CID, an address derived from the content itself. Because the name is the hash, the address is proof the bytes have not been swapped.",
    code: 'cid = base58(0x1220 + sha256(bytes))\n// QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  },
  {
    n: "03",
    title: "Fingerprint for copy detection",
      body: "A cryptographic hash cannot spot a copy, because re-saving an image changes the bytes. So we also compute a perceptual fingerprint: a 256-bit difference hash over a blurred greyscale grid, blended with the average colour of each cell in a 4x4 grid. Resizes, recompression and brightness shifts survive it. Genuinely different paintings do not.",
    code:
      "structure = dHash(blur(grey(image)), 17x16)   // 256 bits\ncolour    = avgRGB(image, 4x4)          // 48 bytes\nsimilarity = 0.65*structure + 0.35*colour  // 0..100",
  },
  {
    n: "04",
    title: "Scan and score",
      body: "The fingerprint is compared against every registered artwork. A match of 93% or more is a duplicate, 85% or more is a likely copy, and the authenticity score written to the chain is capped accordingly. A forged copy can never look authentic.",
    code: "93%+ -> duplicate  -> score <= 40\n85%+ -> likely copy -> score <= 80\nelse -> unique    -> score 100",
  },
  {
    n: "05",
    title: "Anchor on-chain",
      body: "A Solidity contract stores the certificate as an ERC-721 token: title, artist, CID, hash and an authenticity score. The contract also rejects any registration whose SHA-256 already exists, which makes double-registration impossible.",
    code: "registerArtwork({\n  title, description,\n  contentHash, ipfsCid,\n  medium, editionSize: 1, authenticity\n})",
  },
  {
    n: "06",
    title: "Verify by scan",
      body: "The artist prints a QR label onto the painting. Scanning it opens a public page that re-runs three independent checks live: does the token exist on-chain, does the stored file still hash to the recorded value, and has anything been flagged or revoked.",
    code: "GET /api/artworks/:id\n  → on-chain record exists\n  → recomputed sha256 == recorded\n  → no flags or revocations",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header className="text-center">
        <SectionTitle
          eyebrow="Under the hood"
          title="How a certificate is made"
          description="No black boxes. Every step is either a well-known primitive you can audit or code you can read in this repository."
        />
      </header>

      {/* A numbered spec sheet: step number in the margin, like a lab notebook. */}
      <ol className="mt-16 border-t border-line-soft">
        {STEPS.map((s, si) => (
          <li
            key={s.n}
            className="grid gap-x-10 gap-y-5 border-b border-line-soft py-9 lg:grid-cols-[5rem_minmax(0,1fr)]"
          >
            <div className="flex items-baseline gap-2 lg:block">
              <span
                className="font-mono text-2xl font-semibold tabular-nums text-brass"
              >
                {s.n}
              </span>
              <span className="mt-1 hidden h-8 w-px bg-line lg:block" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold">
                <Underline seed={2 + si * 3}>{s.title}</Underline>
              </h2>
              <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
                {s.body}
              </p>
              <pre className="mt-5 overflow-x-auto rounded-sm border border-line-soft bg-canvas/70 px-4 py-3.5 font-mono text-xs leading-relaxed text-ink-muted">
                {s.code}
              </pre>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-16">
        <div className="relative flex items-center gap-2.5">
          <h2 className="font-display text-2xl font-semibold">
            What is <Underline seed={23} double>genuinely</Underline> tamper-proof
          </h2>
          <span className="h-px flex-1 bg-line-soft" aria-hidden />
        </div>
        <div className="relative mt-7 grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-3">
          <Claim ok icon={<IconCheck className="size-3.5" />}>
            <strong className="text-ink">The certificate contents.</strong> Once written, a
            title, hash or CID cannot be altered or deleted, not by the artist, not by the
            platform, not by anyone with more money.
          </Claim>
          <Claim ok icon={<IconCheck className="size-3.5" />}>
            <strong className="text-ink">The order of ownership transfers.</strong> Each sale
            appends to the chain, so the history cannot be rewritten.
          </Claim>
          <Claim icon={<IconAlert className="size-3.5" />}>
            <strong className="text-ink">Honesty at registration.</strong> A blockchain cannot
            prove an artist painted it. It proves that this particular claim was made at a
            particular time and has not changed since.
          </Claim>
          {/* Points at the one card that says no. The claim that something is
              honest is the only one here a reader should not take on faith. */}
          <Doodle
            variant="arrowDown"
            width={22}
            height={34}
            seed={41}
            strokeWidth={1.8}
            className="doodle-mark -top-9 right-8 -rotate-[18deg]"
          />
        </div>
      </section>
    </div>
  );
}

function Claim({
  children,
  ok = false,
  icon,
}: {
  children: React.ReactNode;
  ok?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-canvas p-6">
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase ${
          ok ? "text-sage" : "text-crimson"
        }`}
      >
        {icon}
        {ok ? "Holds" : "Does not hold"}
      </span>
      <p className="mt-3.5 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
