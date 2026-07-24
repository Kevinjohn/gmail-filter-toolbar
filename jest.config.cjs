/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/modules/browser-polyfill.js'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
    },
    './src/contentScript.js': {
      statements: 80,
      branches: 85,
      functions: 55,
      lines: 80,
    },
    // WHY: filter.js is the extension's core classification logic — pin its own floor so it can't
    // silently regress while the global aggregate stays green.
    './src/modules/filter.js': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
};
