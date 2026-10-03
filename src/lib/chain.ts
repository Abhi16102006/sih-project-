import { ethers } from "ethers";
import deployment from "./contract/deployment.json";

export const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
export const CONTRACT_ADDRESS = deployment.address as string;
export const ABI = deployment.abi as unknown as ethers.InterfaceAbi;

export type ArtworkOnChain = {
  tokenId: bigint;
  artist: string;
  title: string;
  description: string;
  contentHash: string;
  ipfsCid: string;
  medium: string;
  editionSize: bigint;
  registeredAt: bigint;
  authenticity: number;
  revoked: boolean;
  flaggedBy: string;
};

export type ProvenanceEvent = {
  actor: string;
  timestamp: bigint;
  action: string;
  note: string;
};

/** A read-only provider - never throws at import time. */
export function getProvider(): ethers.JsonRpcProvider | null {
  try {
    return new ethers.JsonRpcProvider(RPC_URL, {
      chainId: 31337,
      name: "KalaSecure Local Chain",
    });
  } catch {
    return null;
  }
}

export function getReadContract(): ethers.Contract | null {
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}

/**
 * A signing provider used by the API for demo transactions so the platform
 * can operate without every user installing MetaMask.
 * Falls back to a locally-derived read-only style wallet when unset.
 */
export async function getSigner(): Promise<ethers.Wallet | null> {
  if (!process.env.DEPLOYER_PRIVATE_KEY) return null;
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
}

/**
 * The account that files copy reports. Flags must come from someone other than
 * the artist (the contract rejects self-flagging), and the deployer key owns
 * every seeded work — so reports use a distinct second account.
 */
export async function getReporterSigner(): Promise<ethers.Wallet | null> {
  if (!process.env.REPORTER_PRIVATE_KEY) return getSigner();
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Wallet(process.env.REPORTER_PRIVATE_KEY, provider);
}

/** Turn a raw revert into something a human can act on. */
export function describeChainError(e: unknown): string {
  if (!(e instanceof Error)) return "Unknown chain error";
  const raw = (e as { data?: string; shortMessage?: string }).data ?? e.message;
  try {
    const iface = new ethers.Interface([
      "error Error(string)",
      "error ArtworkAlreadyRevoked()",
      "error ZeroAddress()",
      "error DuplicateHash()",
      "error ArtworkNotFound()",
    ]);
    const parsed = iface.parseError(String(raw));
    if (parsed) {
      const args = parsed.args.map((a) => String(a));
      return args.length ? `${parsed.name}: ${args.join(", ")}` : parsed.name;
    }
  } catch {
    /* fall through to the raw message */
  }
  return String(raw).slice(0, 160);
}

export async function chainIsLive(): Promise<boolean> {
  try {
    const provider = getProvider();
    if (!provider) return false;
    const n = await provider.getBlockNumber();
    return n >= 0;
  } catch {
    return false;
  }
}

export async function readArtwork(tokenId: number): Promise<ArtworkOnChain | null> {
  const c = getReadContract();
  if (!c) return null;
  try {
    return (await c.getArtwork(tokenId)) as ArtworkOnChain;
  } catch {
    return null;
  }
}

export async function readOwner(tokenId: number): Promise<string | null> {
  const c = getReadContract();
  if (!c) return null;
  try {
    return (await c.ownerOf(tokenId)) as string;
  } catch {
    return null;
  }
}

export async function readProvenance(tokenId: number): Promise<ProvenanceEvent[]> {
  const c = getReadContract();
  if (!c) return [];
  try {
    const raw = (await c.getProvenance(tokenId)) as unknown as readonly unknown[][];
    // ethers returns tuples whose named fields sit on the prototype, so spread
    // would silently drop them. Read by index in the struct's ABI order:
    // (actor, timestamp, action, note).
    return raw.map((e) => ({
      actor: String(e[0]),
      timestamp: BigInt(e[1] as string | number | bigint),
      action: String(e[2]),
      note: String(e[3] ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function verifyOnChain(
  tokenId: number,
): Promise<{
  exists: boolean;
  valid: boolean;
  owner: string;
  contentHash: string;
  ipfsCid: string;
}> {
  const c = getReadContract();
  const empty = {
    exists: false,
    valid: false,
    owner: "0x0000000000000000000000000000000000000000",
    contentHash: "",
    ipfsCid: "",
  };
  if (!c) return empty;
  try {
    const [exists, valid, owner, contentHash, ipfsCid] = await c.verifyArtwork(tokenId);
    return { exists, valid, owner, contentHash, ipfsCid };
  } catch {
    return empty;
  }
}

/** Shorten an address for display. */
export function shortAddress(addr?: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerTx(txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}
/**
 * Gas limits are estimated rather than hardcoded.
 *
 * A fixed cap that was fine against a small registry silently stopped being
 * enough as the registry grew (storage writes get dearer), which surfaced as
 * an opaque "transaction ran out of gas". Estimating keeps this correct as the
 * chain fills up; the fallback covers the case where estimation is unavailable.
 */
export async function withGasEstimate(
  estimate: () => Promise<bigint>,
  fallback: bigint,
): Promise<{ gasLimit: bigint }> {
  try {
    // 25% headroom: the estimate is taken against the current state, which can
    // shift by the time the transaction is mined.
    return { gasLimit: (await estimate()) * 5n / 4n };
  } catch {
    return { gasLimit: fallback };
  }
}
