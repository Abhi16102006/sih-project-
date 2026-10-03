import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* left: the form */}
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* right: brand panel, hidden on small screens */}
      <div className="relative hidden overflow-hidden border-l border-line-soft bg-surface/50 lg:block">
        <div className="relative flex h-full flex-col justify-between p-14">
          <blockquote className="max-w-md">
            <p className="font-display text-3xl leading-snug text-balance">
              “The certificate is only as good as the ledger behind it.”
            </p>
            <footer className="mt-6 text-sm text-ink-faint">
              KalaSecure, one immutable record per painting.
            </footer>
          </blockquote>

          <ul className="space-y-4 text-sm text-ink-muted">
            {[
              "Certificate bound to a SHA-256 content hash",
              "Copies detected before minting",
              "Full ownership history, publicly readable",
              "QR verification, no account required",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="size-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link href="/" className="sr-only">
        Back to home
      </Link>
    </div>
  );
}
