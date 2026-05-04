// eslint-disable-next-line import/no-unresolved
const { getEslintParserOptions } = require('@cbhq/eslint-plugin/utils/typescript');

module.exports = {
  root: true,
  plugins: ['@cbhq'],
  extends: [
    'plugin:@cbhq/conventions',
    'plugin:@cbhq/react',
    'plugin:@cbhq/testing',
    'plugin:@cbhq/imports',
  ],
  parserOptions: getEslintParserOptions(),
  reportUnusedDisableDirectives: true,
  overrides: [
    // Node.js
    {
      files: ['**/.*.js', '**/.*.ts', '**/*.config.js', '**/*.config.ts', '**/scripts/**/*'],
      extends: ['plugin:@cbhq/node'],
      rules: {
        'compat/compat': 'off',
      },
    },
    // Docusaurus, Storybook
    {
      files: [
        'apps/*-docs/**/*',
        'apps/*-storybook/**/*',
        'examples/docusaurus/**/*',
        'examples/storybook/**/*',
      ],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
