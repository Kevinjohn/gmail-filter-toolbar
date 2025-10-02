# Filename: /_todo/CTO-Review_human_2025-07-04.md
# [ ] Section 1: Documentation
## [ ] Task 1.1: Add update strategy
### [ ] Sub-task 1.1.1: In `README.md`, insert a new `## Update Strategy` section immediately after the `## Project Structure` heading explaining how to maintain selectors when Gmail changes its DOM.
## [ ] Task 1.2: Annotate selectors
### [ ] Sub-task 1.2.1: In `src/modules/constants.js`, add a comment above each property of the `SELECTORS` object stating the Gmail element or attribute it refers to.

# [ ] Section 2: State Module
## [ ] Task 2.1: Refactor `loadState`
### [ ] Sub-task 2.1.1: Rewrite `loadState` in `src/modules/state.js` so it returns a `Promise` instead of using a callback parameter.
## [ ] Task 2.2: Refactor `saveState`
### [ ] Sub-task 2.2.1: Rewrite `saveState` in `src/modules/state.js` so it returns a `Promise` that resolves when `chrome.storage.sync.set` completes.

# [ ] Section 3: Observers
## [ ] Task 3.1: Extract debounce utility
### [ ] Sub-task 3.1.1: Create `src/modules/utils/debounce.js` containing the debounce function with JSDoc comments.
### [ ] Sub-task 3.1.2: Replace the debounce implementation in `src/modules/observers.js` with an import from `./utils/debounce.js`.
## [ ] Task 3.2: Add timeout to `waitForGmailChrome`
### [ ] Sub-task 3.2.1: Modify `waitForGmailChrome` in `src/modules/observers.js` to reject after 10 seconds if no toolbar is found.
### [ ] Sub-task 3.2.2: Remove the `console.log` statement from `waitForGmailChrome`.
## [ ] Task 3.3: Prevent duplicate observers
### [ ] Sub-task 3.3.1: Store the `MutationObserver` instance created in `observeToolbar` in a module-level variable and disconnect it before creating a new one.
## [ ] Task 3.4: Parameterize document access
### [ ] Sub-task 3.4.1: Update `observeToolbar` in `src/modules/observers.js` to accept an optional `doc` parameter defaulting to `document`.
### [ ] Sub-task 3.4.2: Update `observeMessageList` in `src/modules/observers.js` to accept an optional `doc` parameter defaulting to `document`.

# [ ] Section 4: Toolbar
## [ ] Task 4.1: Use icon mapping
### [ ] Sub-task 4.1.1: In `src/modules/toolbar.js`, define a constant `MODE_ICONS` that maps each filter mode to its Material icon name.
### [ ] Sub-task 4.1.2: Replace the `switch` statement in `injectToolbar` with lookups from `MODE_ICONS`.

# [ ] Section 5: Filtering Logic
## [ ] Task 5.1: Localise favourite selector
### [ ] Sub-task 5.1.1: In `src/modules/filter.js`, replace the hard-coded selector `img[alt="Starred"]` with `img[alt="${chrome.i18n.getMessage('alt_starred')}"]`.

# [ ] Section 6: Options Page
## [ ] Task 6.1: Ensure newline at end of file
### [ ] Sub-task 6.1.1: Add a trailing newline to `src/modules/options.js`.

# [ ] Section 7: Code Style
## [ ] Task 7.1: Apply Prettier
### [ ] Sub-task 7.1.1: Run `npm run format` to enforce single quotes across the codebase.

# [ ] Section 8: Tests
## [ ] Task 8.1: Test toolbar polling timeout
### [ ] Sub-task 8.1.1: Add a Jest test in `tests/observers.test.js` asserting that `waitForGmailChrome` rejects after the timeout period.
## [ ] Task 8.2: Test filtering with no rows
### [ ] Sub-task 8.2.1: Add a Jest test in `tests/filter.test.js` that calls `applyFilter` when no elements match `SELECTORS.emailRow` and expects no exception.
