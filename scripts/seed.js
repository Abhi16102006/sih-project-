/**
 * Seeds demo artists and artwork so the gallery is never empty on first run.
 * Safe to re-run: it clears the demo rows and rebuilds them.
 *
 *   node scripts/seed.js
 */
const fs = require("fs");
const path = require("path");

// Load .env.local so the deployer key is available without extra tooling.
const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const sharp = require("sharp");
const crypto = require("crypto");

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "kalasecure.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, bio TEXT DEFAULT '', location TEXT DEFAULT '',
    wallet TEXT, verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, token_id INTEGER UNIQUE,
    artist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT DEFAULT '', medium TEXT DEFAULT 'Digital',
    dimensions TEXT DEFAULT '', price_eth REAL NOT NULL DEFAULT 0, year INTEGER,
    content_hash TEXT NOT NULL, dhash TEXT, ipfs_cid TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/png', file_size INTEGER DEFAULT 0,
    authenticity INTEGER NOT NULL DEFAULT 100, tx_hash TEXT, status TEXT NOT NULL DEFAULT 'registered',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS similarity_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    match_id INTEGER, similarity REAL NOT NULL, verdict TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_artworks_artist ON artworks(artist_id);
  CREATE INDEX IF NOT EXISTS idx_artworks_token ON artworks(token_id);
  CREATE INDEX IF NOT EXISTS idx_similarity_match ON similarity_checks(match_id);
