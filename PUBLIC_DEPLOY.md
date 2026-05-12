# `public-deploy` branch

This branch exists **only** to deploy `apps/secret-phrase` to Vercel
(`secret-phrase.vercel.app`) from the public GitHub mirror at
`github.com/XanderPSON/secret-phrase`.

`master` (on `coinbase.ghe.com/bootcamp/secret-phrase`) is the source of truth.
This branch is `master` minus everything that requires Coinbase-internal
infrastructure to install or build.

## Why this branch exists

The repo root is a Coinbase Nx monorepo whose `package.json`, `.yarnrc.yml`,
and `yarn.lock` all assume access to `npm-proxy.cbhq.net` and the `@cbhq/*`
package scope. Vercel cannot reach that registry, so a vanilla `yarn install`
at the root fails with 404s on every internal package.

Rather than try to make Vercel speak to the internal registry, this branch
strips the internal toolchain out and rebuilds `yarn.lock` from npmjs.org. The
app itself doesn't actually need any `@cbhq/*` package at runtime — they're all
build-time tooling — so the diff is small and stable.

## What differs from `master`

| File | Change on this branch |
|---|---|
| `.yarnrc.yml` | Removed `npmRegistryServer` and `npmScopes.cbhq` (use default public registry) |
| `package.json` (root) | Removed all `@cbhq/*` devDependencies and Nx packages; removed `mono-env`/`mono-pipeline` scripts |
| `apps/secret-phrase/package.json` | Removed `@cbhq/next-config` dependency |
| `apps/secret-phrase/next.config.js` | Replaced `extendBaseConfig({...})` wrapper with a plain Next.js config object |
| `apps/secret-phrase/project.json` | Replaced `@cbhq/mono-tasks:*` executors with plain `nx:run-commands` shells (Vercel doesn't use this, but keeps `nx run` working locally if needed) |
| `apps/secret-phrase/vercel.json` | `buildCommand` runs `yarn workspace @app/secret-phrase build` directly instead of going through `yarn nx run secret-phrase:build` |
| `yarn.config.cjs` | Replaced `@cbhq/yarn-constraints` constraints with a no-op |
| `yarn.lock` | Regenerated against the public npm registry |

## How to sync changes from `master`

When you ship something on `master` that should also be live on the public site:

```bash
git checkout public-deploy
git fetch origin
git merge origin/master
```

Conflicts will almost always be in the files listed above. **Always resolve
those conflicts in favor of the `public-deploy` version** — i.e. keep this
branch's overrides. The easiest way:

```bash
# After `git merge` shows conflicts, for each file in the table above:
git checkout --ours <file>
git add <file>
```

Then regenerate the lockfile and verify:

```bash
rm yarn.lock
yarn install
yarn workspace @app/secret-phrase build  # must succeed
git add yarn.lock
git commit
```

Push to **the public remote only** (Vercel watches that repo):

```bash
git push public public-deploy:main
```

Note: the public remote's default branch is `main`, so we push
`public-deploy` → `main`. Vercel auto-deploys from `main`.

## Do NOT push this branch to `origin`

`origin` is the Coinbase GHE remote. This branch should never live there — it
would just be confusing scaffolding. Keep it local + on `public` only.

If you ever accidentally push it to `origin`, delete it with:

```bash
git push origin --delete public-deploy
```

## When something on this branch breaks but `master` is fine

99% of the time it'll be one of:

1. A new file on `master` imports a `@cbhq/*` package. → Add the file to the
   table above and replace the import on this branch.
2. A new dep on `master` is also internal-registry-only. → Same fix: drop or
   replace it here.
3. The lockfile drifted. → `rm yarn.lock && yarn install` and recommit.
