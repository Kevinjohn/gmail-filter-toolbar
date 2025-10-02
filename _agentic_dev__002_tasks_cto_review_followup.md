# CTO Review Follow-Up Tasks
Generated: 2025-07-04

*Each checklist item matches a single change directive (CD-XXX) from the CTO review.*

---

## Section 1 · Documentation
- [ ] **CD-001** – Add an "Update Strategy" section to `README.md` explaining selector maintenance after the "Project Structure" heading.
- [ ] **CD-002** – In `src/modules/constants.js`, add explanatory comments above each `SELECTORS` property.

## Section 2 · State Module
- [ ] **CD-003** – Rewrite `loadState` to return a `Promise` instead of using a callback.
- [ ] **CD-004** – Rewrite `saveState` to return a `Promise` that resolves after `chrome.storage.sync.set` completes.

## Section 3 · Observers
- [ ] **CD-005** – Create `src/modules/utils/debounce.js` containing the debouncing function with JSDoc.
- [ ] **CD-006** – Replace the local debounce implementation in `src/modules/observers.js` with an import from `./utils/debounce.js`.
- [ ] **CD-007** – Modify `waitForGmailChrome` to reject after 10 seconds if no toolbar is found.
- [ ] **CD-008** – Remove `console.log` statements from `waitForGmailChrome`.
- [ ] **CD-009** – Update `observeToolbar` to store the observer instance and accept an optional `doc` parameter.
- [ ] **CD-010** – Update `observeMessageList` to accept an optional `doc` parameter.

## Section 4 · Toolbar
- [ ] **CD-011** – Define a `MODE_ICONS` constant mapping each mode to its Material icon name in `src/modules/toolbar.js`.
- [ ] **CD-012** – Use `MODE_ICONS` inside `injectToolbar` instead of the switch statement.

## Section 5 · Filtering Logic
- [ ] **CD-013** – Internationalise the favourite star selector in `src/modules/filter.js` using `chrome.i18n.getMessage('alt_starred')`.

## Section 6 · Options Page
- [ ] **CD-014** – Ensure `src/modules/options.js` ends with a single trailing newline.

## Section 7 · Code Style
- [ ] **CD-015** – Run `npm run format` to apply Prettier with single quotes across the codebase.

## Section 8 · Tests
- [ ] **CD-016** – Add a Jest test in `tests/observers.test.js` that verifies `waitForGmailChrome` rejects after the timeout.
- [ ] **CD-017** – Add a Jest test in `tests/filter.test.js` ensuring `applyFilter` handles an empty node list without error.
