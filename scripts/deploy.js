const hre = require("hardhat");
const { ethers } = hre;
const fs = require("node:fs");
const path = require("node:path");

/**
 * Deploys ArtworkRegistry and writes:
 *   src/lib/contract/deployment.json  -> address + ABI for the Next.js app
 *   src/lib/contract/deployer.json    -> signer details for reference
 *   .env.local                        -> DEPLOYER_PRIVATE_KEY so the API can
 *                                       sign demo transactions server-side
 */
const DEPLOYER_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  // Standard Hardhat dev account #0 — funded on every `hardhat node` and the
  // account `localhost` deployments sign with.
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const factory = await ethers.getContractFactory("ArtworkRegistry");
  const registry = await factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log("ArtworkRegistry deployed at:", address, "(chainId", String(chainId) + ")");

  // Signer objects do not expose the key; pull it from the active network config.
  let deployerKey = "";
  try {
    const accounts = hre.network.config.accounts;
    const first = Array.isArray(accounts) ? accounts[0] : accounts;
    if (typeof first === "string" && /^0x[0-9a-f]{64}$/i.test(first)) {
      deployerKey = first;
    } else if (first && typeof first === "object" && /^0x[0-9a-f]{64}$/i.test(first.privateKey)) {
      deployerKey = first.privateKey;
    }
  } catch {
    deployerKey = "";
  }
  if (!deployerKey) deployerKey = DEPLOYER_KEY;

  const outDir = path.join(process.cwd(), "src", "lib", "contract");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "deployment.json"),
    JSON.stringify(
      {
        contractName: "ArtworkRegistry",
        address,
        chainId: Number(chainId),
        deployer: deployer.address,
        // `formatJson()` is the machine-readable ABI ethers expects; `format()`
        // returns human-readable strings which cannot be used to build a Contract.
        abi: JSON.parse(factory.interface.formatJson()),
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(outDir, "deployer.json"),
    JSON.stringify({ address: deployer.address, privateKey: deployerKey }, null, 2),
  );

  // Keep DEPLOYER_PRIVATE_KEY in sync with .env.local
  const envPath = path.join(process.cwd(), ".env.local");
  if (!deployerKey) {
    console.warn("! Could not read the deployer key — set DEPLOYER_PRIVATE_KEY manually.");
  }
  const key = deployerKey ? `0x${deployerKey.replace(/^0x/, "")}` : "";
  let env = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "RPC_URL=http://127.0.0.1:8545\nAUTH_SECRET=kalasecure-dev-secret-change-me\nDEPLOYER_PRIVATE_KEY=\n";

  env = /^DEPLOYER_PRIVATE_KEY=.*$/m.test(env)
    ? env.replace(/^DEPLOYER_PRIVATE_KEY=.*$/m, `DEPLOYER_PRIVATE_KEY=${key}`)
    : env.trimEnd() + `\nDEPLOYER_PRIVATE_KEY=${key}\n`;

  fs.writeFileSync(envPath, env);
  console.log("Synced DEPLOYER_PRIVATE_KEY into .env.local");

  console.log("Wrote src/lib/contract/deployment.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
