import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * A minimal, dependency-free IPFS-style content-addressed store.
 *
 * Why not a real IPFS node? Because a hackathon demo must run with zero
 * external services. This computes the REAL IPFS CIDv0 for the bytes
 * (base58btc of the sha2-256 multihash), stores the file under that name,
 * and serves it back through a local gateway route.
 *
 * Swap `put()` for an nft.storage / Pinata client and the rest of the app
 * keeps working unchanged - the CID format is identical.
 */

const BLOCKS_DIR = path.join(process.cwd(), "data", "ipfs-blocks");

// base58btc alphabet (no 0, O, I, l)
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const digits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}

/** Real CIDv0 = base58btc(0x12 0x20 || sha256(content)) */
export function cidV0(content: Buffer): string {
  const digest = crypto.createHash("sha256").update(content).digest();
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), digest]);
  return base58Encode(new Uint8Array(multihash));
}

export type StoredFile = {
  cid: string;
  sha256: string;
  size: number;
  path: string;
};

export function put(content: Buffer): StoredFile {
  fs.mkdirSync(BLOCKS_DIR, { recursive: true });

  const cid = cidV0(content);
  const sha256 = crypto.createHash("sha256").update(content).digest("hex");
  const filePath = path.join(BLOCKS_DIR, cid);

  // Content-addressed: if it exists the bytes are identical by definition.
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);

  return { cid, sha256, size: content.length, path: filePath };
}

export function get(cid: string): Buffer | null {
  // CID is validated by construction (alphabet + length) to block path traversal.
  if (!/^[1-9A-HJ-NP-Za-km-z]{46,}$/.test(cid)) return null;
  const filePath = path.join(BLOCKS_DIR, cid);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function exists(cid: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{46,}$/.test(cid) && fs.existsSync(path.join(BLOCKS_DIR, cid));
}