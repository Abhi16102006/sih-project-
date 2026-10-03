import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp and better-sqlite3 are native modules used by the fingerprint and
  // storage layers; keep them external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "sharp"],
};

export default nextConfig;
