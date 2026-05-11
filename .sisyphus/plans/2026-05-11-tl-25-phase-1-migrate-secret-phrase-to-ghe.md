# TL-25 Phase 1 — Migrate Secret Phrase from personal repo to GHE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the full Secret Phrase Next.js app from `github.com/XanderPSON/secret-phrase` (personal, npm + Biome + Vitest) into `coinbase.ghe.com/bootcamp/secret-phrase` at `apps/secret-phrase/` (Yarn 4 + Nx 22 mono-repo), preserving on-chain state exactly, while keeping both Vercel and internal Codeflow/K8s deploys viable.

**Architecture:** The GHE repo is an Nx mono-repo template with `apps/secret-phrase/` already scaffolded (Dockerfile, Helm chart, Argo Rollout, Codeflow CI). We delete the template's stub `app/` and `src/` content, drop the personal repo's `src/` + `public/` + `tests` + `contracts/` + `docs/` into `apps/secret-phrase/`, merge the personal repo's package.json deps into the existing `apps/secret-phrase/package.json` (additive — no overlap), regenerate `yarn.lock`, reconcile config conflicts (Biome over ESLint+Prettier; Vitest over Jest; keep Yarn 4; keep template's tsconfig pattern), preserve the existing template-provided Helm/Codeflow/Terraform/cluster.yml infrastructure untouched, complete the lingering "Secret Stairs" → "Secret Phrase" content rename, and add Vercel-required surface so `vercel.app` can deploy from the Nx subdirectory. Vercel project re-pointing and CODEOWNERS team mapping are documented as manual external asks (separate ticket Phase 2).

**Tech Stack:** Next.js 14.2 App Router, React 18, wagmi + viem + Coinbase Wallet SDK, Tailwind 3, Biome, Vitest, Foundry (Solidity), Yarn 4, Nx 22, TypeScript 5.

**Worktree:** `/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal` (branch `feat/tl-25-migrate-from-personal-repo` off `origin/master`). All work happens here.

**Source-of-truth read sources (READ ONLY — never push):**
- `/Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly` (personal repo worktree on branch `feat/rename-to-secret-phrase`, HEAD `5fe9294`, message `chore: rename project from Secret Stairs to Secret Phrase`). This is **THE** read source for the migration.
- `/Users/xander/src/coinbase/ewx/secret-phrase` (personal repo main checkout, HEAD `e70d34f`) — NOT used as a read source. It's the pre-rename state. Listed only for context.
- Git remote of the personal repo is still `https://github.com/XanderPSON/secret-stairs.git` — that's the personal repo's old name; do not let that confuse the read source. **Do not push to this remote.**

**MAJOR DISCOVERY DURING EXECUTION (recorded for the plan author / future readers):**

