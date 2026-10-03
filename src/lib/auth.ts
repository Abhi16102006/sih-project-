import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, type User } from "./db";

const COOKIE = "ks_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET ?? "kalasecure-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUserId(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<User | null> {
  const id = await currentUserId();
  if (id === null) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined ?? null;
}

export function findUserByEmail(email: string): User | null {
  return (db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined) ?? null;
}

export function findUserById(id: number): User | null {
  return (db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined) ?? null;
}

/**
 * Give every registered artist a deterministic demo wallet so they can
 * transact immediately without installing MetaMask.
 */
export function deriveDemoWallet(userId: number): string {
  const seed = `${process.env.AUTH_SECRET ?? "kalasecure"}:wallet:${userId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0").repeat(5).slice(0, 40);
  return `0x${hex.slice(0, 40)}`.slice(0, 42);
}