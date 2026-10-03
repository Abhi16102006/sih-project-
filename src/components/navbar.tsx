import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { buttonClass } from "./ui";
import { IconPalette } from "./icons";

const NAV = [
  { href: "/gallery", label: "Gallery" },
  { href: "/artists", label: "Artists" },
  { href: "/verify", label: "Verify" },
  { href: "/how-it-works", label: "How it works" },
];

export async function Navbar() {
  const user = await currentUser();

  return (
    // A brass rule along the bottom edge, the way a light rail sits above a wall.
    <header className="sticky top-0 z-50 border-b border-line-soft bg-canvas/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-15 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* A brass plate, not an icon in a tinted rounded square. */}
          <span className="grid size-8 place-items-center rounded-sm bg-ink text-brass-soft">
            <IconPalette className="size-4.5" />
          </span>
          <span className="font-display text-[1.0625rem] font-semibold tracking-tight">
            Kala<span className="text-brass">Secure</span>
          </span>
        </Link>

        <div className="hidden items-center md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative px-3.5 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
              <span
                className="absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-brass transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden
              />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className={buttonClass("secondary", "sm")}>
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>
                Join as artist
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
