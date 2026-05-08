const { extendBaseConfig } = require('@cbhq/next-config');

/** @type {import('next').NextConfig} */
const config = extendBaseConfig({
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
});

module.exports = config;