The handoff document claimed *"the previous Secret Stairs → Secret Phrase rename PR was already merged"* and that the Secret Phrase code lives on the personal repo's `main`. **This was wrong.** Investigation showed:
- `main` (HEAD `e70d34f`) is the multi-location PR merge — it still contains "Secret Stairs" branding throughout.
- The rename lives ONLY on the unmerged branch `feat/rename-to-secret-phrase` (HEAD `5fe9294`, 19 files / 71 lines changed).
- The rename author (commit `5fe9294`) had already done the right thing: renamed brand strings, Vercel URL, Tailwind tokens (`stairs-*` → `phrase-*`), wagmi appName, contract source for *future* deploys (with explicit doc that already-deployed contracts are immutable). The author's commit message even captured the same on-chain reasoning the original Task 11 was going to encode from scratch.
- `vitest`: 90/90 pass on the rename branch.
- 3 stale `secret-stairs` references remain (intentionally, per author's commit message: "Out of scope: Historical brainstorming/spec docs ... left as historical record"): `docs/superpowers/plans/2026-04-29-admin-dashboard.md` (lines 1215, 1647), `docs/superpowers/specs/2026-04-29-admin-dashboard-design.md` (line 6).

**Net effect on this plan:**
- Task 0 changed: stale worktree was cleaned up out-of-band during plan execution; Task 0 is now historical.
- Tasks 3–6 source from `secret-phrase-rename-readonly`, NOT `secret-phrase`.
- Task 11 collapses massively: rename is already done in source; we just verify zero unexpected references and handle the historical-doc question.

**Linear:** TL-25 — https://linear.app/coinbase/issue/TL-25

---

## Pre-flight Decisions (locked before Task 1)

These were the four contested decisions from TL-25. Recommendations chosen, with rationale:

| Decision | Choice | Why |
|---|---|---|
| Linter/formatter | **Keep Biome** (drop template's ESLint+Prettier *for this app*) | Personal repo's Biome config is mature (66 lines, opinionated rules, organize-imports). The template's ESLint config (`@cbhq/eslint-plugin`) is a workspace-wide convention but Nx allows per-project linting. Switching to ESLint+Prettier would force re-formatting every file and risk introducing diffs unrelated to the migration. Per-app `project.json` will override the workspace `lint` target to run Biome instead. The template's root `.eslintrc.js` stays untouched (it covers `libs/*` and `packages/*`). |
| Package manager | **Yarn 4** (drop personal repo's npm) | Non-negotiable — the entire mono-repo (Dockerfile, Codeflow, Nx executors) assumes Yarn 4 workspaces. `package-lock.json` is deleted, deps merged into `apps/secret-phrase/package.json`, `yarn install` regenerates root `yarn.lock`. |
| Test runner | **Keep Vitest** (drop template's Jest *for this app*) | Personal repo has 13 vitest test files with `@testing-library/react` + jsdom. Porting to Jest would require rewriting setup, mocks, and possibly tests. Vitest is faster and the test suite already passes there. The template's `@cbhq/jest-preset` and root Jest config stay for other apps. Per-project `test` target in `project.json` will run vitest. |
| TypeScript config | **Adopt template pattern** (`tsconfig.base.json` extended by `apps/secret-phrase/tsconfig.json`) | The template's `tsconfig.base.json` enables `strict: true`, `moduleResolution: "Bundler"`, `paths: {}` — all compatible with the personal repo's settings. The personal repo's per-file overrides (`incremental: true`, `noEmit: true`, `plugins: [{ name: "next" }]`) are already present in the template's `apps/secret-phrase/tsconfig.json`. We add `strictNullChecks` and `target: ES2020` overrides if missing. |

**Other locked decisions:**

- **Default branch**: stays `master` for this PR (template ships with `master`; standardizing on `main` is a separate cleanup, per handoff "agreed to standardize on `main` during migration, not before"). Plan does not touch this.
- **`contracts/` location**: keep co-located at `apps/secret-phrase/contracts/` (NOT root). Frontend reads ABI/addresses via relative imports from `src/constants.ts` and `src/lib/locations.ts`; splitting to a separate Foundry workspace at root would force an import-path change and break colocation. TL-25 lists this as an open question; the plan answers it as "keep co-located, defer split to a follow-up if Foundry tooling conflicts arise."
- **Vercel project re-pointing**: documented as a manual ask (requires Vercel ↔ GHE integration via IT). The plan adds the Vercel-needed files (`apps/secret-phrase/vercel.json`) and notes the manual settings, but does not assume access to the Vercel dashboard.
- **CODEOWNERS team**: stays as `@bootcamp/bootcamp-project` for now. Wiring to Tech Learning specifically is documented as a manual ask (need to confirm the GHE team handle exists).

---

## File Structure

After this plan completes, `apps/secret-phrase/` will contain:

```
apps/secret-phrase/
  # === existing template-provided infra (UNTOUCHED unless noted) ===
  Dockerfile                         # template (multi-stage Yarn install + nx build)
  OWNERS                             # template
  package.json                       # MERGED (template deps + personal repo deps)
  project.json                       # MODIFIED (lint→biome, test→vitest)
  next-env.d.ts                      # template
  next.config.js                     # MODIFIED (extendBaseConfig + personal merges)
  tsconfig.json                      # template (already correct)
  cluster.development.yml            # template
  cluster.staging.yml                # template
  cluster.production.yml             # template
  deploy.yml                         # template
  .eslintrc.js                       # MODIFIED (made a no-op stub since we use biome)
  .env.development                   # template (empty file kept for Dockerfile COPY)
  .env.staging                       # template
  .env.production                    # template
  chart/                             # template Helm chart (UNTOUCHED)
  app/                               # MERGED — keep template's api/health/route.ts; replace ClientLayout/layout/page from personal

  # === ported from personal repo (NEW) ===
  app/[location]/                    # ported from src/app/[location]/
  app/admin/                         # ported from src/app/admin/
  app/api/paymaster/                 # ported from src/app/api/paymaster/
  app/api/verify-passphrase/         # ported from src/app/api/verify-passphrase/
  app/global.css                     # ported from src/app/global.css
  app/layout.tsx                     # REPLACED (personal version)
  app/page.tsx                       # REPLACED (personal version, with rename fixes)
  app/ClientLayout.tsx               # REPLACED (becomes Providers — see Task 6)
  middleware.ts                      # ported from src/middleware.ts
  lib/                               # ported from src/lib/
  components/                        # ported from src/components/
  config.ts                          # ported from src/config.ts (URL updated)
  constants.ts                       # ported from src/constants.ts
  wagmi.ts                           # ported from src/wagmi.ts (appName fixed)
  contracts/                         # ported from contracts/ (Foundry workspace)
  docs/                              # ported from docs/ (runbook + superpowers archive)
  public/                            # ported from public/
  scripts/                           # ported from scripts/ (faucet)
  tailwind.config.ts                 # ported, content path adjusted
  postcss.config.js                  # ported as-is
  biome.json                         # ported as-is (per-app)
  vitest.config.ts                   # ported with path adjustment
  vitest.setup.ts                    # ported as-is
  vercel.json                        # NEW — tells Vercel where the Next app lives
  .env.local.example                 # ported as-is
```

Root-level changes:
- `package.json` — no dep changes (template root has its own dev deps; app deps live in `apps/secret-phrase/package.json`)
- `yarn.lock` — REGENERATED (committed)
- `.gitignore` — append worktree dir, foundry artifacts, vercel artifacts
- `.codeflow.yml` — UNTOUCHED (already correct: `branches: [master]`, points at `apps/secret-phrase/Dockerfile`)
- `CODEOWNERS` — UNTOUCHED (Tech Learning re-mapping deferred to manual ask)

**Files explicitly DELETED before porting:**
- `apps/secret-phrase/src/add.ts` and `apps/secret-phrase/src/add.test.ts` (template stub)
- `apps/secret-phrase/app/page.tsx` (template stub — replaced by personal version)
- `apps/secret-phrase/app/layout.tsx` (template stub — replaced)
- `apps/secret-phrase/app/ClientLayout.tsx` (template stub — replaced by `Providers`)
- `apps/secret-phrase/src/` (whole dir — personal repo flattens into `apps/secret-phrase/{lib,components,...}` directly under `apps/secret-phrase/`, NOT under `src/`, because `app/` lives at app root in the template's Next.js convention)

**Important deviation note:** The personal repo nests everything under `src/` (Next can read either `src/app/` or `app/`). The GHE template's stub uses `app/` at the app root with no `src/`. We follow the template — port `personal/src/app/*` → `apps/secret-phrase/app/*`, port `personal/src/{lib,components,...}` → `apps/secret-phrase/{lib,components,...}`. Update all relative imports accordingly (most are `../../lib/...` style and become `../../lib/...` still, but a few that crossed the `src/` boundary need rewriting).

---

## Risk register (read before starting)

1. **`src/lib/locations.ts` is on-chain immutable state.** SF contract `0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` at deployBlock `40598693n` on Base Sepolia. Any change to `LOCATIONS.sf.contractAddress` or `deployBlock` breaks the live frontend. Task 7 verifies these byte-for-byte.
2. **Rename status (REVISED after discovery)**: Rename is already done in the source branch `feat/rename-to-secret-phrase`. Source paths read from this branch will already have "Secret Phrase" branding everywhere except 3 historical-doc references (intentional). Task 11 verifies and handles edge cases only.
3. **`.env.local` is gitignored on disk** at `/Users/xander/src/coinbase/ewx/secret-phrase/.env.local` (and may exist in `secret-phrase-rename-readonly/` if the user has it there too). Do NOT read it, do NOT copy it. Only copy `.env.local.example`.
4. **Dockerfile expects `apps/secret-phrase/.env.development` to exist** (it does `COPY apps/secret-phrase/.env.development apps/secret-phrase/.env`). The template ships an empty file — keep it empty (or with Nx-only vars) so the Docker build doesn't fail.
5. **React version mismatch**: template's app `package.json` declares `react: ^18.3.1`; root devDeps declare `react: ^19.2.4`. We keep app at 18.3.1 (Next 14.2 is on React 18). Yarn workspace resolution should handle this, but verify after install.
6. **Foundry tooling**: `apps/secret-phrase/contracts/foundry.toml` uses local paths. Foundry is not installed in the Nx Docker image. We add `apps/secret-phrase/contracts/` to the workspace as documentation/source-of-truth only — Nx never tries to build it. The `forge` test/deploy workflow stays manual (per personal repo's existing process).
7. **Yarn constraints**: root `package.json` has `@cbhq/yarn-constraints`. After merging deps, `yarn install` may flag inconsistencies (e.g., react version). Task 9 addresses by running `yarn constraints --fix`.

---

## Task 0: Clean up stale leftover worktree + create read-source worktree (DONE OUT-OF-BAND)

This task was completed during plan execution after the rename-status discovery (see Source-of-truth section above). For posterity:

**What happened:**

1. The stale worktree `/Users/xander/src/coinbase/ewx/secret-stairs-feat-rename-to-secret-phrase/` had a broken `.git` pointer (it pointed at `/Users/xander/src/coinbase/ewx/secret-stairs/.git/...` which no longer exists because the personal repo dir was renamed `secret-stairs/` → `secret-phrase/` after the worktree was created).
2. Cleanup commands (executed):
   ```bash
   git -C /Users/xander/src/coinbase/ewx/secret-phrase worktree repair /Users/xander/src/coinbase/ewx/secret-stairs-feat-rename-to-secret-phrase
   git -C /Users/xander/src/coinbase/ewx/secret-phrase worktree remove --force /Users/xander/src/coinbase/ewx/secret-stairs-feat-rename-to-secret-phrase
   ```
3. Then a fresh read-only worktree was created for the rename branch (because main is the wrong source — see discovery note above):
   ```bash
   git -C /Users/xander/src/coinbase/ewx/secret-phrase worktree add /Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly feat/rename-to-secret-phrase
   ```
4. Final state:
   ```
   /Users/xander/src/coinbase/ewx/secret-phrase                  e70d34f [main]
   /Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly  5fe9294 [feat/rename-to-secret-phrase]
   ```

- [ ] **Step 1: Confirm final state matches**

```bash
git -C /Users/xander/src/coinbase/ewx/secret-phrase worktree list
```
Expected: exactly the two lines above. If different, re-run the commands in step 2/3 above.

- [ ] **Step 2: Note for cleanup later**

After Phase 1 PR is merged and we're confident, remind the user to remove the read-only worktree:
```bash
git -C /Users/xander/src/coinbase/ewx/secret-phrase worktree remove /Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly
```
Optionally, also push the rename branch to GHE as historical reference (TBD with user).

(No commit — this only changes the personal repo's local state, never pushed.)

---

## Task 1: Verify worktree baseline & lock decisions

**Files:** none modified

- [ ] **Step 1: Confirm worktree location**

Run:
```bash
git -C /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal rev-parse --abbrev-ref HEAD
```
Expected: `feat/tl-25-migrate-from-personal-repo`

- [ ] **Step 2: Confirm clean working tree**

Run:
```bash
git -C /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal status --porcelain
```
Expected: empty output (only `.sisyphus/plans/2026-05-11-tl-25-phase-1-migrate-secret-phrase-to-ghe.md` if you save the plan first; that's fine).

- [ ] **Step 3: Run baseline `yarn install` to get a known-good starting state**

Run:
```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal && yarn install
```
Expected: Yarn 4.8.1 installs ~745KB of deps, no errors. May take 2–3 min on cold cache. If it fails (e.g., missing `@cbhq/*` registry auth), STOP and ask the user — that's an environment problem not a migration problem.

- [ ] **Step 4: Run baseline `yarn nx run secret-phrase:build` to confirm template builds**

Run:
```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal && yarn nx run secret-phrase:build
```
Expected: PASS. The stub `app/page.tsx`, `app/layout.tsx`, `app/api/health/route.ts` compile to a working Next.js bundle. If it fails, STOP — the template itself is broken and the migration can't validate against a moving target.

- [ ] **Step 5: Commit the plan file**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
git add .sisyphus/plans/2026-05-11-tl-25-phase-1-migrate-secret-phrase-to-ghe.md
git commit -m "docs(tl-25): add migration plan for porting Secret Phrase from personal repo"
```

---

## Task 2: Delete template stub source files

The stub files in `apps/secret-phrase/{app,src}/` are placeholders. Delete them so the port is clean. Keep `app/api/health/route.ts` — it's a useful K8s liveness probe.

**Files:**
- Delete: `apps/secret-phrase/app/page.tsx`
- Delete: `apps/secret-phrase/app/layout.tsx`
- Delete: `apps/secret-phrase/app/ClientLayout.tsx`
- Delete: `apps/secret-phrase/src/add.ts`
- Delete: `apps/secret-phrase/src/add.test.ts`
- Delete: `apps/secret-phrase/src/` (the empty dir afterward)

- [ ] **Step 1: Delete the stub files**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
rm apps/secret-phrase/app/page.tsx
rm apps/secret-phrase/app/layout.tsx
rm apps/secret-phrase/app/ClientLayout.tsx
rm apps/secret-phrase/src/add.ts
rm apps/secret-phrase/src/add.test.ts
rmdir apps/secret-phrase/src
```

- [ ] **Step 2: Confirm `app/api/health/route.ts` still exists**

```bash
ls apps/secret-phrase/app/api/health/route.ts
```
Expected: file listed (we keep this one).

- [ ] **Step 3: Verify build now FAILS** (because there's no `app/page.tsx` or `app/layout.tsx`)

```bash
yarn nx run secret-phrase:build 2>&1 | tail -20
```
Expected: FAIL with a Next.js error about missing `layout.tsx` or no pages. This is the desired "empty slate" state.

- [ ] **Step 4: Commit**

```bash
git add -A apps/secret-phrase/
git commit -m "chore(tl-25): delete template stub app/ and src/ before porting personal repo"
```

---

## Task 3: Port `app/` directory (Next.js routes) from personal repo

Port `personal/src/app/*` → `apps/secret-phrase/app/*`, EXCEPT for `app/api/health/route.ts` which we keep from the template.

**Files:**
- Create: `apps/secret-phrase/app/layout.tsx` (from `secret-phrase-rename-readonly/src/app/layout.tsx`)
- Create: `apps/secret-phrase/app/page.tsx` (from `secret-phrase-rename-readonly/src/app/page.tsx`)
- Create: `apps/secret-phrase/app/global.css` (from `secret-phrase-rename-readonly/src/app/global.css`)
- Create: `apps/secret-phrase/app/[location]/page.tsx` (from `secret-phrase-rename-readonly/src/app/[location]/page.tsx`)
- Create: `apps/secret-phrase/app/[location]/LocationFlow.tsx`
- Create: `apps/secret-phrase/app/[location]/__tests__/metadata.test.ts`
- Create: `apps/secret-phrase/app/admin/layout.tsx`
- Create: `apps/secret-phrase/app/admin/page.tsx`
- Create: `apps/secret-phrase/app/api/paymaster/route.ts`
- Create: `apps/secret-phrase/app/api/verify-passphrase/route.ts`
- Create: `apps/secret-phrase/app/api/verify-passphrase/__tests__/route.test.ts`

- [ ] **Step 1: Copy the entire `src/app/` tree (excluding the personal repo's old structure that will be replaced)**

```bash
SRC=/Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

# Copy all of src/app, but DO NOT overwrite app/api/health/ (template-provided)
cp -R "$SRC/src/app/." "$DST/app/"
```

Expected: After this, `apps/secret-phrase/app/` contains both the personal repo's routes AND the template's `api/health/route.ts`.

- [ ] **Step 2: Verify `app/api/health/route.ts` survived**

```bash
cat apps/secret-phrase/app/api/health/route.ts
```
Expected: 5 lines, exports `GET` returning `{ status: 'ok' }`. If overwritten, restore from git: `git checkout HEAD -- apps/secret-phrase/app/api/health/route.ts`.

- [ ] **Step 3: Verify the layout/page files are now the personal repo versions**

```bash
head -3 apps/secret-phrase/app/layout.tsx
head -3 apps/secret-phrase/app/page.tsx
grep -l "Secret Phrase" apps/secret-phrase/app/page.tsx && echo "BRANDING_OK"
grep -l "Secret Stairs" apps/secret-phrase/app/page.tsx && echo "BRANDING_BUG_PORTED_FROM_WRONG_BRANCH" || echo "NO_STAIRS_OK"
```
Expected: layout.tsx starts with `import type { Metadata } from 'next';`, page.tsx starts with `export default function Page() {`, `BRANDING_OK` printed, `NO_STAIRS_OK` printed. If `BRANDING_BUG_PORTED_FROM_WRONG_BRANCH` is printed, you accidentally sourced from `main` instead of `secret-phrase-rename-readonly` — re-check your `SRC=` and re-run.

- [ ] **Step 4: Commit**

```bash
git add apps/secret-phrase/app/
git commit -m "feat(tl-25): port app/ routes from personal repo's rename branch"
```

---

## Task 4: Port `lib/`, `components/`, `wagmi.ts`, `config.ts`, `constants.ts`, `middleware.ts`

**Files:**
- Create: `apps/secret-phrase/lib/locations.ts` (and `lib/__tests__/locations.test.ts`)
- Create: `apps/secret-phrase/lib/admin/` (whole subdir)
- Create: `apps/secret-phrase/components/` (whole subdir, including `__tests__/` and `admin/`)
- Create: `apps/secret-phrase/wagmi.ts`
- Create: `apps/secret-phrase/config.ts`
- Create: `apps/secret-phrase/constants.ts`
- Create: `apps/secret-phrase/middleware.ts`
- Create: `apps/secret-phrase/__tests__/middleware.test.ts` (was at `personal/src/__tests__/middleware.test.ts`)

- [ ] **Step 1: Copy each top-level file**

```bash
SRC=/Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

cp "$SRC/src/wagmi.ts" "$DST/wagmi.ts"
cp "$SRC/src/config.ts" "$DST/config.ts"
cp "$SRC/src/constants.ts" "$DST/constants.ts"
cp "$SRC/src/middleware.ts" "$DST/middleware.ts"
```

- [ ] **Step 2: Copy `lib/` and `components/` directories**

```bash
cp -R "$SRC/src/lib" "$DST/lib"
cp -R "$SRC/src/components" "$DST/components"
```

- [ ] **Step 3: Copy the lone `__tests__/middleware.test.ts`**

```bash
mkdir -p "$DST/__tests__"
cp "$SRC/src/__tests__/middleware.test.ts" "$DST/__tests__/middleware.test.ts"
```

- [ ] **Step 4: Verify on-chain state preserved EXACTLY**

```bash
diff "$SRC/src/lib/locations.ts" "$DST/lib/locations.ts"
```
Expected: empty output (zero diff). If anything differs, STOP and re-copy. The SF contract address and deployBlock are immutable.

- [ ] **Step 5: Fix relative imports that crossed the `src/` boundary**

The personal repo uses `import { isLocationSlug } from './lib/locations';` from `src/middleware.ts` — that import path is now `./lib/locations` from `apps/secret-phrase/middleware.ts` — same relative path, no change needed because we collapsed `src/` away.

The verify-passphrase route uses `from '../../../lib/locations'` from `personal/src/app/api/verify-passphrase/route.ts`. In the new layout, the route is at `apps/secret-phrase/app/api/verify-passphrase/route.ts` and `lib/locations.ts` is at `apps/secret-phrase/lib/locations.ts`. So the import `'../../../lib/locations'` (3 levels up: api → app → secret-phrase root) is still correct — verify with:

```bash
grep -rn "from '\.\." "$DST/app/" "$DST/lib/" "$DST/components/" "$DST/middleware.ts" "$DST/wagmi.ts" 2>&1 | head -40
```

For each result, mentally trace the path. If any import is broken, fix it now (record the file:line and the corrected path). Common fix: nothing — most imports survive the `src/` removal because relative paths within the moved subtree are preserved.

- [ ] **Step 6: TypeScript sanity check (will fail on missing deps, that's expected)**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
yarn nx run secret-phrase:typecheck 2>&1 | head -50
```
Expected: many "Cannot find module 'wagmi'", "Cannot find module 'viem'", etc. errors — NOT path errors like "Cannot find './lib/locations'". If you see path errors, fix imports before continuing. Module-not-found errors are fine; Task 8 installs them.

- [ ] **Step 7: Commit**

```bash
git add apps/secret-phrase/
git commit -m "feat(tl-25): port lib/, components/, wagmi/config/constants/middleware from personal repo"
```

---

## Task 5: Port `public/`, `contracts/`, `docs/`, `scripts/`

**Files:**
- Create: `apps/secret-phrase/public/favicon.ico`, `public/qr-code.png`, `public/qr-code.svg`
- Create: `apps/secret-phrase/contracts/` (full Foundry workspace)
- Create: `apps/secret-phrase/docs/deploying-a-new-location.md`
- Create: `apps/secret-phrase/docs/superpowers/plans/2026-04-29-admin-dashboard.md`
- Create: `apps/secret-phrase/docs/superpowers/specs/2026-04-29-admin-dashboard-design.md`
- Create: `apps/secret-phrase/scripts/faucet.ts`
- Create: `apps/secret-phrase/scripts/FAUCET.md`

- [ ] **Step 1: `public/` — overwrite the template's stub favicon**

```bash
SRC=/Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

cp -R "$SRC/public/." "$DST/public/"
```

- [ ] **Step 2: `contracts/` — full Foundry workspace INCLUDING `lib/`**

```bash
mkdir -p "$DST/contracts"
cp -R "$SRC/contracts/foundry.toml" "$SRC/contracts/README.md" "$SRC/contracts/script" "$SRC/contracts/src" "$SRC/contracts/test" "$SRC/contracts/lib" "$DST/contracts/"
```

**IMPORTANT:** `contracts/lib/` contains `openzeppelin-contracts/` and `forge-std/` as **vendored source** (NOT git submodules — there is no `.gitmodules` file in the personal repo). `foundry.toml` remaps `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/` so without `lib/`, every `forge build` and `forge test` call FAILS. Vendoring is the existing pattern; preserve it.

Do NOT copy `contracts/out/`, `contracts/cache/`, `contracts/broadcast/` (genuine build artifacts).

- [ ] **Step 2b: Confirm vendored libs are in place**

```bash
ls "$DST/contracts/lib/openzeppelin-contracts/contracts" | head -5   # expected: subdirs like access, governance, ...
ls "$DST/contracts/lib/forge-std/src" | head -5                       # expected: Test.sol, Vm.sol, ...
```

Both should list source files. If empty, the copy failed.

- [ ] **Step 2c: Smoke-test `forge build` if Foundry is installed locally**

```bash
if command -v forge >/dev/null 2>&1; then
  (cd "$DST/contracts" && forge build 2>&1 | tail -5) && echo "FORGE_OK"
else
  echo "Foundry not installed; skipping forge build smoke test (manual verification only)"
fi
```
Expected if Foundry installed: `FORGE_OK`. If Foundry not installed, that's fine — the contracts are documentation-of-source-of-truth in the GHE repo and Nx never builds them. Skip is acceptable. If `forge build` FAILS with import errors, the `lib/` copy is broken — re-run Step 2.

- [ ] **Step 3: `docs/`**

```bash
mkdir -p "$DST/docs"
cp -R "$SRC/docs/." "$DST/docs/"
```

- [ ] **Step 4: `scripts/`**

```bash
mkdir -p "$DST/scripts"
cp -R "$SRC/scripts/." "$DST/scripts/"
```

- [ ] **Step 5: Verify file count expectations**

```bash
find "$DST/public" -type f | wc -l                                       # expected: 3
find "$DST/contracts/src" -type f | wc -l                                # expected: 2 (LocationPass.sol, WelcomeNFT.sol)
find "$DST/contracts/test" -type f | wc -l                               # expected: 1 (LocationPass.t.sol)
find "$DST/contracts/script" -type f | wc -l                             # expected: 1 (DeployLocationPass.s.sol)
[ -d "$DST/contracts/lib/openzeppelin-contracts/contracts" ] && echo "OZ_OK" || echo "OZ_MISSING"
[ -d "$DST/contracts/lib/forge-std/src" ] && echo "FORGE_STD_OK" || echo "FORGE_STD_MISSING"
find "$DST/docs" -type f | wc -l                                         # expected: 3
find "$DST/scripts" -type f | wc -l                                      # expected: 2
```
Expected: `OZ_OK` and `FORGE_STD_OK`.

- [ ] **Step 6: Commit**

```bash
git add apps/secret-phrase/
git commit -m "feat(tl-25): port public/, contracts/, docs/, scripts/ from personal repo"
```

---

## Task 6: Port config files (tailwind, postcss, biome, vitest, env example, next.config.js merge)

**Files:**
- Create: `apps/secret-phrase/tailwind.config.ts`
- Create: `apps/secret-phrase/postcss.config.js`
- Create: `apps/secret-phrase/biome.json`
- Create: `apps/secret-phrase/vitest.config.ts`
- Create: `apps/secret-phrase/vitest.setup.ts`
- Create: `apps/secret-phrase/.env.local.example`
- Modify: `apps/secret-phrase/next.config.js` (merge personal's empty config into template's `extendBaseConfig` form)

- [ ] **Step 1: Copy as-is**

```bash
SRC=/Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

cp "$SRC/tailwind.config.ts" "$DST/tailwind.config.ts"
cp "$SRC/postcss.config.js" "$DST/postcss.config.js"
cp "$SRC/biome.json" "$DST/biome.json"
cp "$SRC/vitest.config.ts" "$DST/vitest.config.ts"
cp "$SRC/vitest.setup.ts" "$DST/vitest.setup.ts"
cp "$SRC/.env.local.example" "$DST/.env.local.example"
```

- [ ] **Step 2: Adjust `tailwind.config.ts` content paths**

Personal repo had `content: ['./src/**/*.{js,ts,jsx,tsx,mdx}']`. New layout has no `src/`. Edit:

```bash
# Use sed with a backup so it works on macOS
sed -i.bak "s|'./src/\*\*/\*.{js,ts,jsx,tsx,mdx}'|'./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'|" "$DST/tailwind.config.ts"
rm "$DST/tailwind.config.ts.bak"
```

Verify with `head -8 "$DST/tailwind.config.ts"`. Expected `content` line:
```ts
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
```

- [ ] **Step 3: Adjust `vitest.config.ts` paths**

The personal `vitest.config.ts` uses `setupFiles: ['./vitest.setup.ts']` and `exclude: ['**/node_modules/**', '.next/**', 'public/**', 'contracts/**']`. These are all relative to the file's directory, so no change is needed — they continue to work from `apps/secret-phrase/vitest.config.ts`.

Verify:
```bash
cat "$DST/vitest.config.ts" | grep -E "(setupFiles|exclude)"
```

- [ ] **Step 4: Replace `next.config.js` with merged version**

The template's version uses `extendBaseConfig` from `@cbhq/next-config`. The personal repo's version is empty (`{}`). Merge: keep `extendBaseConfig` (required for Coinbase mono-repo conventions), keep the `typescript: { ignoreBuildErrors: true }` and `eslint: { ignoreDuringBuilds: true }` overrides (they let the build pass while we wire up Biome). No personal-repo overrides to merge in.

The file already has the right contents from the template — just confirm it wasn't overwritten:

```bash
cat "$DST/next.config.js"
```
Expected: 13 lines starting with `const { extendBaseConfig } = require('@cbhq/next-config');`. If anything else, restore from the template baseline:

```bash
git checkout HEAD~5 -- apps/secret-phrase/next.config.js  # adjust HEAD~N to the commit before any changes
```

- [ ] **Step 5: Add `vercel.json` for Vercel deploy**

Vercel needs to know that the Next app lives at `apps/secret-phrase/` (not at repo root). Create:

```bash
cat > "$DST/vercel.json" <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && yarn install && yarn nx run secret-phrase:build",
  "outputDirectory": ".next",
  "installCommand": "echo skipping (handled by buildCommand)",
  "framework": "nextjs"
}
EOF
```

This tells Vercel: "Run yarn install and the Nx build at the repo root, output is in `.next` of this directory." The Vercel project's "Root Directory" setting (configured via the Vercel dashboard manually — see Task 14) must be set to `apps/secret-phrase`.

- [ ] **Step 6: Stub out the per-app eslint config**

Since this app uses Biome, override the workspace ESLint config with a no-op for this dir to prevent CI from running ESLint here:

```bash
cat > "$DST/.eslintrc.js" <<'EOF'
// Secret Phrase uses Biome (biome.json) for linting and formatting.
// This file disables the workspace-level ESLint config for this app only.
module.exports = {
  root: true,
  ignorePatterns: ['**/*'],
};
EOF
```

- [ ] **Step 7: Commit**

```bash
git add apps/secret-phrase/
git commit -m "feat(tl-25): port tailwind/postcss/biome/vitest configs and add vercel.json"
```

---

## Task 7: Update `apps/secret-phrase/package.json` with merged dependencies

**Files:**
- Modify: `apps/secret-phrase/package.json`

The current `apps/secret-phrase/package.json` has template deps that the app actually doesn't use (`@cbhq/cds-*`, `@cbhq/intl`, `framer-motion`, `react-intl`). Personal repo uses `@coinbase/cdp-sdk`, `@coinbase/wallet-sdk`, `wagmi`, `viem`, `@tanstack/react-query`, `recharts`, plus dev deps for Vitest/Biome/Tailwind/Foundry tooling. Merge: keep template's package metadata (`name`, `version`, `private`), drop unused template deps, add personal deps. Final shape:

- [ ] **Step 1: Replace `apps/secret-phrase/package.json`**

```bash
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

cat > "$DST/package.json" <<'EOF'
{
  "name": "@app/secret-phrase",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "start": "next start",
    "build": "next build",
    "dev": "next dev",
    "check": "biome check --write .",
    "ci:check": "biome ci --formatter-enabled=false --linter-enabled=false",
    "ci:format": "biome ci --linter-enabled=false --organize-imports-enabled=false",
    "ci:lint": "biome ci --formatter-enabled=false --organize-imports-enabled=false",
    "format": "biome format --write .",
    "lint": "biome lint --write .",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "faucet": "node --no-warnings scripts/faucet.ts"
  },
  "dependencies": {
    "@cbhq/next-config": "^4.1.5",
    "@coinbase/cdp-sdk": "^1.48.2",
    "@coinbase/wallet-sdk": "^4.3.7",
    "@tanstack/react-query": "^5.99.2",
    "@wagmi/core": "^2.22.1",
    "next": "^14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.15.4",
    "viem": "^2.48.4",
    "wagmi": "^2.19.5"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.8.0",
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^14.2.0",
    "@types/node": "^20.11.8",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.7",
    "@vitest/coverage-v8": "^3.0.5",
    "@vitest/ui": "^3.0.5",
    "@wagmi/cli": "latest",
    "autoprefixer": "^10.4.19",
    "bufferutil": "^4.0.7",
    "encoding": "^0.1.13",
    "jsdom": "^24.1.0",
    "lokijs": "^1.5.12",
    "pino-pretty": "^10.2.0",
    "postcss": "^8.4.38",
    "supports-color": "^9.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "utf-8-validate": "^6.0.3",
    "vitest": "^3.0.5"
  }
}
EOF
```

Notes on what changed vs each source:
- Kept template's `name: "@app/secret-phrase"`, `next: ^14.2.18` (newer than personal's 14.2.5 — safe).
- Kept template's `@cbhq/next-config` (required by `next.config.js`).
- Dropped template's `@cbhq/cds-*`, `@cbhq/intl`, `framer-motion`, `react-intl` (unused by Secret Phrase code).
- Added all personal repo runtime + dev deps verbatim.

- [ ] **Step 2: Commit**

```bash
git add apps/secret-phrase/package.json
git commit -m "feat(tl-25): merge personal repo deps into apps/secret-phrase/package.json"
```

---

## Task 8: Update `apps/secret-phrase/project.json` (Nx targets)

The Nx executors `@cbhq/mono-tasks:build-next` etc. use ESLint/Jest. Override `lint` and `test` to use Biome and Vitest. Keep `build`, `start`, `format`, `typecheck` as-is.

**Files:**
- Modify: `apps/secret-phrase/project.json`

- [ ] **Step 1: Replace `project.json`**

```bash
DST=/Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase

cat > "$DST/project.json" <<'EOF'
{
  "name": "secret-phrase",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/secret-phrase",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@cbhq/mono-tasks:build-next"
    },
    "start": {
      "executor": "@cbhq/mono-tasks:start-next"
    },
    "extract": {
      "executor": "@cbhq/mono-tasks:extract-messages"
    },
    "format": {
      "executor": "nx:run-commands",
      "options": {
        "command": "yarn workspace @app/secret-phrase format"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "yarn workspace @app/secret-phrase lint"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "yarn workspace @app/secret-phrase test"
      }
    },
    "typecheck": {
      "executor": "@cbhq/mono-tasks:typecheck"
    },
    "report-disabled-eslint-rules": {
      "executor": "nx:noop"
    }
  }
}
EOF
```

- [ ] **Step 2: Commit**

```bash
git add apps/secret-phrase/project.json
git commit -m "chore(tl-25): override Nx lint/test/format targets to use Biome+Vitest"
```

---

## Task 9: Regenerate `yarn.lock` and run yarn constraints

**Files:**
- Modify: `yarn.lock` (root)

- [ ] **Step 1: Regenerate lockfile**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
yarn install
```
Expected: yarn resolves all the new deps. Will take 3–5 minutes. May print warnings about peer deps — those are fine. If it fails with "Cannot find package X", check that the version specifier is correct in `apps/secret-phrase/package.json` and try again.

- [ ] **Step 2: Run yarn constraints to enforce mono-repo invariants**

```bash
yarn constraints --fix
```
Expected: silently fix any version mismatches between root and apps. If it reports unfixable issues (e.g., react version conflict between app's `^18.3.1` and root's `^19.2.4`), do NOT downgrade root — instead update the constraint via `yarn.config.cjs` to allow the app to pin react 18. Document the change.

- [ ] **Step 3: Re-run install if constraints made changes**

```bash
yarn install
```

- [ ] **Step 4: Commit**

```bash
git add yarn.lock package.json yarn.config.cjs apps/secret-phrase/package.json
git commit -m "chore(tl-25): regenerate yarn.lock with merged Secret Phrase deps"
```

---

## Task 10: Run vitest tests and fix import-path breakage

**Files:** various test files in `apps/secret-phrase/`

- [ ] **Step 1: Run tests**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase
yarn test 2>&1 | tee /tmp/secret-phrase-vitest-output.txt
```

- [ ] **Step 2: Categorize failures**

Read `/tmp/secret-phrase-vitest-output.txt`. Bucket each failure into:
- **A**: import-path errors (e.g., `Cannot find module '../../src/lib/locations'`) → fix the path (drop `src/`).
- **B**: missing-mock errors (e.g., `next/headers` mock not loaded) → check `vitest.setup.ts` is being picked up.
- **C**: dep-version errors (e.g., `wagmi` API mismatch) → bump deps if minor; STOP and consult if major.
- **D**: "Secret Stairs" string-assertion failures (e.g., test expects `title === "Secret Stairs"`) → defer to Task 11.

- [ ] **Step 3: Fix bucket A failures**

For each path error, edit the offending test file to drop the `src/` segment from imports.

```bash
# Example pattern — adjust per file:
sed -i.bak "s|from '../../../src/|from '../../../|g" path/to/test.tsx
rm path/to/test.tsx.bak
```

- [ ] **Step 4: Re-run tests**

```bash
yarn test 2>&1 | tail -50
```
Expected: all tests pass EXCEPT the bucket-D string-assertion failures (which Task 11 will fix).

- [ ] **Step 5: Commit (if any test files changed)**

```bash
git add apps/secret-phrase/
git commit -m "fix(tl-25): adjust vitest test import paths after src/ removal"
```

---

## Task 11: Verify "Secret Stairs" → "Secret Phrase" rename completeness (mostly already done in source)

**Status REVISED**: The original Task 11 assumed the rename was incomplete in source. It turned out the source branch `feat/rename-to-secret-phrase` already did a thorough rename. This task is now verification-only with one decision point about historical docs.

**Files (mostly verification, only `docs/` may need touch):**
- Verify: all of `apps/secret-phrase/` for unexpected `Secret Stairs` / `secret-stairs` / `stairs-*` (Tailwind class) references
- Possibly modify: `apps/secret-phrase/docs/superpowers/plans/*.md` and `apps/secret-phrase/docs/superpowers/specs/*.md` (3 references the rename author intentionally left)

- [ ] **Step 1: Comprehensive scan for any remaining "Secret Stairs" / `stairs-*` / `STAIRS` references in ported source**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase
grep -rn -i "secret stairs\|secret-stairs\|secretstairs\|stairs-blue\|stairs-dark\|stairs-glow\|stairs-dim\|SECRET STAIRS\|STAIRS\"\|\"STAIRS\b" \
  --include='*.ts' --include='*.tsx' --include='*.css' --include='*.md' --include='*.json' --include='*.sol' . 2>&1 | tee /tmp/rename-scan.txt
wc -l /tmp/rename-scan.txt
```

Expected (matches the rename branch's known leftover state — author intentionally left these as historical record):

```
docs/superpowers/plans/2026-04-29-admin-dashboard.md:1215:          Secret Stairs
docs/superpowers/plans/2026-04-29-admin-dashboard.md:1647:    downloadCsv(`secret-stairs-${chain.slug}-holders.csv`, rows);
docs/superpowers/specs/2026-04-29-admin-dashboard-design.md:6:**Project:** secret-stairs
```

PLUS expected on-chain `STAIRS` references in `contracts/src/WelcomeNFT.sol` for the **already-deployed SF contract** (these mirror permanent on-chain state and MUST stay):

```
contracts/src/WelcomeNFT.sol:14:  constructor() ERC721("Secret Stairs Welcome Pass", "STAIRS") {}
contracts/src/WelcomeNFT.sol:34:        '{"name":"Secret Stairs #',
contracts/src/WelcomeNFT.sol:36:        '","description":"Found the secret stairs at Coinbase HQ. ...',
contracts/src/WelcomeNFT.sol:89:        '<text ...>SECRET STAIRS</text>',
```

(Wait — actually verify whether the rename branch already updated `WelcomeNFT.sol`. The author's commit message said: *"Contract source (future deploys only; existing on-chain deploys are immutable and unaffected): ERC721 name 'Secret Phrase Welcome Pass', symbol 'PHRASE' / 'PHRASE-<city>', description, SVG label, and rename `_generateStairs()` helper -> `_generateArtwork()` (visual unchanged)."* This suggests the author RENAMED the source even for the deployed-immutable SF contract. Check actual file contents.)

- [ ] **Step 1b: Verify the deployed-vs-source state of WelcomeNFT.sol**

```bash
grep -n "Secret Phrase\|Secret Stairs\|PHRASE\|STAIRS" apps/secret-phrase/contracts/src/WelcomeNFT.sol
```

Two possible outcomes:

**Outcome A**: The rename author renamed `WelcomeNFT.sol` source even though SF is deployed (constructor now says `"Secret Phrase Welcome Pass", "PHRASE"`). This is **a bug from a strict immutability standpoint** because the source file no longer matches what's on-chain. But the rename author may have intentionally chosen forward-consistency: "future redeploys/forks of WelcomeNFT will use the new brand; the old SF deployment has its own permanent record in tx history." If this is the case, document it in the PR description as "source diverges from deployed SF contract by design."

**Outcome B**: The rename author left `WelcomeNFT.sol` alone (it still says `"Secret Stairs Welcome Pass", "STAIRS"`). This matches the original Task 11 advice. Then the only remaining `Secret Stairs` references should be the 3 historical-doc lines above + the WelcomeNFT.sol entries.

Either outcome is OK; record which one is true in the PR description.

- [ ] **Step 1c: Confirm the count is exactly what the rename branch shipped**

```bash
# The 3 historical-doc references are intentional. If the count is HIGHER, something else needs attention.
# If LOWER, the rename author also touched docs (less likely since their commit message excluded docs).
grep -c "secret-stairs\|Secret Stairs\|SECRET STAIRS" /tmp/rename-scan.txt
```

If the count exceeds expected (~3 docs + ~4 WelcomeNFT lines = ~7), STOP and inspect each unexpected match. They likely indicate a port mistake or a previously-missed string that needs human judgment.

- [ ] **Step 2: ASK USER about the 3 historical-doc references**

```
Three references to "Secret Stairs" remain in historical brainstorming/spec docs:
  - docs/superpowers/plans/2026-04-29-admin-dashboard.md:1215  ("Secret Stairs" in prose)
  - docs/superpowers/plans/2026-04-29-admin-dashboard.md:1647  (CSV filename example: secret-stairs-${chain.slug}-holders.csv)
  - docs/superpowers/specs/2026-04-29-admin-dashboard-design.md:6  ("**Project:** secret-stairs")

The rename author intentionally left these as a historical record (per their commit message:
"Out of scope: Historical brainstorming/spec docs in docs/superpowers/ (left as historical record).").

Should we:
  (a) Keep as-is to match the author's intent (recommended — these are historical artifacts of when the project was named Secret Stairs)
  (b) Rename to "Secret Phrase" for cleanliness
  (c) Add a note at the top of each doc saying "This document predates the Secret Stairs → Secret Phrase rename; some references intentionally preserved as historical record"
```

If (a): no edits.
If (b): apply targeted seds (see Step 3 if chosen).
If (c): prepend a note block to each file (see Step 4 if chosen).

- [ ] **Step 3 (if user chose (b))**: Rename in historical docs

```bash
sed -i.bak 's/Secret Stairs/Secret Phrase/g; s/secret-stairs/secret-phrase/g' \
  apps/secret-phrase/docs/superpowers/plans/2026-04-29-admin-dashboard.md \
  apps/secret-phrase/docs/superpowers/specs/2026-04-29-admin-dashboard-design.md
rm apps/secret-phrase/docs/superpowers/plans/2026-04-29-admin-dashboard.md.bak
rm apps/secret-phrase/docs/superpowers/specs/2026-04-29-admin-dashboard-design.md.bak
```

- [ ] **Step 4 (if user chose (c))**: Prepend historical-record note to each doc

```bash
NOTE='> **Historical note:** This document predates the Secret Stairs → Secret Phrase rename (commit `5fe9294`, May 2026). Some references to "Secret Stairs" are intentionally preserved as a record of the project'"'"'s naming history.\n\n'
for f in apps/secret-phrase/docs/superpowers/plans/2026-04-29-admin-dashboard.md \
         apps/secret-phrase/docs/superpowers/specs/2026-04-29-admin-dashboard-design.md; do
  printf "$NOTE$(cat $f)" > "$f.new" && mv "$f.new" "$f"
done
```

- [ ] **Step 5: Re-run vitest to confirm tests still pass**

```bash
cd apps/secret-phrase
yarn test
```
Expected: all tests pass (90+ tests per the rename branch's own verification line). The rename branch already proved 90/90 pass; we just inherit that.

- [ ] **Step 6: Commit**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
git add apps/secret-phrase/
git commit -m "chore(tl-25): handle historical-doc Secret Stairs references per user choice"
```

(Skip commit if user chose (a) "keep as-is" and no files changed.)

---

## Task 12: Verify Next.js build and dev server work

**Files:** none modified (verification only)

- [ ] **Step 1: Build the app via Nx**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
yarn nx run secret-phrase:build 2>&1 | tee /tmp/secret-phrase-build.txt
```
Expected: PASS, with a `.next/` output dir under `apps/secret-phrase/`. If FAIL, read the error and fix; common issues:
- Missing `next-env.d.ts` reference → already present from template, verify with `ls apps/secret-phrase/next-env.d.ts`
- Tailwind not picking up classes → check `content` paths in `tailwind.config.ts` from Task 6
- `app/global.css` not imported anywhere → verify `app/layout.tsx` imports `./global.css`

- [ ] **Step 2: Start dev server, smoke test routes**

```bash
yarn nx run secret-phrase:start &
SERVER_PID=$!
sleep 10
curl -sf http://localhost:3001/ -o /dev/null && echo "ROOT_OK" || echo "ROOT_FAIL"
curl -sf http://localhost:3001/sf -o /dev/null && echo "SF_OK" || echo "SF_FAIL"
curl -sf http://localhost:3001/nyc -o /dev/null && echo "NYC_OK" || echo "NYC_FAIL"
curl -sf http://localhost:3001/api/health | grep -q "ok" && echo "HEALTH_OK" || echo "HEALTH_FAIL"
curl -sf http://localhost:3001/admin -o /dev/null && echo "ADMIN_OK" || echo "ADMIN_FAIL"
curl -sf http://localhost:3001/notalocation -o /dev/null && echo "404_FAIL_BUG" || echo "404_OK"
kill $SERVER_PID
```
Expected: `ROOT_OK SF_OK NYC_OK HEALTH_OK ADMIN_OK 404_OK`. Note: server runs on 3001 per Dockerfile; dev mode may default to 3000 — adjust the port if needed.

- [ ] **Step 3: Lint pass**

```bash
yarn nx run secret-phrase:lint
```
Expected: PASS (Biome reports only auto-fixed issues; rerunning should be clean).

- [ ] **Step 4: Typecheck pass**

```bash
yarn nx run secret-phrase:typecheck
```
Expected: PASS. If FAIL, the merged tsconfig may need adjustment — the personal repo tolerated some type laxness; the template's `tsconfig.base.json` has `strict: true`. Document any escape hatches added.

- [ ] **Step 5: No commit needed for verification, but if any fixups were applied:**

```bash
git add apps/secret-phrase/
git commit -m "fix(tl-25): build/lint/typecheck fixups after full port"
```

---

## Task 13: Update `.gitignore` for new artifact paths

**Files:**
- Modify: `.gitignore` (root)

- [ ] **Step 1: Append app-specific ignores**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
cat >> .gitignore <<'EOF'

# Secret Phrase
apps/secret-phrase/.env.local
apps/secret-phrase/.next/
apps/secret-phrase/.vercel/
apps/secret-phrase/contracts/out/
apps/secret-phrase/contracts/cache/
apps/secret-phrase/contracts/lib/
apps/secret-phrase/contracts/broadcast/
EOF
```

Note: the template's `.gitignore` already covers `.next`, `node_modules`, `.env.local` etc. globally — the additions above are belt-and-suspenders for the per-app paths in case the global rules don't match (they do, but explicit is fine).

- [ ] **Step 2: Verify nothing untracked is now tracked**

```bash
git status
```
Expected: only the `.gitignore` change.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(tl-25): extend .gitignore for Secret Phrase app artifacts"
```

---

## Task 14: Document manual external asks in PR description

**Files:** none modified in this task — these are documented in the PR body when raised.

The following items are NOT code changes but are required for end-to-end Phase 1 completion. Each one needs a human (user or someone they ping) to act:

- [ ] **A. Vercel project re-pointing**

Vercel's current deploy is from `github.com/XanderPSON/secret-phrase`. To deploy from GHE:
1. Vercel must be integrated with `coinbase.ghe.com` (likely requires IT ticket).
2. Once integrated, edit the Vercel project settings → Git → swap repo to `coinbase/secret-phrase` (GHE).
3. Set "Root Directory" to `apps/secret-phrase`.
4. Set "Framework Preset" to "Next.js".
5. The `vercel.json` we added handles `buildCommand` and `installCommand`.
6. Set production env vars in Vercel UI (mirror what's in `.env.local.example`):
   - `SECRET_OFFICE_PHRASE` (legacy, optional)
   - `PAYMASTER_URL`
   - `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`
   - `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_BASE_RPC_URL`, `NEXT_PUBLIC_ETH_MAINNET_RPC_URL` (optional)

- [ ] **B. CODEOWNERS team mapping**

Current `CODEOWNERS` is `@bootcamp/bootcamp-project`. TL-25 says "Wire CODEOWNERS → Tech Learning team". Confirm the GHE team handle for Tech Learning, then update. If unknown, leave as-is and open a follow-up.

- [ ] **C. Confirm `bootcamp/secret-phrase` GHE org ownership**

TL-25 open question: "Does Tech Learning team own the bootcamp GHE org, or do we need access granted?" — needs confirmation before granting CODEOWNERS authority.

- [ ] **D. Plan to deprecate personal repo**

Per TL-25 Phase 2: archive `github.com/XanderPSON/secret-phrase` with a redirect note. NOT done in this PR — it's a follow-up after Vercel re-pointing succeeds.

These four items get listed in the PR description under "Manual follow-ups required."

---

## Task 15: Final review — run full verification suite

**Files:** none modified

- [ ] **Step 1: All tests, lint, typecheck, build in one pass**

```bash
cd /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal
yarn nx run-many --target=lint --projects=secret-phrase
yarn nx run-many --target=typecheck --projects=secret-phrase
yarn nx run-many --target=test --projects=secret-phrase
yarn nx run-many --target=build --projects=secret-phrase
```
Expected: all four PASS.

- [ ] **Step 2: Verify on-chain immutability one more time**

```bash
diff /Users/xander/src/coinbase/ewx/secret-phrase-rename-readonly/src/lib/locations.ts \
     /Users/xander/src/coinbase/ewx/secret-phrase-ghe-feat-tl-25-migrate-from-personal/apps/secret-phrase/lib/locations.ts
```
Expected: ZERO diff. The SF contract address `0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` and deployBlock `40598693n` MUST be byte-identical.

- [ ] **Step 3: Verify the Docker build succeeds locally** (sanity check that K8s deploy will work)

```bash
docker build -f apps/secret-phrase/Dockerfile -t secret-phrase:tl-25-test .
```
Expected: PASS. May take 5–10 min on first build. If it fails on `yarn --immutable`, the `yarn.lock` is out of sync — re-run `yarn install` and commit.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/tl-25-migrate-from-personal-repo
gh pr create --title "feat(tl-25): migrate Secret Phrase from personal repo to GHE" --body-file <(cat <<'EOF'
## Summary

Phase 1 of TL-25. Ports the full Secret Phrase Next.js app from `github.com/XanderPSON/secret-phrase` (personal, npm + Biome + Vitest) into this GHE repo at `apps/secret-phrase/`, while preserving all on-chain state (SF contract `0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` / deployBlock `40598693n`) byte-for-byte.

## Decisions

- Linter/formatter: kept Biome (per-app override of workspace ESLint)
- Test runner: kept Vitest (per-app override of workspace Jest)
- Package manager: switched from npm → Yarn 4 (workspace-required)
- TS config: adopted template's `tsconfig.base.json` extension pattern
- `contracts/`: stays co-located at `apps/secret-phrase/contracts/`
- Default branch: kept `master` (cleanup to `main` deferred)

## Verification

- [x] `yarn nx run secret-phrase:lint` passes
- [x] `yarn nx run secret-phrase:typecheck` passes
- [x] `yarn nx run secret-phrase:test` passes
- [x] `yarn nx run secret-phrase:build` passes
- [x] Local `docker build` of the app succeeds
- [x] On-chain LOCATIONS registry byte-identical to personal repo

## Manual follow-ups required (NOT in this PR)

- [ ] Vercel project re-pointing from `github.com/XanderPSON/secret-phrase` to GHE (requires IT ↔ Vercel integration)
- [ ] Set production env vars in Vercel UI per `apps/secret-phrase/.env.local.example`
- [ ] CODEOWNERS update from `@bootcamp/bootcamp-project` → Tech Learning team handle (need to confirm handle exists)
- [ ] Confirm Tech Learning ownership of `bootcamp` GHE org
- [ ] Phase 2 (separate PR): archive `github.com/XanderPSON/secret-phrase`

Closes nothing yet — TL-25 stays open for the manual follow-ups, which become Phase 2.
EOF
)
```

- [ ] **Step 5: Comment on TL-25 with PR link**

```bash
# Use the linear MCP
# linear_save_comment(issueId="TL-25", body="Phase 1 PR up: <pr-url>")
```

---

## Spec coverage checklist (self-review)

- [x] Port `src/` → confirmed Tasks 3, 4
- [x] Port `contracts/`, `public/`, `tailwind.config.ts`, `biome.json`, `next.config.js`, `tsconfig.json`, `vitest.config.ts` → Tasks 5, 6
- [x] Port `docs/`, `.env.local.example` → Tasks 5, 6
- [x] Reconcile Biome vs ESLint → Task 6 (per-app `.eslintrc.js` stub) + Task 8 (project.json override)
- [x] Reconcile npm vs Yarn 4 → Tasks 7, 9
- [x] Reconcile tsconfig structure → Task 6 (template version preserved, personal merged into it)
- [x] Reconcile vitest vs Jest → Task 6 + Task 8
- [x] Add Vercel-required files → Task 6 (vercel.json)
- [x] Wire CODEOWNERS → deferred to Task 14 manual ask (needs team handle confirmation)
- [x] Verify both deploys work → Task 12 (build) + Task 15 (Docker) for K8s side; Vercel side requires Task 14 manual setup
- [x] Open questions about contracts/ location → answered in Pre-flight Decisions: keep co-located
- [x] Open questions about Vercel ↔ GHE → documented in Task 14
- [x] On-chain state preservation → Tasks 4 (initial), 7 (post-port verify), 15 (final verify)

## Placeholder scan

(none — every step has explicit code or commands)

## Type-consistency check

(no new types introduced; all ports are 1:1 file copies)
