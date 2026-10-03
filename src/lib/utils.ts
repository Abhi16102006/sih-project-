import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Small shared utility helpers used across the app. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(unix: bigint | number | null | undefined): string {
  if (unix === null || unix === undefined) return "—";
  const n = Number(unix);
  if (!Number.isFinite(n)) return "—";
  return new Date(n * 1000).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format a SQLite `datetime('now')` string ("YYYY-MM-DD HH:MM:SS", UTC). */
export function formatSqlDateTime(sql: string | null | undefined): string {
  if (!sql) return "—";
  // SQLite uses a space separator and no timezone marker; make it explicit UTC.
  const iso = sql.includes("T") ? sql : sql.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateHash(h: string | null | undefined, lead = 10, tail = 8): string {
  if (!h) return "—";
  if (h.length <= lead + tail + 2) return h;
  return `${h.slice(0, lead)}…${h.slice(-tail)}`;
}

export function shortCid(cid: string | null | undefined): string {
  if (!cid) return "—";
  return `${cid.slice(0, 12)}…${cid.slice(-6)}`;
}

export const EXPLORER_BASE = "https://sepolia.etherscan.io";