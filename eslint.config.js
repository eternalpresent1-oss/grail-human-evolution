const expoFlatConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: ['node_modules/**', '.expo/**', 'coverage/**', 'dist/**', 'lint.json', 'server/**'],
  },
  ...expoFlatConfig,
  {
    rules: {
      // Module resolution is owned by `tsc --noEmit` (path aliases included).
      // These rules need the native `unrs-resolver` binding, which is not
      // reliably installed on every machine, and only produce false positives.
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/no-duplicates': 'off',
    },
  },
];
