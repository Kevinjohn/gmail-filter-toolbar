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

- Jest `^29.0.0` with `jest-environment-jsdom` `^29.7.0`
- Playwright Test `^1.42.1`
- ESLint `^8.57.1`
- Prettier `^3.6.1`

The supported development runtime is Node 20 or newer.

## Coverage gates

Jest enforces 85% global statement, branch, function, and line coverage. High-fanout entry points
should also receive focused regression tests rather than relying only on the aggregate threshold.

Full HTML output is stored under `../artifacts/coverage/lcov-report/index.html` for visual inspection.

## Browser coverage

CI runs Jest, lint, locale validation, Chrome/Firefox builds, Firefox add-on lint, and a Playwright
browser workflow under Xvfb. Safari runtime verification remains manual through Xcode.
