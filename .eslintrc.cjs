/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true     // <-- add this
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // add project-specific rules here
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-console': 'off', // Allow console.log in tests
        'no-await-in-loop': 'off', // Common in sequential test steps
      },
    },
  ],
};
