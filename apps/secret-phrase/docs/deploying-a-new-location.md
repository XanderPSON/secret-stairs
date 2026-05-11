# Deploying a new Secret Phrase location

End-to-end runbook for adding a new city to Secret Phrase (e.g. London,
Tokyo, Singapore). All steps are reversible up to the on-chain deploy.

## 1. Pick the city, design the puzzle

Choose a city and a 12-letter (excluding spaces) acrostic phrase. Pick 12
words whose first letters spell that phrase. The puzzle is intentionally
forgiving: the verifier accepts any word from the same location's pool
sharing the slot's first letter (so "MARKET" and "MANHATTAN HUB" can be
mixed up across A/N/H/T slots, but "APPLE" never validates because it
isn't in the pool).

Tips for picking words:
- Stick to crypto/Coinbase vocabulary (MARKET, NETWORK, ASSET, HASH,
  STAKE, ONCHAIN, etc.) for theme consistency.
- Try to have at least 2 words per shared first-letter so the
  letter-swap rule actually adds forgiveness.

Write a riddle that hints at the city without naming it. The acrostic
should be the answer.

## 2. Add the location to the registry

Edit `src/lib/locations.ts`. Add a new entry to `LOCATIONS`:

```ts
lon: {
  slug: 'lon',
  displayName: 'London',
  cityShort: 'LON',
  acrostic: 'LONDON',          // 6 chars, so 6 words... or pick a longer phrase
  words: [/* 12 words, first letters spell acrostic */],
  riddle: "Across the pond, the OG financial hub now mints onchain...",
  contractAddress: null,        // set after step 5
  deployBlock: 0n,               // set after step 5
  chainSlug: 'base-sepolia',     // or 'base' for mainnet
  passName: 'London Welcome Pass',
},
```

Add `'lon'` to the `LocationSlug` type union and to `LOCATION_SLUGS` if
the latter isn't auto-derived (it currently is — `Object.keys`).

Update `src/middleware.ts` reserved roots if your slug collides with
anything (it almost certainly won't — slugs are 2–4 chars, reserved
roots are full words like `admin`).

Run `npm test` and `npm run build` to verify the registry change passes
type checks and the new route prerenders.

## 3. (Blocked) finalize the NFT image asset

`LocationPass` embeds an SVG on-chain via `tokenURI`. The current SVG is
a placeholder. Replace `_generateSVG` in `contracts/src/LocationPass.sol`
with the final art for your city, OR move to an off-chain image pointer
(IPFS / static CDN) by overriding `tokenURI` to return a JSON whose
`image` field points at a hosted asset.

Decision criteria:
- **On-chain SVG** (current approach): zero hosting, infinite uptime,
  but high deploy gas + restricted to vector art.
- **IPFS-pinned image**: any format/animation, lower deploy gas,
  requires pinning service (Pinata, NFT.Storage).
- **CDN-hosted image**: cheapest, simplest, but you own the uptime.

Confirm with whoever owns the project before deploying.

## 4. Deploy via Foundry

The deploy script reads constructor args from env vars. Run from the
repo root:

```sh
LP_NAME="Secret Phrase London Pass" \
LP_SYMBOL="PHRASE-LON" \
LP_LOCATION_NAME="London" \
LP_PASS_DISPLAY_NAME="LONDON PASS" \
PRIVATE_KEY=0xYOUR_DEPLOYER_KEY \
forge script contracts/script/DeployLocationPass.s.sol:DeployLocationPass \
  --root contracts \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvv
```

The script logs a structured summary at the end:

```
---LocationPass deployed---
name:                Secret Phrase London Pass
symbol:              PHRASE-LON
locationName:        London
passDisplayName:     LONDON PASS
contractAddress:     0xABCD...
deployBlock:         12345678
---
```

Copy `contractAddress` and `deployBlock` from this output.

For mainnet, swap `base_sepolia` → `base_mainnet` and use a deployer key
that has real ETH for gas + verification fees.

## 5. Update the registry with deployed values

Back in `src/lib/locations.ts`:

```ts
lon: {
  // ...
  contractAddress: '0xABCD...',
  deployBlock: 12345678n,
  // ...
},
```

Note the `n` suffix on `deployBlock` (it's a BigInt).

## 6. Smoke-test

```sh
npm run dev
```

- Visit `http://localhost:3000/lon` — should show the riddle, accept the
  passphrase, and present a real mint button (no longer "Coming soon").
- Visit `http://localhost:3000/admin?location=lon` — should show the new
  contract in the header, scan empty event history.
- Visit `http://localhost:3000/admin?location=all` — the `LocationBreakdown`
  widget should now include London at 0 mints.
- Mint a test pass against your dev wallet; verify it appears in the
  admin's RecentMintsFeed and the BaseScan link in the table works.

## 7. Update operational docs

- Add the new contract address to any monitoring dashboards (e.g.
  Datadog, BaseScan watch lists).
- Announce the URL `secret-phrase.vercel.app/<slug>` to whoever runs the
  physical placement of the puzzle in that city.
- Take a screenshot of the success screen with the acrostic reveal —
  great social-share asset.

## Rolling back

If something goes wrong:
- The `LocationPass` contract has no admin functions — there's no
  pause/unpause. To "stop" minting, set `contractAddress: null` in the
  registry and redeploy the frontend; the location switches back to
  "Coming soon" mode without touching the chain.
- To remove a city entirely, delete the entry from `LOCATIONS`, remove
  the slug from `LocationSlug`, and redeploy. Existing NFTs on-chain
  remain (they're immutable) but the route 404s.
