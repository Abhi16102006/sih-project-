# KalaSecure — How It Actually Works

A guide for the team. Read this before the presentation so nobody is guessing.

---

## 1. The one-sentence version

> KalaSecure lets an artist anchor a digital artwork to a blockchain, then lets **anyone**
> — with no account and no wallet — type in a token number and check three independent
> facts: the file is the one that was registered, the registration exists on a public
> ledger nobody can quietly edit, and the work has not since been reported or revoked.

---

## 2. The five parts, and why each one exists

| Part | What it is | Why we need it |
|---|---|---|
| **Solidity contract** `contracts/ArtworkRegistry.sol` | Real ERC-721 token contract, 250+ lines | A shared ledger. Nobody — not us, not a gallery, not a thief — can edit history after the fact. |
| **IPFS-style store** `src/lib/ipfs.ts` | Files saved under a name *derived from their own contents* | The picture itself. The chain cannot hold images (cost), so the file lives elsewhere and the chain holds its fingerprint. |
| **Fingerprint engine** `src/lib/perceptual-hash.ts` | Turns an image into a "shape signature" that survives resizing and re-saving | This is the copy-detection engine. It catches a stolen painting that was screenshotted, cropped and re-compressed. |
| **Web app** `src/app/**` | Next.js 16, 15 pages | The part the judges actually look at. |
| **SQLite** `data/kalasecure.db` | Local database | Holds the *gallery view* — names, bios, search. Not trusted for verification; the chain is. |

**The key architectural idea:** the database is a convenience. The chain is the evidence.
Everything on the verify page is re-read from the blockchain at request time.

---

## 3. Are we using a real blockchain? — honest answer

**The code is real. The network is a local simulation.**

- The contract is genuine Solidity. It compiles, deploys, and is covered by **13 passing
  tests** (`npm test`) covering minting, transfer, self-flag rejection, revocation, and
  duplicate-hash rejection.
- It runs on **Hardhat node**, a private blockchain on your own laptop
  (`http://127.0.0.1:8545`, chain ID `31337`).
- Chain ID `31337` and the `127.0.0.1` address mean: **nothing here is on the public
  internet.** If you switch off the laptop, the chain is gone.

**Why we did it this way:** you need the judges to see it work live, on a projector, with
no wallet popups, no testnet funds, no waiting, and no risk of a rate limit during your
slot. A Hardhat node is instant, free, and cannot fail.

**How to go public (one line of config):** deploy the *same, unmodified* contract to
Polygon Amoy testnet, then change `.env.local`:
```
RPC_URL=https://rpc-amoy.polygon.technology
CONTRACT_ADDRESS=<the new address>
```
That is genuinely all. No code changes, because the app never hardcodes the network.

**If a judge asks "is this really a blockchain?"** — say:
> "It's a real ERC-721 contract running on a local Hardhat chain. Same bytecode that would
> go on Polygon. I chose local so the demo can't fail on wifi. Here's the test suite that
> proves the contract logic." Then run `npm test`.

---

## 4. What happens when a user registers an artwork — step by step

Open **/upload**, sign in, submit a painting. This is the exact pipeline:

**Step 1 — Read the bytes.** The uploaded file arrives as raw bytes in memory.

**Step 2 — Store it content-addressed (`src/lib/ipfs.ts`).**
Compute `SHA-256` of the file → wrap it as a multihash → base58-encode it → that string is
the **CID**. The file is written to `data/ipfs-blocks/<CID>`.
*Example:* painting #1 → CID `QmdFb7Eno8JdADs396ZXtuDnArxfLjg3S2kZAvSoJJ3zR3`

**Step 3 — Fingerprint it (`src/lib/perceptual-hash.ts`).**
Produce two signatures (explained in §5) and store them.

**Step 4 — Scan against every existing artwork.**
Compute similarity to all of them. Keep the highest.

**Step 5 — Decide.** Against thresholds in §5:
- ≥ 93 → verdict `duplicate`
- ≥ 85 → verdict `likely-copy`
- below → `unique`

**Step 6 — Set the authenticity score (0–100).** This is *derived from the verdict*:
```
duplicate    → score drops hard (floor 5)
likely-copy  → moderate drop (floor 20)
unique       → 100
```
A genuine first-time artwork scores **100**. A stolen copy scores **15**. That number is
what appears on the certificate, and it is stored on-chain.

