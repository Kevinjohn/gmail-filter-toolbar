# Comprehensive Testing Roadmap

## Scope and Objectives
- Preserve current behaviour while extending test coverage across unit, integration, and end-to-end layers.
- Ensure localisation, accessibility, and cross-browser parity are validated before release.
- Automate quality gates (lint, type safety, tests, coverage) in CI to block regressions.

## Baseline Audit and Tooling
1. Catalogue existing test suites, fixtures, and mocks; document gaps in `tests/README.md`.
2. Verify Jest, Playwright, ESLint, and Prettier versions align with Chrome MV3 support matrix; log required upgrades.
3. Record current coverage via `npm test -- --coverage`; capture HTML report under `artifacts/coverage/`.
4. Add a `scripts/validate-env.js` script to fail fast if required Playwright browsers or Chrome binaries are missing.

## Unit Testing Enhancements (Jest)
1. Expand `tests/setup.js` to mock Chrome extension APIs (alarms, storage.sync, i18n) with per-test overrides.
2. Add factory helpers in `tests/factories/` for toolbar state, filter presets, and options payloads.
3. Cover edge cases: error branches in `background.js`, race conditions in `filter.js`, and toolbar visibility toggles.
4. Introduce snapshot tests for options UI state serialization to detect locale-driven changes.
5. Enforce minimum coverage thresholds (90% lines/statements) inside `jest.config.cjs`.
6. Schedule `npm run test:unit` script alias that runs Jest with `--runInBand` for deterministic CI.

## Integration Testing (DOM + Message Passing)
1. Create `tests/integration/` folder with suites that mount toolbar + content script via JSDOM.
2. Stub Chrome message passing; simulate background/content communication for filter updates.
3. Validate options changes persist to `chrome.storage.sync` and propagate to content script listeners.
4. Add tests ensuring alignment and favourites visibility react to storage changes without reload.
5. Mock failures (storage quota, message timeouts) and assert graceful degradation.

## End-to-End (Playwright)
1. Generate Playwright fixtures that spin up a Chromium profile with the unpacked extension.
2. Write specs for:
   - Options page modifications flowing into Gmail UI (alignment, favourites toggle).
   - Toolbar button interactions (Everything/Attachments/Favourites order, label changes).
   - Theme switching and layout responsiveness across viewport widths.
3. Parameterise specs for LTR/RTL locales and light/dark themes.
4. Capture screenshots on failure and store under `artifacts/playwright/`.
5. Add `npm run test:e2e:ci` with `--reporter=list,junit` for CI consumption.

## Visual Regression Safety Nets
1. Integrate Playwright trace viewer and screenshot diffing (e.g., `@playwright/test` snapshot assertions).
2. Baseline screenshots for toolbar states (alignment variants, favourites hidden) stored in `tests/visual-baselines/`.
3. Document update workflow (`npm run test:visual -- --update-snapshots`) and guard with PR review checklist.

## Performance and Memory Checks
1. Add Lighthouse CLI script targeting the options page to monitor performance/accessibility scores.
2. Instrument background script with simple timing logs; assert no long-running listeners in unit tests.
3. Configure Playwright to collect coverage for content scripts to spot dead code.

## Accessibility Validation
1. Integrate `axe-core` with Playwright to scan options UI and injected toolbar.
2. Add Jest DOM assertions for aria-labels, focus order, and keyboard navigation in content script tests.
3. Include accessibility checklist in PR template; require zero violations before merge.

## Internationalisation Safeguards
1. Extend `i18nMessages.test.js` to assert all locales contain keys for new strings (including alignment/favourites).
2. Automate locale linting: script cross-checks placeholders and plural forms across `src/_locales/**`.
3. Add Playwright smoke tests loading extension under non-English locale to verify label rendering.

## Continuous Integration Workflow
1. Create `.github/workflows/ci.yml` with matrix (node 18/20) running: install, lint, format check, unit, integration, e2e (headed=false), coverage upload.
2. Cache `node_modules` and Playwright browsers between runs to keep CI fast.
3. Publish test reports (coverage, JUnit, Playwright HTML) as workflow artifacts.
4. Fail PR builds if coverage thresholds dip or accessibility tests report violations.

## Developer Ergonomics and Documentation
1. Update `README.md` testing section to describe new commands, required setup, and troubleshooting.
2. Add `docs/testing-playbook.md` detailing test pyramid, data fixtures, and debugging tips.
3. Introduce pre-commit hook (Husky) to run lint + unit tests on staged files.
4. Provide VS Code recommendations (`.vscode/extensions.json`) for Jest and Playwright debugging.

## Maintenance Cadence
1. Schedule quarterly dependency audit; track issues in `_todo/testing-maintenance.md`.
2. Review test flakiness monthly; quarantine unstable specs via `test.skip` with linked issue.
3. Keep `CHANGELOG.md` testing section updated with tooling upgrades.
4. Reassess coverage thresholds annually to avoid complacency.