`);

/* --------------------------- helpers (mirror src/lib) ------------------- */

const IPFS_DIR = path.join(DATA_DIR, "ipfs-blocks");
fs.mkdirSync(IPFS_DIR, { recursive: true });

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58(buf) {
  let num = BigInt("0x" + buf.toString("hex"));
  let out = "";
  while (num > 0n) {
    out = B58[Number(num % 58n)] + out;
    num /= 58n;
  }
  for (const b of buf) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

function put(bytes) {
  const digest = crypto.createHash("sha256").update(bytes).digest();
  const cid = b58(Buffer.concat([Buffer.from([0x12, 0x20]), digest]));
  fs.writeFileSync(path.join(IPFS_DIR, cid), bytes);
  return { cid, size: bytes.length };
}

function sha256hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function fingerprint(buf) {
  const { data: gray } = await sharp(buf)
    .greyscale().blur(1.2).resize(17, 16, { fit: "fill" })
    .raw().toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      bits = (bits << 1n) | (gray[y * 17 + x] > gray[y * 17 + x + 1] ? 1n : 0n);

  // Spatial colour signature: 4x4 grid of average RGB cells.
  const { data: rgb } = await sharp(buf)
    .removeAlpha().resize(4, 4, { fit: "fill", kernel: "lanczos3" })
    .raw().toBuffer({ resolveWithObject: true });
  const hist = Buffer.from(rgb);

  return { structure: bits.toString(16).padStart(64, "0"), histogram: hist.toString("hex") };
}

function rng(s) { let x = s >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Generates an abstract artwork that actually looks like something. */
function artSvg(w, h, seed, salt) {
  const r = rng(seed);
  const hue = (seed * 47) % 360;
  let shapes = "";
  for (let i = 0; i < 9; i++) {
    const cx = r() * w, cy = r() * h, s = (0.06 + r() * 0.26) * w;
    const h2 = ((hue + r() * 160) | 0) % 360;
    const op = (0.22 + r() * 0.45).toFixed(2);
    if (r() > 0.5) {
      shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${s.toFixed(1)}" fill="hsl(${h2},${55 + r() * 30 | 0}%,${30 + r() * 45 | 0}%)" opacity="${op}"/>`;
    } else {
      shapes += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${s.toFixed(1)}" height="${(s * (0.4 + r())).toFixed(1)}" fill="hsl(${h2},${50 + r() * 35 | 0}%,${28 + r() * 50 | 0}%)" opacity="${op}" transform="rotate(${(r() * 80 - 40).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},${45 + r() * 25 | 0}%,${18 + r() * 14 | 0}%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 70) % 360},${40 + r() * 25 | 0}%,${34 + r() * 22 | 0}%)"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${shapes}
    <rect width="100%" height="100%" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="${(w * 0.012).toFixed(1)}"/>
    ${salt ? `<text x="${(w - 46).toFixed(0)}" y="${(h - 18).toFixed(0)}" font-family="monospace" font-size="13" fill="rgba(255,255,255,0.13)" text-anchor="end">${salt}</text>` : ""}
  </svg>`;
}

/* ------------------------------- seed ---------------------------------- */

const ARTISTS = [
  {
    name: "Aisha Deshmukh", email: "aisha@kalasecure.art", location: "Kolhapur, Maharashtra",
    bio: "Contemporary painter working in acrylic and charcoal. Interested in coastal memory and the way light moves through a room nobody lives in any more.",
    wallet: "0x9f2c4a7b1e8d3056c4b7a2f9e1d8c3b5a7f9e2d4",
    works: [
      { title: "Monsoon Over the Konkan", medium: "Acrylic on canvas", dims: "90 x 70 cm", price: 1.4, year: 2025,
        desc: "Painted across three monsoons. The drips are not a technique — they are a record of the window being open." },
      { title: "Salt and Cedar", medium: "Charcoal on paper", dims: "56 x 42 cm", price: 0.6, year: 2024,
        desc: "A study of the old port warehouses before the restoration." },
      { title: "Untitled (Blue Room)", medium: "Acrylic on canvas", dims: "60 x 60 cm", price: 0.95, year: 2026,
        desc: "The only painting I made without looking at a photograph." },
    ],
  },
  {
    name: "Rohan Iyer", email: "rohan@kalasecure.art", location: "Chennai, Tamil Nadu",
    bio: "Mixed-media artist and printmaker. My work deals with the administrative paperwork of memory — ration cards, leases, and the forms they leave behind.",
    wallet: "0x3b81e5c2d9a70f46b2c8e5d1a9f4b7c0e2d5a8f3",
    works: [
      { title: "Form 12, Twice Signed", medium: "Screenprint and ink", dims: "76 x 56 cm", price: 0.8, year: 2025,
        desc: "Two ownership documents from the same family, layered until the signatures merge." },
      { title: "Ledger of Small Repairs", medium: "Ink on paper", dims: "42 x 30 cm", price: 0.35, year: 2026,
        desc: "Every line is a real repair logged by my grandmother's household." },
    ],
  },
  {
    name: "Meera Nair", email: "meera@kalasecure.art", location: "Kochi, Kerala",
    bio: "Watercolourist and teacher. I paint the backwaters at the hour when the light goes gold and nobody is speaking.",
    wallet: "0x7c4a2f9d6b3e8157c0a4d2f8b6e3c9a5d1f7b0e2",
    works: [
      { title: "Backwater, Golden Hour", medium: "Watercolour on cotton", dims: "54 x 40 cm", price: 1.1, year: 2025,
        desc: "Six hours of work in ninety minutes of light. Most of it is luck." },
      { title: "The Houseboat at Low Tide", medium: "Watercolour on cotton", dims: "48 x 36 cm", price: 0.75, year: 2026,
        desc: "When the water drops, the boat stops floating and starts being a building." },
    ],
  },
];

async function main() {
  // The contract rejects a content hash it has already seen, so each seed run
  // stamps a fresh salt into the generated images. Re-running `npm run seed`
  // then always succeeds instead of colliding with its own previous output.
  const RUN_SALT = crypto.randomBytes(3).toString("hex");
  console.log(`Resetting demo data… (run ${RUN_SALT})`);
  db.exec("DELETE FROM similarity_checks; DELETE FROM artworks; DELETE FROM users;");
  // Reset AUTOINCREMENT counters so certificates start at #1 on every seed.
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','artworks','similarity_checks');");
  if (fs.existsSync(IPFS_DIR)) {
    for (const f of fs.readdirSync(IPFS_DIR)) fs.unlinkSync(path.join(IPFS_DIR, f));
  }

  const hash = bcrypt.hashSync("kalasecure123", 10);

  /* ---- optional: mint every seeded artwork on the local chain ---- */
  const { ethers } = require("ethers");
  const deployment = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src", "lib", "contract", "deployment.json"), "utf8"),
  );
  const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";

  let contract = null;
  let signer = null;
  let nonce = null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    await provider.getBlockNumber(); // throws if the node is down
    contract = new ethers.Contract(deployment.address, deployment.abi, provider);
    signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    nonce = await provider.getTransactionCount(signer.address, "pending");
    console.log("Chain reachable — minting certificates on-chain.\n");
  } catch (e) {
    console.log(`! Chain not reachable at ${RPC} — seeding locally only. (${e.shortMessage ?? e.message})`);
    console.log("  Start it with `npm run chain`, then re-run `npm run seed`.\n");
  }

  for (const a of ARTISTS) {
    const info = db
      .prepare(`INSERT INTO users (name,email,password_hash,bio,location,wallet,verified)
                VALUES (?,?,?,?,?,?,1)`)
      .run(a.name, a.email, hash, a.bio, a.location, a.wallet);
    const uid = Number(info.lastInsertRowid);

    for (const w of a.works) {
      const png = await sharp(
        Buffer.from(
          artSvg(1200, 900, (a.name.length * 31 + w.title.length * 17) % 9973, RUN_SALT),
        ),
      )
        .png({ compressionLevel: 9 })
        .toBuffer();

      const stored = put(png);
      const fp = await fingerprint(png);
      const contentHash = "0x" + sha256hex(png);

      let tokenId = null;
      let txHash = null;

      if (contract) {
        try {
          const writable = contract.connect(signer);
          // ethers caches the account nonce, which makes back-to-back txs collide
          // ("nonce has already been used"). Track it explicitly and re-sync from
          // the node if a transaction is ever rejected for a stale value.
          const tx = await writable.registerArtwork(
            {
              title: w.title,
              description: w.desc,
              contentHash,
              ipfsCid: stored.cid,
              medium: w.medium,
              editionSize: 1,
              authenticity: 100,
            },
            { nonce },
          );
          const receipt = await tx.wait();
          nonce += 1;
          tokenId = Number(await writable.totalArtworks());
          txHash = receipt.hash;
        } catch (e) {
          console.log(`  ! mint failed for "${w.title}": ${e.shortMessage ?? e.message}`);
          // Recover from a stale nonce rather than failing the whole seed.
          try {
            nonce = await signer.provider.getTransactionCount(signer.address, "latest");
          } catch {
            /* leave as-is */
          }
        }
      }

      const ins = db
        .prepare(`INSERT INTO artworks
          (token_id,artist_id,title,description,medium,dimensions,price_eth,year,
           content_hash,dhash,ipfs_cid,mime_type,file_size,authenticity,tx_hash,status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(
          tokenId, uid, w.title, w.desc, w.medium, w.dims, w.price, w.year,
          contentHash, JSON.stringify(fp), stored.cid,
          "image/png", stored.size, 100,
          txHash, tokenId ? "registered" : "pending",
        );

      db.prepare(`INSERT INTO similarity_checks (artwork_id,match_id,similarity,verdict) VALUES (?,?,?,?)`)
        .run(Number(ins.lastInsertRowid), null, 0, "unique");

      console.log(`  ${tokenId === null ? "·" : "#" + String(tokenId).padEnd(2)}  ${w.title} — ${a.name}`);
    }
  }

  const n = db.prepare("SELECT COUNT(*) AS n FROM artworks").get().n;
  console.log(`\nSeeded ${ARTISTS.length} artists and ${n} artworks.`);
  console.log("Demo login: aisha@kalasecure.art / kalasecure123");
}

main().catch((e) => { console.error(e); process.exit(1); });
