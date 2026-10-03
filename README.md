# KalaSecure

**Digital Art Copyright & Provenance Platform Using Blockchain**

A working prototype: artists register a painting, the file is stored content-addressed (IPFS-style),
its fingerprint is checked against every existing work to catch copies, and a certificate of
ownership + provenance is anchored on-chain. Anyone can then scan a QR code on the physical
painting and verify it publicly.

Built for Smart India Hackathon 2026.

---

## Quick start

```bash
cd kalasecure-web
npm install
cp .env.example .env.local
npm run compile
npm run dev
```

Open **http://localhost:3000**

That is genuinely all of it. `npm run dev` starts the chain, waits for it, deploys the
contract, seeds the demo catalogue, and starts the web app — in that order, automatically.
The first run takes about 30 seconds.

You can also do it by hand if you prefer:

```bash
npm run chain      # terminal 1
npm run setup      # terminal 2 — compile, deploy, seed
npm run web        # terminal 3
```

### Demo accounts

| Email | Password |
| --- | --- |
| `aisha@kalasecure.art` | `kalasecure123` |
| `rohan@kalasecure.art` | `kalasecure123` |
| `meera@kalasecure.art` | `kalasecure123` |

You can also register a fresh account — it works end to end.

### What `npm run dev` does

It runs two processes together:

1. **Hardhat node** — a local EVM at `http://127.0.0.1:8545` (chain id `31337`).
2. **`scripts/dev-chain.js`** — wraps the node: waits for it to come up, then deploys
   and seeds *only if the registry is missing or out of sync*.
3. **Next.js** — the web app at `http://localhost:3000`.

The auto-setup step matters: a Hardhat node keeps its state in memory, so restarting it
empties the registry while the database still lists certificates — and suddenly every verify
page fails for reasons you never caused. The wrapper detects that and re-seeds instead.
It is idempotent, so a healthy chain is left untouched.

No MetaMask, wallet extension, or testnet funds are needed. The server signs demo transactions
with a local deployer key, so the whole flow is clickable straight away.

---

## The scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Chain + auto-setup + web app together (the normal way to run it) |
| `npm run chain` | Hardhat node + automatic deploy/seed if needed |
| `npm run web` | Next.js only |
| `npm run compile` | Compile the Solidity contract |
| `npm test` | 13 contract tests |
| `npm run deploy` | Deploy to the running local chain, write the ABI + address |
| `npm run deploy:reset` | Deploy a fresh instance (new address, empty registry) |
| `npm run seed` | Wipe the DB and re-create 3 artists / 7 artworks, minted on-chain |
| `npm run setup` | `compile` → `deploy` → `seed`, run by hand |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |

---

## How a painting gets certified

```
upload ──► SHA-256 ──► store content-addressed (IPFS CIDv0)
                     │
                     ├─► perceptual scan vs every existing work
                     │     └─ unique / likely-copy / duplicate
                     │
                     └─► registerArtwork() on-chain  ──► QR code ──► public verify page
```

1. **Hash** — SHA-256 of the exact file bytes.
2. **Store** — the bytes go to a content-addressed store and get a real IPFS CIDv0
   (`base58(0x12 0x20 ‖ sha256)`). See `src/lib/ipfs.ts`.
3. **Copy scan** — a 256-bit dHash plus a 4×4 average-RGB colour signature are compared
   against every registered work. See `src/lib/perceptual-hash.ts`.
4. **Anchor** — the CID, hash, title, artist and authenticity score are written to
   `ArtworkRegistry.sol`. Only *proofs* go on-chain; image bytes stay off-chain.
5. **Label** — a QR code pointing at `/verify/{id}` can be printed and stuck beside the
   artist's signature.

### Two independent duplicate defences

| Check | Catches | Where |
| --- | --- | --- |
| Exact SHA-256 match | The literal same file re-uploaded | Solidity `registerArtwork` reverts with `DuplicateHash` |
| Perceptual fingerprint | Resized, re-saved, blurred, colour-shifted, screenshotted | `perceptual-hash.ts` scan at upload time |

Measured on the seeded catalogue: a resized + recompressed copy scores **97%**, while the most
similar *unrelated* pair scores **83%** (median 67%). Thresholds sit in that gap —
`DUPLICATE_THRESHOLD = 93`, `COPY_THRESHOLD = 85`.

The authenticity score is capped by the verdict, so a detected copy can never look genuine:

| Verdict | Max authenticity |
| --- | --- |
| `unique` | 100 |
| `likely-copy` | 80 |
| `duplicate` | 40 |

---

## What `/verify/{id}` actually checks

The verify page does not just read our database — it runs four independent checks:

| Check | Meaning |
| --- | --- |
| Blockchain record | The token exists in `ArtworkRegistry` |
| Hash matches certificate | The hash on-chain equals the hash of the stored file |
| Not revoked or flagged | Nobody has reported it as a copy, and the curator has not revoked it |
| Stored file intact | Re-hashing the stored bytes today still reproduces the certificate |

Plus a CID cross-check: the IPFS CID recorded on-chain must equal the one in our records.
Every one of these reads from the chain, not from a flag we control.

---

## Pages

