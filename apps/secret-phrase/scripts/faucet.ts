/**
 * Request testnet ETH (or other tokens) on Base Sepolia via the CDP SDK.
 *
 * Prerequisites:
 *   Export CDP_API_KEY_ID and CDP_API_KEY_SECRET (see .env.local.example).
 *
 * Usage:
 *   npm run faucet -- <address>
 *   npm run faucet -- <address> --token usdc
 *   node scripts/faucet.ts <address> --network base-sepolia --token eth
 */

import { CdpClient } from "@coinbase/cdp-sdk";

type Network = "base-sepolia" | "ethereum-sepolia";
type Token = "eth" | "usdc" | "eurc" | "cbbtc";

const VALID_NETWORKS: Network[] = ["base-sepolia", "ethereum-sepolia"];
const VALID_TOKENS: Token[] = ["eth", "usdc", "eurc", "cbbtc"];

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let address: string | undefined;
  let network: Network = "base-sepolia";
  let token: Token = "eth";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--network" && args[i + 1]) {
      const val = args[++i];
      if (!VALID_NETWORKS.includes(val as Network)) {
        console.error(`Error: invalid network "${val}". Must be one of: ${VALID_NETWORKS.join(", ")}`);
        process.exit(1);
      }
      network = val as Network;
    } else if (arg === "--token" && args[i + 1]) {
      const val = args[++i];
      if (!VALID_TOKENS.includes(val as Token)) {
        console.error(`Error: invalid token "${val}". Must be one of: ${VALID_TOKENS.join(", ")}`);
        process.exit(1);
      }
      token = val as Token;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!address && !arg.startsWith("--")) {
      address = arg;
    }
  }

  if (!address) {
    console.error("Error: address is required.\n");
    printUsage();
    process.exit(1);
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    console.error(`Error: "${address}" is not a valid EVM address.\n`);
    process.exit(1);
  }

  return { address: address as `0x${string}`, network, token };
}

function printUsage() {
  console.log(`Usage: npm run faucet -- <address> [options]

Options:
  --network <name>   Target network (default: base-sepolia)
  --token <symbol>   Token to request (default: eth)
                     Supported: eth, usdc, eurc, cbbtc
  --help, -h         Show this help message`);
}

async function main() {
  const { address, network, token } = parseArgs(process.argv);

  console.log(`Requesting ${token.toUpperCase()} on ${network} for ${address}...`);

  const cdp = new CdpClient();

  const faucetResp = await cdp.evm.requestFaucet({
    address,
    network,
    token,
  });

  console.log(`Faucet transaction sent!`);
  console.log(`  tx hash: ${faucetResp.transactionHash}`);
  console.log(`  explorer: https://sepolia.basescan.org/tx/${faucetResp.transactionHash}`);
}

main().catch((err) => {
  console.error("Faucet request failed:", err.message ?? err);
  process.exit(1);
});
