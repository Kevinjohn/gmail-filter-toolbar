import js from '@eslint/js';
import globals from 'globals';

/** Flat config (ESLint 9). Mirrors the previous .eslintrc.cjs: eslint:recommended, browser +
 * webextension globals for src/, node + jest globals with relaxed rules for tests/. */
export default [
  {
    ignores: [
      'dist/',
      'coverage/',
      'artifacts/',
      'safari-xcode/',
      '.pnpm-store/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.{js,mjs}', '*.config.{js,cjs,mjs}', 'vite*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off', // Allow console.log in tests
      'no-await-in-loop': 'off', // Common in sequential test steps
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^extensionId$' }], // Allow unused _ and extensionId (fixture params)
    },
  },
];
