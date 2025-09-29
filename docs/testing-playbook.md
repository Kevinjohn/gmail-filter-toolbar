# Testing Playbook

This playbook documents how we exercise the extension across unit, integration, and end-to-end layers, plus the tooling that keeps localisation and accessibility regressions in check. Pair it with `README.md#Testing` when you need quick command references.

## Test Pyramid

### Unit (Jest)
- Command: `npm run test:unit`
- Location: `tests/` root (`*.test.js`) leveraging `tests/setup.js` for chrome/i18n mocks.
- Focus: Pure functions, background message handlers, toolbar state reducers.
- Tips: Use `--runTestsByPath tests/<file>` to target a specific spec during debugging.

### Integration (Jest + JSDOM)
- Lives alongside unit specs but mounts DOM fragments (see `tests/integration/`).
- Validates chrome message passing, storage sync behaviour, and toolbar rendering.
- Snapshot suites guard the options UI serialisation; update snapshots only when copy or localisation changes intentionally.

### End-to-End (Playwright)
- Command: `npm run e2e`
- CI flavour: `npm run test:e2e:ci` (list + JUnit reporters).
- Install browsers once per environment: `npx playwright install`.
- Config: `playwright.config.js` captures screenshots/traces on failure and writes artifacts to `artifacts/playwright/`.
- Fixtures: `tests/e2e/fixtures/extension.js` launches a persistent Chromium profile with the unpacked extension; set `PLAYWRIGHT_HEADFUL=1` if you need to debug headfully.
- Specs reside under `tests/e2e/` (e.g. `locale-smoke.spec.js`, `options-toolbar.spec.js`). Gmail traffic is replayed from `tests/e2e/fixtures/gmail.html` so the suite runs offline. Use `--project=chromium` or `--grep` to pare down runs locally.
- Content-script V8 coverage lands in `artifacts/coverage/playwright/` for dead-code analysis.

## Performance & Memory Checks
- `npm run audit:options` spins up a static preview of `dist/` and runs Lighthouse (performance/accessibility/best-practices) against the options page, storing reports in `artifacts/lighthouse/`.
- Background listeners log task durations with `[perf]` prefixes; Jest monitors warn-level output when work exceeds the 500 ms budget (`tests/background.test.js`).

### Visual & Accessibility Guards
- Visual snapshots will land under `tests/visual-baselines/` when added; run with `npm run test:visual` (future).
- Accessibility assertions ride on Playwright via `axe-core` once the spec merges; for now rely on manual Axe scans (`Testing` section in the README).

### Localisation Safeguards
- Command: `npm run lint:locales`
- Ensures every locale includes the English key set and that placeholders/plurals stay aligned.
- Jest also enforces non-empty messages through `tests/i18nMessages.test.js`.

### Environment Validation
- Command: `npm run validate:env`
- Fails fast if required browsers or Chrome binaries are missing. Run this first on new machines or CI images.

## Data, Fixtures, and Mocks
- `tests/factories/` centralises reusable builders for toolbar state, filter payloads, and storage snapshots.
- `tests/setup.js` stubs chrome APIs (`alarms`, `storage.sync`, `i18n`) and resets per test to avoid cross-suite leakage.
- Integration specs mount DOM nodes with helpers like `makeMailDocument` and `makeEmailRow` from `tests/factories/index.js` to keep setup terse.
- Playwright specs load the unpacked extension from `dist/`; run `npm run build` before executing e2e locally to guarantee fresh assets.

## Debugging Techniques
- Run Jest in watch mode: `npm test -- --watch` updates on file saves.
- Log selective tests with `DEBUG=toolbar npm run test:unit -- --runTestsByPath tests/integration/toolbar.integration.test.js` (hooks into custom debug statements).
- Execute a single Playwright spec: `npm run e2e -- tests/e2e/locale-smoke.spec.js`.
- Capture traces/screenshots: append `--trace=on --headed` to the Playwright command when investigating failures; artifacts land under `artifacts/playwright/`.
- Use Chrome DevTools protocol logs by launching Playwright with `DEBUG=pw:api` if you need granular navigation traces.

## Troubleshooting Checklist
- `npm run validate:env` fails: rerun `npx playwright install` and ensure Chrome/Edge is on the PATH.
- Jest crashes with ESM warnings: clear `node_modules/` (`rm -rf node_modules && npm ci`) to realign dependencies.
- Playwright tests hang: delete `artifacts/playwright/`, rebuild the extension, and retry with `--trace=on` to inspect stuck steps.
- Locale lint failures: cross-check the key diff printed in the console and update the affected `src/_locales/<locale>/messages.json` file.

Document updates or new troubleshooting discoveries in this playbook so future contributors can stay productive.