| Route | What it does |
| --- | --- |
| `/` | Landing: what the problem is and how KalaSecure answers it, with live registry stats |
| `/gallery` | Every registered artwork, with authenticity scores |
| `/artists` | The artists, with their catalogues |
| `/artwork/{id}` | Full certificate: provenance chain, hashes, CID, transfer + flag actions |
| `/verify` | Lookup form |
| `/verify/{id}` | Public verification — no account needed |
| `/dashboard` | An artist's own works, flagged works, and transfers |
| `/upload` | Drag-and-drop registration with a live progress trace |
| `/how-it-works` | The six technical steps, with real code excerpts |
| `/architecture` | Layer diagram and design decisions |
| `/login`, `/register` | Session auth (bcrypt + signed httpOnly JWT cookie) |

---

## Demo script (about 3 minutes)

This is the path to take when demonstrating.

1. **Land on `/`.** Live counts of certificates and artists are read from the chain.
2. **Open `/gallery`** and click *Monsoon Over the Konkan*.
3. **Show the certificate.** Provenance, both hashes, the IPFS CID, the QR label.
4. **Demo copy detection.** Click *Download painting*, resize or re-save the file in
   Preview/Photos, then upload it from `/upload`. KalaSecure reports ~97% similarity,
   calls it a **duplicate**, points at the original, and drops the authenticity score to
   ~20. Then open the original's verify page to show its score is untouched.
5. **Demo the QR.** Download the QR label and scan it — it opens `/verify/{id}` with no login.
6. **Demo a transfer.** From the artwork page, transfer ownership. The provenance chain gains
   a `TRANSFERRED` entry naming the sender, and the public verify page shows the new owner.
7. **Demo a flag.** Flag a work. Verification flips to a red "flagged" state, while the other
   three checks still pass — showing the checks are independent.
8. **Show `/how-it-works`** for the technical depth.

---

## Project layout

```
contracts/ArtworkRegistry.sol   ERC-721 + provenance + flagging/revocation
scripts/deploy.js               deploy + write ABI/address to src/lib/contract/
scripts/seed.js                 generate demo artwork, fingerprint it, mint on-chain
test/ArtworkRegistry.js         13 tests

src/lib/
  ipfs.ts             content-addressed store, real CIDv0
  perceptual-hash.ts  dHash + colour fingerprint, verdict, authenticity scoring
  crypto.ts           sha256
  chain.ts            ethers v6 client, read helpers, revert decoding
  db.ts               SQLite (WAL) — users, artworks, similarity_checks
  auth.ts             bcrypt + jose session cookie
  utils.ts            formatting helpers

src/app/              pages and route handlers
src/components/       UI primitives, icons, upload form, verify panel
data/                 kalasecure.db + ipfs-blocks/ (created on first run)
```

---

## Configuration

`.env.local`:

| Variable | Purpose |
| --- | --- |
| `RPC_URL` | Chain endpoint. Defaults to the local Hardhat node. |
| `DEPLOYER_PRIVATE_KEY` | Server-side signer for demo transactions. Written by `npm run deploy`. |
| `REPORTER_PRIVATE_KEY` | Account used to file copy reports. Must differ from the deployer — the contract refuses self-flagging. |
| `AUTH_SECRET` | HMAC key for session cookies. **Change this for any real deployment.** |

### Moving to Polygon

Nothing in the app is Hardhat-specific. To run against a real network:

1. Put the contract JSON-RPC endpoint in `RPC_URL`.
2. Set `DEPLOYER_PRIVATE_KEY` to a funded key.
3. `npx hardhat run scripts/deploy.js --network <name>` (add the network to `hardhat.config.js`).
4. Change `evmVersion` to the chain's supported value.

Polygon rather than Ethereum because minting costs a few paise instead of dollars — the right
trade for a certificate that has to be affordable to register. The app is chain-agnostic; only
`RPC_URL` and the deployed address change.

### Replacing the local IPFS store

`src/lib/ipfs.ts` reads and writes through `put()`, `get()` and `exists()`. Point those at
Pinata, NFT.Storage or an Infura gateway and the rest of the app is unchanged — CIDs are real
and content-addressed either way, because the CID is derived from the file's SHA-256, not from
a local index.

---

## How it works

New to the codebase? Start with **[TEAM-GUIDE.md](./TEAM-GUIDE.md)** — it explains the
pipeline, every hash, what a CID is, and how verification actually works.

## Honest limitations

Worth stating plainly, because a provenance demo that oversells itself is worthless:

- **The chain is a local Hardhat node.** Certificates are real Solidity, but nothing here is on
  a public ledger. Point `RPC_URL` at Polygon to change that.
- **The copy detector is a perceptual fingerprint, not a generative-AI detector.** It reliably
  catches re-derivations of a known work (resized, re-saved, filtered, colour-shifted). It does
  **not** detect a human redrawing a painting from scratch, nor AI-generated work that was never
  registered here. Anyone claiming otherwise without training data and a published model is
  overselling.
- **Images are stored locally**, in a content-addressed directory that behaves like IPFS. The CIDs
  are genuine CIDv0 hashes and will resolve on a real gateway once the bytes are uploaded there.
- **Auth is a signed cookie session**, appropriate for a prototype. There is no email
  verification, password reset, or rate limiting yet.
- **Upload limits are enforced by type and size**, but files should be scanned before any real
  public deployment.
- **The authenticity score is a heuristic**, not a legal determination of authorship. It exists
  to stop obvious copies from being re-registered as originals.

---

## Team

Prachi Dattatray Panchpor · Abhishek Eknath Ghule · Shrushti Nitin Rakh ·
Atharva Manoj Dhile · Gauri Shivaji Ghule · Dhawal Vinayak Raut
