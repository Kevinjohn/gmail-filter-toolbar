# Issue 1: Modularisation

This document outlines the plan and execution for refactoring the `contentScript.js` file into smaller, more maintainable modules.

## 1. Plan

- **Goal:** Break down the monolithic `contentScript.js` into separate modules for UI, filtering logic, state management, and DOM observation.
- **Modules to Create:**
  - `src/toolbar.js`: Manages the filter bar's HTML, injection, and button click events.
  - `src/filter.js`: Contains the core logic for applying filters to email rows and identifying row types (`isCalendarRow`, `hasAttachmentRow`).
  - `src/state.js`: Handles all interactions with `chrome.storage.sync` for getting and setting the filter mode and debug status.
  - `src/observers.js`: Manages the `MutationObserver`s that detect changes in the Gmail UI.
- **`contentScript.js` (new role):** Will be refactored to be a simple orchestrator, importing the necessary functions from the new modules and calling them in the correct order.

## 2. Execution

- [x] Create new empty files.
- [x] Read the original `contentScript.js`.
- [x] Move code from `contentScript.js` to `state.js`.
- [x] Move code from `contentScript.js` to `filter.js`.
- [x] Move code from `contentScript.js` to `toolbar.js`.
- [x] Move code from `contentScript.js` to `observers.js`.
- [x] Rewrite `contentScript.js` to import and use the new modules.
- [x] Create `src/constants.js` to hold shared selectors.
- [x] Update `src/filter.js` to export `isCalendarRow` and `hasAttachmentRow`.
- [x] Update `tests/contentScript.test.js` to use direct ES module imports.
- [x] Create `tests/setup.js` for `TextEncoder` polyfill.
- [x] Update `jest.config.cjs` to include `setupFilesAfterEnv`.

## 3. Verification

- [x] **Automated Tests:** All Jest unit tests passed successfully.
- [ ] **Manual Smoke Test:**
    1.  Load unpacked extension.
    2.  Verify all four filter modes work as expected.
    3.  Toggle debug mode – hidden rows tint blue.
    4.  Test keyboard navigation & Esc focus return.
    5.  Force RTL (`dir="rtl"`) in DevTools – toolbar mirrors.