/**
 * Starts the local chain and makes sure it is provisioned, in one process.
 *
 * Why this exists: a Hardhat node keeps everything in memory, so a fresh node
 * has an empty registry while the database still lists certificates — every
 * verify page then fails for reasons nobody caused. Running the provisioning
 * from inside the chain launcher (rather than as a third `concurrently`
 * process) keeps `npm run dev` to two long-lived processes, which is the
 * arrangement that behaves reliably.
 *
 * Steps:
 *   1. spawn `hardhat node` and keep it as a child
 *   2. wait for the RPC to answer
 *   3. deploy + seed only if the registry is missing or out of sync
 *   4. stay in the foreground until signalled, then shut the node down cleanly
 */
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const ROOT = path.join(__dirname, "..");
const DEPLOYMENT = path.join(ROOT, "src/lib/contract/deployment.json");

const log = (...a) => console.log("[setup]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let chain = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (chain && !chain.killed) {
    chain.kill("SIGTERM");
    // Give it a moment to flush before the parent goes away.
    setTimeout(() => process.exit(code), 400);
  } else {
    process.exit(code);
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => shutdown(0));
}

async function rpc(method, params = []) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function waitForNode(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    try {
      await rpc("eth_blockNumber");
      return true;
    } catch {
      await sleep(400);
    }
  }
  return false;
}

async function contractHasCode(address) {
  if (!address) return false;
  const code = await rpc("eth_getCode", [address, "latest"]);
  return typeof code === "string" && code.length > 2;
}

async function registryCount(address) {
  const { ethers } = require("ethers");
  const iface = new ethers.Interface(["function totalArtworks() view returns (uint256)"]);
  const provider = new ethers.JsonRpcProvider(RPC);
  const raw = await provider.call({
    to: address,
    data: iface.encodeFunctionData("totalArtworks"),
  });
  return Number(iface.decodeFunctionResult("totalArtworks", raw)[0]);
}

function dbArtworkCount() {
  const Database = require("better-sqlite3");
  const dbPath = path.join(ROOT, "data/kalasecure.db");
  if (!fs.existsSync(dbPath)) return 0;
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare("SELECT COUNT(*) AS n FROM artworks").get().n;
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

function run(args) {
  execFileSync("npm", args, { cwd: ROOT, stdio: "inherit" });
}

(async () => {
  log(`starting the local chain at ${RPC}`);

  chain = spawn(
    "npx",
    ["hardhat", "node", "--hostname", "127.0.0.1", "--port", "8545"],
    { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] },
  );
  chain.on("exit", (code) => {
    if (!shuttingDown) {
      log(`the chain exited unexpectedly (code ${code})`);
      process.exit(code ?? 1);
    }
  });

  if (!(await waitForNode())) {
    log(`the chain never came up at ${RPC}`);
    shutdown(1);
    return;
  }
  log("chain is up");

  try {
    let address = null;
    if (fs.existsSync(DEPLOYMENT)) {
      try {
        address = JSON.parse(fs.readFileSync(DEPLOYMENT, "utf8")).address;
      } catch {
        /* treat a corrupt file as missing */
      }
    }

    let onChain = 0;
    if (await contractHasCode(address)) {
      try {
        onChain = await registryCount(address);
      } catch {
        onChain = 0;
      }
    }

    const inDb = dbArtworkCount();

    if (!onChain) {
      log("no contract on this chain — deploying and seeding.");
      run(["run", "deploy"]);
      run(["run", "seed"]);
    } else if (onChain !== inDb) {
      log(
        `chain holds ${onChain} certificate(s) but the database holds ${inDb} — ` +
          "the chain was restarted, so re-seeding.",
      );
      run(["run", "deploy"]);
      run(["run", "seed"]);
    } else {
      log(`registry already holds ${onChain} certificate(s) — nothing to do.`);
    }
  } catch (e) {
    // Never prevent the chain (and therefore the app) from starting.
    log("automatic setup did not finish:", e.message);
    log("run `npm run setup` by hand if the registry looks empty.");
  }

  log("ready — the web app can start.");
})().catch((e) => {
  log("dev-chain failed:", e.message);
  shutdown(1);
});
