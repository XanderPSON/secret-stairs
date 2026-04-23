# Testnet Faucet CLI

Request testnet ETH (and other tokens) on Base Sepolia from the command line using the Coinbase Developer Platform SDK.

## 1. Get a CDP API Key

1. Go to [portal.cdp.coinbase.com/access/api](https://portal.cdp.coinbase.com/access/api)
2. Create a new API key (or use an existing one)
3. Copy the **API Key ID** and **API Key Secret**

## 2. Set Your Credentials

Add the following to your `~/.zshrc` (or `~/.bashrc`):

```bash
export CDP_API_KEY_ID="your-api-key-id"
export CDP_API_KEY_SECRET="your-api-key-secret"
```

Then reload your shell:

```bash
source ~/.zshrc
```

> You can verify they're set by running `echo $CDP_API_KEY_ID` — it should print your key ID.

## 3. Install Dependencies

From the project root:

```bash
npm install
```

This installs `@coinbase/cdp-sdk` along with everything else.

## 4. Run the Faucet

```bash
npm run faucet -- 0xYOUR_ADDRESS
```

You should see output like:

```
Requesting ETH on base-sepolia for 0xYOUR_ADDRESS...
Faucet transaction sent!
  tx hash: 0xabc123...
  explorer: https://sepolia.basescan.org/tx/0xabc123...
```

Click the explorer link to confirm the transaction landed.

## Options

```
npm run faucet -- <address> [options]

--network <name>   Target network (default: base-sepolia)
--token <symbol>   Token to request (default: eth)
                   Supported: eth, usdc, eurc, cbbtc
--help             Show help
```

### Examples

```bash
# Request ETH (default)
npm run faucet -- 0xBF8106f6c74aCe8d021e9eD4dCE57ae19EE39a94

# Request USDC instead
npm run faucet -- 0xBF8106f6c74aCe8d021e9eD4dCE57ae19EE39a94 --token usdc

# Request ETH on a different network
npm run faucet -- 0xBF8106f6c74aCe8d021e9eD4dCE57ae19EE39a94 --network ethereum-sepolia
```

## Troubleshooting

**"Missing required CDP Secret API Key configuration parameters"**
Your `CDP_API_KEY_ID` and/or `CDP_API_KEY_SECRET` env vars aren't set. Double-check step 2 and make sure you reloaded your shell.

**"is not a valid EVM address"**
The address must be a full 42-character hex address starting with `0x`.

**Node version issues**
This script requires Node.js v22+ (native TypeScript execution). Check with `node --version`.
