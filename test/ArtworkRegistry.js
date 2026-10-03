const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const sha256 = (b) => "0x" + crypto.createHash("sha256").update(b).digest("hex");

describe("KalaSecure ArtworkRegistry", function () {
  let registry, artist, buyer, curator, other;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    // signers[0] is the platform owner/curator and deploys the contract
    curator = signers[0];
    artist = signers[1];
    buyer = signers[2];
    other = signers[4];
    const F = await ethers.getContractFactory("ArtworkRegistry", curator);
    registry = await F.deploy();
    await registry.waitForDeployment();
  });

  const input = (over = {}) => ({
    title: "Monsoon over Konkan",
    description: "Oil on canvas, 24x36in",
    contentHash: sha256("unique-" + Math.random()),
    ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    medium: "Oil on canvas",
    editionSize: 1,
    authenticity: 94,
    ...over,
  });

  it("mints an NFT to the artist and records MINTED provenance", async function () {
    const i = input();
    await registry.connect(artist).registerArtwork(i);
    const a = await registry.getArtwork(1);
    expect(a.title).to.equal(i.title);
    expect(a.artist).to.equal(artist.address);
    expect(a.ipfsCid).to.equal(i.ipfsCid);
    expect(await registry.ownerOf(1)).to.equal(artist.address);

    const prov = await registry.getProvenance(1);
    expect(prov.length).to.equal(1);
    expect(prov[0].action).to.equal("MINTED");
    expect(prov[0].actor).to.equal(artist.address);
  });

  it("returns a real ERC-721 tokenURI with ipfs:// image", async function () {
    await registry.connect(artist).registerArtwork(input());
    const uri = await registry.tokenURI(1);
    expect(uri.startsWith("data:application/json;base64,")).to.equal(true);
    const json = Buffer.from(uri.split(",")[1], "base64").toString();
    expect(json).to.contain("ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");
    expect(json).to.contain("SHA-256 Content Hash");
  });

  it("rejects a duplicate content hash (copy-paste detection)", async function () {
    const i = input();
    await registry.connect(artist).registerArtwork(i);
    await expect(registry.connect(other).registerArtwork(i)).to.be.revertedWithCustomError(
      registry,
      "DuplicateHash",
    );
  });

  it("finds a registered hash via findByContentHash", async function () {
    const i = input();
    await registry.connect(artist).registerArtwork(i);
    const [tokenId, found] = await registry.findByContentHash(i.contentHash);
    expect(found).to.equal(true);
    expect(tokenId).to.equal(1n);
  });

  it("verifyArtwork reports valid + owner + hash", async function () {
    const i = input();
    await registry.connect(artist).registerArtwork(i);
    const [exists, valid, owner, hash, cid] = await registry.verifyArtwork(1);
    expect(exists).to.equal(true);
    expect(valid).to.equal(true);
    expect(owner).to.equal(artist.address);
    expect(hash).to.equal(i.contentHash);
    expect(cid).to.equal(i.ipfsCid);
  });

  it("transfers ownership and appends TRANSFERRED to provenance", async function () {
    await registry.connect(artist).registerArtwork(input());
    await registry.connect(artist).transferArtwork(buyer.address, 1, "Sold at auction");
    expect(await registry.ownerOf(1)).to.equal(buyer.address);
    const prov = await registry.getProvenance(1);
    expect(prov.length).to.equal(2);
    expect(prov[1].action).to.equal("TRANSFERRED");
    expect(prov[1].note).to.equal("Sold at auction");
    // The actor must be the caller — `_safeTransfer` passes address(0) as
    // `auth`, so recording `auth` would leave provenance anonymous.
    expect(prov[1].actor).to.equal(artist.address);
    expect(prov[1].timestamp).to.be.greaterThan(0);
  });

  it("blocks non-owners from transferring", async function () {
    await registry.connect(artist).registerArtwork(input());
    await expect(
      registry.connect(other).transferArtwork(other.address, 1, "stolen"),
    ).to.be.reverted;
  });

  it("supports purchaseArtwork with value and logs SOLD", async function () {
    await registry.connect(artist).registerArtwork(input());
    const price = ethers.parseEther("0.05");
    await registry.connect(artist).purchaseArtwork(buyer.address, 1, { value: price });
    expect(await registry.ownerOf(1)).to.equal(buyer.address);
    const prov = await registry.getProvenance(1);
    expect(prov[1].action).to.equal("SOLD");
  });

  it("flags suspected copies without moving ownership", async function () {
    await registry.connect(artist).registerArtwork(input());
    await registry.connect(other).flagArtwork(1, "Looks like a traced copy");
    const a = await registry.getArtwork(1);
    expect(a.flaggedBy).to.equal(other.address);
    expect(await registry.ownerOf(1)).to.equal(artist.address);
    const [, valid] = await registry.verifyArtwork(1);
    expect(valid).to.equal(false);
  });

  it("only the curator can revoke", async function () {
    await registry.connect(artist).registerArtwork(input());
    await expect(registry.connect(other).revokeArtwork(1, "nope")).to.be.reverted;
    await registry.connect(curator).revokeArtwork(1, "Plagiarism confirmed");
    const a = await registry.getArtwork(1);
    expect(a.revoked).to.equal(true);
  });

  it("blocks transfers of revoked artworks", async function () {
    await registry.connect(artist).registerArtwork(input());
    await registry.connect(curator).revokeArtwork(1, "fake");
    await expect(
      registry.connect(artist).transferArtwork(buyer.address, 1, "sale"),
    ).to.be.revertedWithCustomError(registry, "ArtworkAlreadyRevoked");
  });

  it("records a full multi-step provenance chain", async function () {
    await registry.connect(artist).registerArtwork(input());
    await registry.connect(artist).transferArtwork(buyer.address, 1, "Initial sale");
    await registry.connect(buyer).transferArtwork(other.address, 1, "Resale");
    const prov = await registry.getProvenance(1);
    expect(prov.map((p) => p.action)).to.deep.equal([
      "MINTED",
      "TRANSFERRED",
      "TRANSFERRED",
    ]);
    expect(await registry.totalArtworks()).to.equal(1n);
  });

  it("verifyArtwork on an unknown token returns exists=false", async function () {
    const [exists, valid] = await registry.verifyArtwork(999);
    expect(exists).to.equal(false);
    expect(valid).to.equal(false);
  });
});