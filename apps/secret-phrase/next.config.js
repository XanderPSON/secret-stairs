// Public-deploy variant of next.config.js.
//
// On the `master` branch this file uses `@cbhq/next-config`'s `extendBaseConfig`
// helper, which is a Coinbase-internal package and not resolvable on Vercel.
// On the `public-deploy` branch we replace it with a plain Next.js config that
// passes the same options through directly.
//
// Keep this file in sync with the master version when merging: the option keys
// (typescript.ignoreBuildErrors, eslint.ignoreDuringBuilds, etc.) should match.

/** @type {import('next').NextConfig} */
const config = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = config;