**Step 7 — Mint on-chain (`ArtworkRegistry.registerArtwork`).**
A transaction is signed and sent. The contract:
- reverts if `contentHash` is already registered → `DuplicateHash` error naming the token
- creates token #N (an ERC-721 NFT)
- writes the artwork struct: title, artist, contentHash, CID, medium, timestamp, score
- writes a provenance event: `{actor, timestamp, "MINTED", "Original work registered"}`

**Step 8 — Save to SQLite** for the gallery, and report the transaction hash back.

The browser shows the certificate with a QR code.

---

## 5. The hashes — this is the part people get confused about

Your system uses **several different identifiers**. They are not interchangeable.

### 5a. `content_hash` — SHA-256. "Are these the exact same bytes?"

```
0xdd9353f724cf2afa132f62c6026f81e408de989b0370ed77086416dee0000176
```
- 64 hex characters = 256 bits. Computed by `src/lib/crypto.ts`.
- **Change one pixel → completely different hash.** It is all-or-nothing.
- Used for *exact* duplicate detection, and for the "has the file been tampered with" check.
- Stored on-chain, so the contract can reject a byte-identical re-upload.

### 5b. `dhash` → `structure` — the dHash. "Does this have the same shapes?"

```
000000000000000000300078007b007f002700070c0f1c0f1c1f1c1f081d081d
```
How it's made (`perceptual-hash.ts`):
1. Shrink the image to **17 × 16** pixels, greyscale, slightly blurred.
2. For each pixel, compare it to the pixel immediately **to its right**.
3. If the left one is brighter, write `1`; if darker, write `0`.
4. 16 rows × 16 comparisons = **256 bits** = 64 hex characters.

Read it as a picture: each hex character is 4 pixels' worth of "brighter/darker than
neighbour". The string above is mostly `0` in the top rows and has a run of `1`s lower
down — that is a painting with a light sky and a dark horizon.

**Why this survives copying:** resizing, JPEG re-compression, blurring, mild brightness
changes all leave the brightness *relationships between neighbours* intact. The SHA-256
would be destroyed by any of them; this is not.

### 5c. `dhash` → `histogram` — the colour signature. "Is the colour in the same places?"

A misleading name — it is **not** a histogram. It is a **4 × 4 grid of average RGB**:

1. Shrink the image to 4 × 4 using a high-quality filter.
2. Take the average red, green, blue of each of the 16 cells.
3. Store as 16 × 3 = **48 bytes = 96 hex characters**.

Because it is *spatially organised*, it remembers that cell (1,1) was dark blue and cell
(4,4) was bright orange. A plain colour histogram would flatten almost every image to the
same distribution and be useless — we measured that and rejected it.

### 5d. The similarity score

```ts
similarity = 0.65 × structure + 0.35 × colour
```
Structure (shapes) counts for more than colour, because cropping and recolouring change
colour a lot but shapes barely.

These weights are **measured, not guessed**. Over a 9-image corpus (36 pairs):
- a true copy scores **97%**
- the most similar *unrelated* pair scores **83%**
- the median unrelated pair scores **67%**

Thresholds sit in that gap:

| Score | Verdict | Meaning |
|---|---|---|
| ≥ 93 | `duplicate` | Almost certainly a re-derivation of a registered work |
| ≥ 85 | `likely-copy` | Probably derived — flagged for human review |
| < 85 | `unique` | No strong match found |

**Honest limit:** this catches *re-derivations of a work we already know*. It will **not**
catch a human who repaints a painting from scratch, or AI art never registered here. The
original PPT proposed TensorFlow; a real forgery model is not something we could honestly
demo, so we built what genuinely works and said so.

### 5e. The other identifiers

| Thing | Example | What it is |
|---|---|---|
| **Token ID** | `1`, `2`, … | The NFT serial number. This is what the QR code encodes. |
| **CID** | `QmdFb7En…` | See §6. |
| **Wallet address** | `0xf39Fd6e5…` | An account on the chain. Each demo artist gets one. |
| **Tx hash** | `0x1eb83e6e…` | The fingerprint of one transaction. Searchable on any block explorer. |
| **Block number** | `8` | Position in the chain. Higher = later. |

---

## 6. What is a CID?

**Content Identifier.** It is a name for a file that is *derived from the file itself*.

Think of it like this: instead of naming a file `final_final_v2.png` and trusting the
label, you name it by what it actually contains. If someone alters one byte, the name
changes completely. The name is the receipt.

**How ours is built** (`src/lib/ipfs.ts`, `cidV0()`):
```
CID = base58( 0x12 0x20  ||  SHA-256(file bytes) )
       └─ "sha2-256, 32 bytes" ─┘
```
This is the real IPFS CIDv0 format — the same one `ipfs.io/QmdFb7En…` would serve.

