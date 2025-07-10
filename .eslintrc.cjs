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
    // Allow unused parameters that start with underscore (common for required but unused parameters)
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
  }
};
