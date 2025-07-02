/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/*.test.js'], // or use testPathIgnorePatterns for *.spec.js
  setupFilesAfterEnv: ['./tests/setup.js']
};
