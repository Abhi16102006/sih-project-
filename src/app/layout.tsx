import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KalaSecure: Copyright and provenance for artists",
    template: "%s · KalaSecure",
  },
  description:
    "KalaSecure anchors every artwork to a blockchain certificate, detects copied work with perceptual fingerprinting, and lets anyone verify authenticity with a QR scan.",
  keywords: [
    "blockchain",
    "art provenance",
    "NFT",
    "copyright",
    "digital art",
    "Smart India Hackathon",
  ],
  openGraph: {
    title: "KalaSecure: Copyright and provenance for artists",
    description:
      "Blockchain-anchored certificates, copy detection, and instant QR verification for fine artists.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1512",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <div className="pointer-events-none fixed inset-0 glow-brass" aria-hidden />
        <div className="relative flex min-h-dvh flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}