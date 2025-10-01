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
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
