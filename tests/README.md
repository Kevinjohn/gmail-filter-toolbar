# Testing Overview

## Existing Suites
- `background.test.js` exercises install events and message routing
- `contentScript.test.js` covers toolbar rendering and DOM integration hooks
- `filter.test.js` validates filter parsing and calendar detection helpers
- `i18nMessages.test.js` asserts locale bundles include required keys
- `options.test.js` drives the options page form behaviour and storage writes
- `toolbar.test.js` verifies toolbar state transitions and messaging

Shared tooling lives in `setup.js`, which currently polyfills `TextEncoder`/`TextDecoder` for the Jest environment.

## Toolchain Snapshot
- Jest `^29.0.0` with `jest-environment-jsdom` `^30.0.2`
- Playwright Test `^1.42.1`
- ESLint `^8.57.1`
- Prettier `^3.6.1`

All versions align with Chrome Extension MV3 support under Node 18+, so no immediate upgrades are required. Capture review date in planning docs when repeating this audit.

## Baseline Coverage (2025-09-29)
- Statement coverage: 78.39%
- Branch coverage: 53.57%
- Function coverage: 64.70%
- Line coverage: 79.81%

Full HTML output is stored under `../artifacts/coverage/lcov-report/index.html` for visual inspection.

## Known Gaps (to be addressed in upcoming work)
- Chrome extension API mocks are minimal; storage, alarms, and i18n are not stubbed.
- No reusable factories exist for constructing toolbar or options state.
- Integration and end-to-end flows are absent; message passing is only unit-tested in isolation.
- Visual checks, accessibility assertions, and locale regressions rely on manual verification.
- CI lacks automated gates for linting, coverage thresholds, or browser availability.

Track progress against these items as the enhanced testing roadmap lands.
