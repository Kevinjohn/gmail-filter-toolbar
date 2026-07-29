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
    // Raised when the mode write path moved to modules/mode.js — what is left here is wiring,
    // which the contentScript suite covers well. Do not lower these to admit new untested logic;
    // that is the signal it belongs in a module of its own.
    './src/contentScript.js': {
      statements: 88,
      branches: 90,
      functions: 70,
      lines: 90,
    },
    // WHY: mode.js owns the optimistic-update/rollback/write-queue invariants — the branches most
    // likely to be quietly broken and least likely to be noticed. Pin it at full coverage.
    './src/modules/mode.js': {
      statements: 100,
      branches: 100,
      functions: 85,
      lines: 100,
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
