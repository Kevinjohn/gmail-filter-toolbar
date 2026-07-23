# Testing Playbook

This playbook documents how we exercise the extension across unit, integration, and end-to-end layers, plus the tooling that keeps localisation and accessibility regressions in check. Pair it with `README.md#Testing` when you need quick command references.

## Test Pyramid

### Unit (Jest)

- Command: `pnpm run test:unit`
- Location: `tests/` root (`*.test.js`) leveraging `tests/setup.js` for chrome/i18n mocks.
- Focus: Pure functions, background message handlers, toolbar state reducers.
- Tips: Use `--runTestsByPath tests/<file>` to target a specific spec during debugging.

### Integration (Jest + JSDOM)

- Lives alongside unit specs but mounts DOM fragments (see `tests/integration/`).
- Validates chrome message passing, storage sync behaviour, and toolbar rendering.
- Snapshot suites guard the options UI serialisation; update snapshots only when copy or localisation changes intentionally.

### End-to-End (Playwright)

- Command: `pnpm run e2e`
- CI flavour: `pnpm run test:e2e:ci` (list + JUnit reporters).
- Install browsers once per environment: `pnpm exec playwright install`.
- Config: `playwright.config.js` captures screenshots/traces on failure and writes artifacts to `artifacts/playwright/`.
- Fixtures: `tests/e2e/fixtures/extension.js` launches a persistent Chromium profile with the unpacked extension. It defaults to headed mode; CI supplies Xvfb. Set `PLAYWRIGHT_HEADFUL=0` only when using an extension-capable headless Chromium.
- Specs reside under `tests/e2e/` (e.g. `toolbar-persistence.spec.js`, `i18n-options-page.spec.js`). Gmail traffic is replayed from `tests/e2e/fixtures/gmail.html` so the suite runs offline. Use `--project=chromium` or `--grep` to pare down runs locally.
- Content-script V8 coverage is attached within each test’s unique Playwright output directory.

## Performance & Memory Checks

- `pnpm run audit:options` spins up a static preview of `dist/` and runs Lighthouse (performance/accessibility/best-practices) against the options page, storing reports in `artifacts/lighthouse/`.
- Background listeners log task durations with `[perf]` prefixes; Jest monitors warn-level output when work exceeds the 500 ms budget (`tests/background.test.js`).

### Visual & Accessibility Guards

- Toolbar ARIA and keyboard behaviour are covered by Jest and Playwright assertions.
- `pnpm run audit:options` enforces Lighthouse thresholds of 90 performance, 95 accessibility, and
  95 best practices.

### Localisation Safeguards

- Command: `pnpm run lint:locales`
- Ensures every locale includes the English key set and that placeholders/plurals stay aligned.
- Jest also enforces non-empty messages through `tests/i18nMessages.test.js`.

### Environment Validation

- Command: `pnpm run validate:env`
- Fails fast if required browsers or Chrome binaries are missing. Run this first on new machines or CI images.

## Data, Fixtures, and Mocks

- `tests/factories/` centralises reusable builders for toolbar state, filter payloads, and storage snapshots.
- `tests/setup.js` stubs chrome APIs (`alarms`, `storage.sync`, `i18n`) and resets per test to avoid cross-suite leakage.
- Integration specs mount DOM nodes with helpers like `makeMailDocument` and `makeEmailRow` from `tests/factories/index.js` to keep setup terse.
- Playwright specs load the unpacked extension from `dist/chrome/`; run `pnpm run build` before executing e2e locally to guarantee fresh assets.

## Debugging Techniques

- Run Jest in watch mode: `pnpm test -- --watch` updates on file saves.
- Log selective tests with `DEBUG=toolbar pnpm run test:unit -- --runTestsByPath tests/integration/toolbar.integration.test.js` (hooks into custom debug statements).
- Execute a single Playwright spec: `pnpm run e2e -- tests/e2e/toolbar-persistence.spec.js`.
- Capture traces/screenshots: append `--trace=on --headed` to the Playwright command when investigating failures; artifacts land under `artifacts/playwright/`.
- Use Chrome DevTools protocol logs by launching Playwright with `DEBUG=pw:api` if you need granular navigation traces.

## Troubleshooting Checklist

- `pnpm run validate:env` fails: rerun `pnpm exec playwright install` and ensure Chrome/Edge is on the PATH.
- Jest crashes with ESM warnings: clear `node_modules/` (`rm -rf node_modules && pnpm install --frozen-lockfile`) to realign dependencies.
- Playwright tests hang: delete `artifacts/playwright/`, rebuild the extension, and retry with `--trace=on` to inspect stuck steps.
- Locale lint failures: cross-check the key diff printed in the console and update the affected `src/_locales/<locale>/messages.json` file.

Document updates or new troubleshooting discoveries in this playbook so future contributors can stay productive.
