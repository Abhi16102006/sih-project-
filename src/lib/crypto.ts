import crypto from "node:crypto";

/** sha256 of raw bytes, `0x`-prefixed (matches what the contract stores). */
export function sha256(bytes: Buffer | Uint8Array): string {
  return "0x" + crypto.createHash("sha256").update(bytes).digest("hex");
}

/** sha256 of a buffer, bare hex (no 0x) — used for the stored fingerprint row. */
export function sha256hex(bytes: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}