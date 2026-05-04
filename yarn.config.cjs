// @ts-check

/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`);
const {
  enforceConsistentNxDependencies,
  enforceConsistentWorkspaceDependencies,
  // eslint-disable-next-line import/no-extraneous-dependencies
} = require('@cbhq/yarn-constraints');

const IGNORED_DEPENDENCIES = new Set([]);

module.exports = defineConfig({
  constraints: async (ctx) => {
    enforceConsistentNxDependencies(ctx);
    enforceConsistentWorkspaceDependencies(ctx, {
      ignoredDependencies: IGNORED_DEPENDENCIES,
    });
  },
});
