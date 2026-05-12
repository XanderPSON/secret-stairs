# Secret Phrase — Public Exposure & Office Geo-Gate Design

**Status:** Draft, pending user review
**Author:** Xander Peterson (with Sisyphus)
**Date:** 2026-05-12
**Related:** [Linear TL-25](https://linear.app/coinbase/issue/TL-25/migrate-secret-phrase-to-ghe-bootcampsecret-phrase-plan-dual-deploy)

---

## TL;DR

The Secret Phrase bootcamp NFT app needs to be reachable from a phone (scan QR → claim NFT) for **anyone physically present in a Coinbase office** — employees and guests alike. The app already runs publicly on Vercel (`secret-phrase.vercel.app`); this design adds an in-app, lenient "are you in the office?" gate that combines server-side IP allowlisting and client-side GPS, with per-office feature flags and a remote-test bypass token.

No new Coinbase infrastructure is required. The gate ships as a small set of files inside `apps/secret-phrase/` and applies to both the public Vercel deployment and the internal Codeflow/EKS deployment.

---

## Background

### The product
The Secret Phrase puzzle is a Coinbase bootcamp giveaway: visitors scan a QR code on their phone, land on a Next.js web app, solve a puzzle, and claim an NFT. The audience is **anyone physically in a Coinbase office** — both employees and guests (interviewees, partners, event attendees) — with the explicit constraint that they should NOT be able to claim from outside the building.

Originally hosted at `github.com/XanderPSON/secret-phrase` (personal) and deployed to `secret-phrase.vercel.app`, it is in the process of migrating to the Coinbase GHE bootcamp org (`coinbase.ghe.com/bootcamp/secret-phrase`, this repo) so the Tech Learning team can own it long-term. The app code itself has not yet been ported into this repo at the time of writing — what's here is a Next.js scaffold from `frontend/nx-repo-template`.

### What "are you in the office?" actually means

After discussion, the requirement is intentionally **lenient**:

- It's a fun bootcamp NFT, not a high-value asset. Casual deterrent only — no need for airtight enforcement.
- People may be on the office WiFi, on the office guest WiFi, on cellular, or on the corporate VPN. Any of those should work for an on-site user.
- People on the corp VPN from home should NOT pass (that's a "false positive" we accept as a known limitation, since we cannot tell from the network alone whether the VPN client is physically on-site).
- We must be able to test the live, gated experience remotely — i.e., a developer not in any office must have a way to verify the geo-gate flow end-to-end before the bootcamp event.
- Each office's gate must be independently flippable so we can stage a rollout.

### What the app does NOT need

- No SSO. No Coinbase login required. Guests must be able to claim.
- No PII collection (a wallet address is required to receive the NFT, but that's the user's wallet, not Coinbase identity).
- No customer data, no secrets in client code (the app is the same shape as any onchain demo dapp).

---

## Decision: keep Vercel as the public face

The current public URL `secret-phrase.vercel.app` stays. This is the deployment that real users hit. The internal Codeflow/EKS deployment in this repo continues to exist for internal testing and future-proofing, but is **not** the public face today.

### Why

Coinbase's paved road for **demo/sample apps** is Vercel, not the internal EKS+EGW stack:

- Per the [Vercel Domain Management Guide](https://confluence.coinbase-corp.com/spaces/SEC/pages/1937401771/Vercel+Domain+Management+Guide) (InfraSec, 2026-04-23): *"Vercel is only approved for demo apps, sample apps, and documentation websites per the SRR agreement."* A bootcamp NFT giveaway fits this exactly.
- Exposing the internal EKS deployment publicly would require a [`go/spa` InfraSec review](https://confluence.coinbase-corp.com/spaces/SEC/pages/1937401771/Vercel+Domain+Management+Guide), a [`go/routticket` routing review](https://docs.google.com/document/d/1-jw9kKtyEqlGMIColDGgrUAxM2X1Jzp8hnOrWeoMhYc), service-owner public-exposure acknowledgment, and PRs to `infra/entry-gateway` and `infra/cloudflare`. Multi-day to multi-week. Overkill for a fun NFT thing.
- The current `*.cbhq.net` deployment (`secret-phrase-dev.cbhq.net`, `secret-phrase.cbhq.net`) lives in private Route53 zones and is fundamentally unreachable from any non-corp device — it cannot be made public without additional infra work.
- Vercel deployments at Coinbase already run **behind Cloudflare** (mandatory per the Vercel guide), which gives us OFAC enforcement, DDoS, bot mitigation, and CSIRT telemetry "for free" — exactly the controls we'd otherwise have to argue for in a public-EGW review.

### What we're explicitly NOT doing

1. **Not** trying to expose `secret-phrase.cbhq.net` publicly. Its addressing is fundamentally corp-internal.
2. **Not** retiring the internal Codeflow/EKS deploy. Per TL-25, dual-deploy stays — internal lives in this repo for testing/future-use, Vercel handles public.
3. **Not** building a custom proxy, Cloudflare Tunnel, or any new infrastructure. The existing public path is fine.

### Future option (deferred)

If we ever decide to bring public hosting in-house (drop Vercel), the path would be: file a `go/spa` ticket and a `go/routticket`, provision a `*.coinbase.com` subdomain via `infra/cloudflare` + `infra/entry-gateway` + Istio Ingress Gateway, and route public traffic through EGW → IGW → the existing EKS deployment. The geo-gate logic in this design **would not change** — it would continue to work unchanged because it lives in the app code, not at the edge. This is a clean upgrade path if ever needed.

### Open assumption (needs confirmation)

This design assumes an **InfraSec SPA ticket already exists** for the current `secret-phrase.vercel.app` deployment, since TL-25 references it as a running deployment. Per the Vercel guide, all Vercel deployments require an approved SPA. **Action item before relying on Vercel long-term: confirm this SPA exists** (likely filed by Xander Peterson when the Vercel project was created). If it does not exist, file one via `go/spa` before the bootcamp event. This is a gating dependency, not a code change.

---

## Architecture

Three layers, each independent and small:

```
┌────────────────────────────────────────────────────────────────────┐
│ Phone (cellular OR office WiFi OR guest WiFi OR corp VPN)          │
│   ↓ scans QR code                                                  │
└────────────────────────────────────────────────────────────────────┘
                                   ↓
┌────────────────────────────────────────────────────────────────────┐
│ Cloudflare (OFAC, DDoS, bot, WAF, TLS termination)                 │
└────────────────────────────────────────────────────────────────────┘
                                   ↓
┌────────────────────────────────────────────────────────────────────┐
│ Vercel — serves static Next.js app (apps/secret-phrase)            │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Layer 2 — In-app gate (Next.js middleware + client component)  │ │
│ │                                                                │ │
│ │   Server-side IP check (middleware.ts)                         │ │
│ │     ↓                                                          │ │
│ │   Client-side GPS check (React component)                      │ │
│ │     ↓                                                          │ │
│ │   Pass if EITHER signal allows                                 │ │
│ │     ↓                                                          │ │
│ │   Layer 3 — Per-office feature flag + bypass token             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                │
│   Render claim UI (or "not in an office" friendly error)           │
└────────────────────────────────────────────────────────────────────┘
                                   ↓
┌────────────────────────────────────────────────────────────────────┐
│ User's wallet → Base (or relevant chain) — direct, no Vercel proxy │
└────────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Public hosting (no change)

Vercel + Cloudflare. Already exists. Out of scope for code changes.

### Layer 2 — In-app geo gate

The gate is a small set of files inside `apps/secret-phrase/`:

| File | Purpose |
|---|---|
| `apps/secret-phrase/src/geo/offices.json` | Hardcoded office data: name, IP CIDRs, lat/lng/radius, enabled flag |
| `apps/secret-phrase/src/geo/ipAllowlist.ts` | Pure function: `(clientIp, offices) → matchedOffice or null` |
| `apps/secret-phrase/src/geo/distance.ts` | Pure function: `(lat1, lng1, lat2, lng2) → meters` (haversine) |
| `apps/secret-phrase/src/geo/gate.ts` | Combines IP + GPS results; returns `{ allowed, reason, matchedOffice }` |
| `apps/secret-phrase/middleware.ts` | Next.js middleware: extracts client IP, runs IP allowlist, sets a request header for downstream consumers |
| `apps/secret-phrase/app/components/GeoGate.tsx` | Client component: requests GPS, evaluates client-side rule, decides what to render |

**Two signals, OR-combined (lenient):**

1. **Server-side IP allowlist.** Middleware reads the client IP from `cf-connecting-ip` (Cloudflare's canonical header) with `x-forwarded-for` as fallback. Compares against the union of all enabled offices' CIDR ranges in `offices.json`. Sets a header `x-secret-phrase-ip-match: <office-id>` (or `none`) for the page to read.
2. **Client-side GPS.** The `<GeoGate>` component requests `navigator.geolocation.getCurrentPosition()`. If granted, it computes haversine distance to each enabled office; passes if within the office's radius (default 200m).

**Pass condition:** EITHER signal succeeds. This is intentionally permissive — it covers:
- On corp WiFi, GPS denied → IP match passes
- On guest WiFi, GPS denied → IP match passes (guest WiFi public IPs are separately allowlisted)
- On cellular, GPS granted, in the building → GPS match passes
- On corp VPN from home, GPS granted → IP match would pass (false positive; **accepted** per requirements)
- On corp VPN from home, GPS denied → IP match passes (false positive; **accepted**)
- Outside any office, no VPN, GPS granted → both fail; gated out
- Outside any office, no VPN, GPS denied → both fail; gated out

**Failure UI:** Friendly message — "This NFT is only available to visitors at a Coinbase office. Want to come visit? [link]". No exposure of which check(s) failed.

### Layer 3 — Per-office feature flag + remote-test bypass

`offices.json` schema (illustrative; final TypeScript types come in the implementation plan):

```json
{
  "globalGateEnabled": false,
  "offices": {
    "sf-1-front": {
      "displayName": "San Francisco — 1 Front Street",
      "enabled": false,
      "ipCidrs": [
        "4.15.123.185/32"
      ],
      "lat": 37.7896,
      "lng": -122.3972,
      "radiusMeters": 200,
      "ipSourceComment": "From Confluence IP inclusion list, SF WeWork entry"
    },
    "ny-lga-1a": {
      "displayName": "New York — LGA",
      "enabled": false,
      "ipCidrs": [
        "108.176.3.122/29",
        "52.119.94.50/29"
      ],
      "lat": 40.7414,
      "lng": -73.9892,
      "radiusMeters": 200,
      "ipSourceComment": "From Confluence IP inclusion list, LGA-1A entries"
    },
    "_corp-vpn-and-zerotrust": {
      "displayName": "Corporate VPN / Cloudflare Zero Trust (matches anywhere)",
      "enabled": false,
      "ipCidrs": [
        "72.28.98.4/32", "72.28.98.5/32",
        "104.30.164.231/32", "104.30.177.106/32"
      ],
      "lat": null,
      "lng": null,
      "radiusMeters": null,
      "ipSourceComment": "Corp VPN gateway IPs + CF Zero Trust IAD egress; intentionally has no GPS coords"
    }
  }
}
```

**Flag behavior:**
- `globalGateEnabled: false` → gate is bypassed entirely. Anyone reaches the claim flow. **This is the default**, used during all development and pre-launch testing.
- `globalGateEnabled: true` AND `offices[id].enabled: true` for at least one office → that office's IPs and coords are part of the active allowlist.
- An office with `enabled: false` is fully ignored, even if `globalGateEnabled` is true. Lets us launch SF first, NY a week later, etc.
- The `_corp-vpn-and-zerotrust` pseudo-office has `lat/lng/radiusMeters: null` so it's IP-only — there are no "VPN coordinates" to check against.

**Remote test bypass:**
- Environment variable `SECRET_PHRASE_BYPASS_TOKEN` (set in Vercel project settings, separately for production and preview).
- If a request includes `?bypass=<token>` matching the env var, gate is skipped, claim flow proceeds.
- Token is rotatable (just change the env var).
- Server-side check only — token never appears in client code.
- We can share the bypass URL with people who need to do remote acceptance testing of the live, gated production app before the event.

### Office data — sourcing

Source of truth is the Coinbase Confluence ["IP inclusion list" page](https://confluence.coinbase-corp.com/spaces/IT/pages/1034519005/IP+inclusion+list), maintained by Corporate IT. We snapshot the relevant entries into `offices.json` and add a comment at the top of the file:

```jsonc
// IP CIDRs sourced from:
// https://confluence.coinbase-corp.com/spaces/IT/pages/1034519005/IP+inclusion+list
// Last refreshed: <date>
// To refresh: copy the relevant office and corp-VPN entries from that page.
// The Confluence page changes ~quarterly; periodic manual refresh is fine for v0.
```

Lat/lng for each office is hardcoded from public knowledge (Google Maps coordinates for the building entrance). 200m default radius is generous enough to cover the whole building footprint and immediate sidewalk without leaking to the next block.

We do **not** scrape Confluence at build time (fragile) and we do **not** call Coinbase Config Service at runtime (Vercel cannot authenticate to it). Both are deferred until proven necessary.

---

## Failure modes & how they're handled

| Scenario | Behavior | Notes |
|---|---|---|
| Gate disabled (`globalGateEnabled: false`) | All traffic passes | Default state during dev |
| User in SF office, on corp WiFi | IP matches `sf-1-front` → pass | Primary happy path |
| User in SF office, on cellular, granted GPS | IP fails, GPS within radius → pass | Secondary happy path |
| User in SF office, on cellular, denied GPS | IP fails, GPS unavailable → **fail** | Edge case — friendly error tells them to allow location |
| User in SF office, on corp VPN | IP matches corp-VPN entry → pass | Primary VPN-on-site path |
| User at home, on corp VPN | IP matches corp-VPN entry → pass | **Accepted false positive** (lenient by design) |
| User at home, no VPN, GPS denied | Both fail → fail | Correct |
| User at home, no VPN, GPS lying about location | GPS within some office radius → pass | **Accepted false positive** (deliberate technical user evading; lenient by design) |
| User somewhere with `?bypass=TOKEN` matching env | Pass | For remote acceptance testing |
| User behind a proxy/VPN we don't know about | IP fails, GPS depends on browser | Falls back to GPS check |
| Cloudflare strips/rewrites `cf-connecting-ip` | Middleware falls back to `x-forwarded-for`, then `request.ip` | Should never happen — Vercel is behind CF |
| User on an old browser without `navigator.geolocation` | GPS unavailable; only IP check runs | Acceptable; modern phones all support it |

---

## Out of scope

Explicitly **not** part of this design (separate work):

1. **Porting the actual app code** from `github.com/XanderPSON/secret-phrase` into `apps/secret-phrase/`. Tracked in TL-25 Phase 1.
2. **The NFT-claim smart-contract logic.** Lives in the wallet/wagmi/Foundry stack the app already uses; this design only gates page access, not chain calls.
3. **Drop Vercel + serve from internal infra.** Captured as the future option above; would require InfraSec + routing tickets if pursued.
4. **Replacing the in-repo `offices.json` with Coinbase Config Service.** Possible future graduation; not needed for v0.
5. **Per-user rate limiting / abuse prevention.** Cloudflare in front of Vercel handles the usual DDoS/bot baseline. If we see actual claim-flow abuse, we add app-level rate limiting later.
6. **Client-side analytics on gate failures.** Would be useful to know how many people are getting blocked at the bootcamp event — could add later if event size warrants it.

---

## Decision log

- **2026-05-12:** User chose to keep Vercel as public face (Option 1). Internal Codeflow deploy stays for testing. Drop-Vercel option captured as deferred future work.
- **2026-05-12:** Geo logic lives inside `apps/secret-phrase/`, not in a shared `packages/` library. YAGNI — no other consumer.
- **2026-05-12:** Office data sourced as hardcoded JSON manually curated from the Confluence "IP inclusion list" page. Config Service / scraping rejected as over-engineering for v0.
- **2026-05-12:** Two-signal OR-combined gate (IP allowlist OR GPS within radius). Lenient by design — fun bootcamp app, not a high-value asset. Accepted false positives are documented above.
- **2026-05-12:** Per-office `enabled` flag plus `globalGateEnabled` master switch, defaulting to OFF — allows code to merge and ship publicly with the gate inactive, then flip on per office at event time.
- **2026-05-12:** Remote test bypass via `?bypass=<token>` matching `SECRET_PHRASE_BYPASS_TOKEN` env var. Server-side check, rotatable.
- **2026-05-12:** No new Coinbase infra required. No `go/spa`, no `go/routticket`, no `infra/cloudflare` PR, no `infra/entry-gateway` PR.

---

## Open questions / pre-implementation TODOs

These need to be resolved before or during implementation, not now:

1. **SPA ticket confirmation** — does an approved InfraSec SPA exist for `secret-phrase.vercel.app`? If not, file one before the bootcamp event. (Owner: Xander)
2. **Office list scope** — for the initial launch, which offices do we want enabled? SF-only? SF + NY? All offices with current IT presence? (Doesn't block code — the JSON can be built out as needed.)
3. **Remote bypass distribution** — how is the bypass token shared with testers? Slack DM? 1Password vault entry? (Operational decision, not architectural.)
4. **Vercel ↔ Coinbase GHE integration** — TL-25 already flags this as an open question. Vercel currently deploys from the personal `github.com/XanderPSON/secret-phrase`; redirecting it to deploy from `coinbase.ghe.com/bootcamp/secret-phrase` requires the Vercel-GHE integration to exist. This design assumes it will be set up as part of TL-25 Phase 1 and does not depend on the answer.