**Why not just a filename?** Because a filename is a claim. A CID is proof. That is the
whole point of the project.

**Ours is local, not the public IPFS network.** Files are stored in
`data/ipfs-blocks/<CID>`. This is a deliberate trade-off for a demo (no network dependency,
no pinning bill). Swapping to a public gateway needs no code change — the CID is already
correct, so the same identifier would resolve there.

**You can check it yourself:** open the QR, or hit
`http://localhost:3000/api/ipfs/QmdFb7Eno8JdADs396ZXtuDnArxfLjg3S2kZAvSoJJ3zR3` and you
get the original PNG back, with an `x-content-sha256` header.

---

## 7. How verification works — the four checks

Open `/verify/1`. Each check is computed live, reading the chain, never trusting a flag:

| # | Check | What it proves | How it fails |
|---|---|---|---|
| 1 | **Blockchain record** | Token #N really exists | Someone invented the number |
| 2 | **Hash matches certificate** | The on-chain SHA-256 equals the stored file's | The file was swapped after registration |
| 3 | **Not revoked or flagged** | No revocation or flag on record | The work was reported as stolen/forged |
| 4 | **Stored file intact** | Recomputed SHA-256 of the file equals the certificate | The stored copy was corrupted |

All four pass → the badge reads **Verified**. Any one fails → **Not verified**, and that
specific check is highlighted.

These are genuinely **independent**. Flag a work and check 3 fails while 1, 2 and 4 still
pass — which is exactly right: the file is still intact and the registration still exists,
but a human has reported it.

---

## 8. The other flows, briefly

- **Transfer / sale** — `transferArtwork` moves ownership and appends a `TRANSFERRED`
  provenance event naming the sender. The chain keeps the full ownership history.
- **Flag** — anyone reports a work. The contract refuses self-flagging, so a genuine
  third-party reporter is required. Flipping `verified` to false is the visible effect.
- **Revoke** — only the registry owner (us). A nuclear option, logged forever.

---

## 9. Honest limitations — say these before a judge finds them

1. **Local chain.** Real contract, simulated network. See §3.
2. **Fingerprints, not AI forensics.** Catches known-work re-derivations. Cannot detect
   a human forgery or unseen AI art. See §5d.
3. **Content-hash duplicate defence only catches byte-identical files.** Everything
   subtler is caught by the perceptual scan at upload time, *not* by the contract.
4. **Demo auth is simplified.** Passwords are properly bcrypt-hashed, but every artist
   gets a deterministic demo wallet instead of connecting MetaMask. For the real version
   the artist signs with their own key, so the blockchain `artist` field is provably
   theirs.
5. **The legacy PHP app had real vulnerabilities** (SQL injection, plaintext passwords,
   unrestricted upload). The rewrite fixes all of them. Worth mentioning as motivation.

---

## 10. Five questions judges ask, and short answers

**"What stops someone copying the database and faking certificates?"**
Nothing — and that's the point. Deleting the database does not touch the chain. The verify
page reads the blockchain, so a forged database changes nothing. The chain has no delete
button.

**"If someone steals the image, the hash changes — isn't the hash useless?"**
Exactly. So there are *two* defences: the SHA-256 catches byte-identical copies (and is
checked by the contract), and the perceptual fingerprint catches resized, cropped and
re-compressed copies. Different attacks, different tools.

**"Is the image on the blockchain?"**
No, and it shouldn't be — images cost ~20 gas per byte. The chain stores the CID and hash;
the file lives in IPFS. This is standard practice (it is how NFTs work).

**"How is this different from just uploading to Imgur?"**
Imgur gives you a link. We give you a link *plus* a public, timestamped, non-editable
record of who made it, when, its ownership history, and a tamper check that anyone can run
without an account.

**"Can you scale it?"**
The contract is already chain-agnostic. The current bottleneck is the O(n) similarity scan
at upload — with 10,000 works you'd replace that with a precomputed vector index. Worth
saying out loud; it shows you know the limit.

---

## 11. Files worth knowing

```
contracts/ArtworkRegistry.sol    the blockchain logic
src/lib/ipfs.ts                   content addressing, CIDs
src/lib/perceptual-hash.ts        the copy-detection engine
src/lib/crypto.ts                 SHA-256
src/lib/chain.ts                  talking to the blockchain
src/app/api/artworks/route.ts     the upload + mint pipeline
src/app/verify/[id]/page.tsx      the four checks
test/ArtworkRegistry.js           13 contract tests
```
