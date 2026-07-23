/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {},
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        node: true,
        jest: true,
      },
      rules: {
        'no-console': 'off', // Allow console.log in tests
        'no-await-in-loop': 'off', // Common in sequential test steps
        'no-unused-vars': ['error', { argsIgnorePattern: '^_|^extensionId$' }], // Allow unused _ and extensionId (fixture params)
      },
    },
  ],
};
