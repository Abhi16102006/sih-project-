import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Zero-config SQLite database. File lives next to the app so the whole
 * project stays self-contained (no MySQL/Postgres install needed).
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "kalasecure.db");

function init(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const globalForDb = globalThis as unknown as { __ksDb?: Database.Database };
  const db = globalForDb.__ksDb ?? new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      bio           TEXT    DEFAULT '',
      location      TEXT    DEFAULT '',
      wallet        TEXT,
      verified      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS artworks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id      INTEGER UNIQUE,
      artist_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      medium        TEXT    DEFAULT 'Digital',
      dimensions    TEXT    DEFAULT '',
      price_eth     REAL    NOT NULL DEFAULT 0,
      year          INTEGER,
      content_hash  TEXT    NOT NULL,
      dhash         TEXT,
      ipfs_cid      TEXT    NOT NULL,
      mime_type     TEXT    DEFAULT 'image/png',
      file_size     INTEGER DEFAULT 0,
      authenticity  INTEGER NOT NULL DEFAULT 100,
      tx_hash       TEXT,
      status        TEXT    NOT NULL DEFAULT 'registered',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS similarity_checks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id    INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
      match_id      INTEGER,
      similarity    REAL    NOT NULL,
      verdict       TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_artworks_artist  ON artworks(artist_id);
    CREATE INDEX IF NOT EXISTS idx_artworks_token   ON artworks(token_id);
    CREATE INDEX IF NOT EXISTS idx_similarity_match ON similarity_checks(match_id);
  `);

  if (process.env.NODE_ENV !== "production") globalForDb.__ksDb = db;
  return db;
}

export const db = init();

export type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  bio: string;
  location: string;
  wallet: string | null;
  verified: number;
  created_at: string;
};

export type Artwork = {
  id: number;
  token_id: number | null;
  artist_id: number;
  title: string;
  description: string;
  medium: string;
  dimensions: string;
  price_eth: number;
  year: number | null;
  content_hash: string;
  dhash: string | null;
  ipfs_cid: string;
  mime_type: string;
  file_size: number;
  authenticity: number;
  tx_hash: string | null;
  status: string;
  created_at: string;
};