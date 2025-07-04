### PRD 3: User Interaction Simulation Tests (Revised)

**Product Requirement Document: User Interaction Simulation Testing for Toolbar**

**1. Introduction**
This document outlines the *uncompromising requirements* for enhancing the unit tests for user interactions with the filter toolbar. The current testing of `refreshUI` is insufficient. The *critical flow* of user clicks updating the application state and triggering the filtering process *must be thoroughly covered*. These tests *will* simulate user clicks on the toolbar buttons and *verify with absolute certainty* that the application's state (`currentMode`), filtering logic (`applyFilter`), and UI (`aria-pressed` attributes, live region text) are updated correctly. *Failure to meet these standards is unacceptable.*

**2. Goals**
*   **State Integrity:** Ensure that clicking a filter button *precisely* updates the `currentMode` in `state.js`. No discrepancies.
*   **Function Invocation:** Verify that `applyFilter` is *always* invoked immediately after a filter button is clicked.
*   **UI Synchronization:** Confirm that the `aria-pressed` attribute on the clicked button is set to `true`, and *rigorously* `false` for all other buttons.
*   **Accessibility Compliance:** Ensure the live region text is updated *accurately and appropriately* for accessibility, reflecting the current filter status.

**3. Scope**
*   All new tests *will be added exclusively* to `tests/toolbar.test.js`. Do not modify any other files.
*   The tests *must* render the toolbar in a JSDOM environment, accurately simulating the browser DOM.
*   The tests *must* simulate `click` events on each filter button.
*   Mocks *will be used* for `chrome.storage.sync` and `applyFilter` to observe their interactions and isolate the unit under test.

**4. Detailed Task List for Implementation**

**Task: Implement User Interaction Simulation Tests in `tests/toolbar.test.js`**

**Sub-tasks:**

1.  **Setup Test Environment:**
    *   **Action:** Open `tests/toolbar.test.js`.
    *   **Action:** Import `injectToolbar`, `refreshUI` from `../src/modules/toolbar.js`.
    *   **Action:** Import `setCurrentMode`, `saveState`, `MODES`, `currentMode` from `../src/modules/state.js`. (Note: `currentMode` should be imported for direct assertion if possible, or ensure `setCurrentMode` is mocked to allow inspection).
    *   **Action:** Mock `applyFilter` using `jest.fn()`. This is *mandatory* for tracking its calls.
    *   **Action:** Mock `chrome.storage.sync.set` and `chrome.i18n.getMessage` using `jest.fn()`. Ensure `chrome.i18n.getMessage` returns plausible strings for button labels and live region updates (e.g., `jest.fn((key) => `Mocked ${key}`)`).
    *   **Action:** Create a `beforeEach` block. This block *must* rigorously reset the DOM and mocks before *every single test*. This includes:
        *   `document.body.innerHTML = '';` (Clear the DOM completely).
        *   `document.body.innerHTML = '<div class="gb_Id gb_Hd gb_Id"></div>';` (Establish a clean, consistent Gmail-like header where the toolbar will be injected. Use this exact HTML).
        *   Call `injectToolbar(document)` to render the toolbar into the mocked DOM.
        *   `applyFilter.mockClear();` (Reset the mock call count for `applyFilter`).
        *   `chrome.storage.sync.set.mockClear();` (Reset the mock call count for `saveState`).
        *   Ensure `setCurrentMode` is reset or its internal state is cleared if it's not directly mocked.

2.  **Helper Function for Simulating Clicks:**
    *   **Action:** Implement a robust helper function, `simulateClick(mode)`, that finds the button for a given mode and dispatches a click event on it.
    *   **Critical Requirement:** This function *must* accurately target the button using its `data-mode` attribute.
    *   **Example (Do not deviate without explicit approval):**
        ```javascript
        function simulateClick(mode) {
            const button = document.querySelector(`button[data-mode="${mode}"]`);
            if (button) {
                button.click(); // This will trigger the event listener in contentScript.js
            } else {
                throw new Error(`Button for mode ${mode} not found.`); // Fail fast if button is missing
            }
        }
        ```

3.  **Test Case: Clicking `MODES.HIDE` button:**
    *   **Action:** Write a `test` block with a clear, concise description.
    *   **Action:** Call `simulateClick(MODES.HIDE)`.
    *   **Assertion:** Assert that `setCurrentMode` was called *exactly once* with `MODES.HIDE`.
    *   **Assertion:** Assert that `saveState` (via `chrome.storage.sync.set`) was called *exactly once*.
    *   **Assertion:** Assert that `applyFilter` was called *exactly once*.
    *   **Assertion:** Assert that the `MODES.HIDE` button has `aria-pressed="true"`.
    *   **Assertion:** Assert that *all other* filter buttons have `aria-pressed="false"`.
    *   **Assertion:** Assert that the live region (`.gcal-live-region`) `textContent` *exactly* matches the expected message for `MODES.HIDE` (e.g., `Mocked filter_status_update: Mocked btn_mail`).

4.  **Repeat for all other `MODES`:**
    *   **Action:** Create separate `test` blocks for `MODES.ALL`, `MODES.ONLY`, `MODES.ONLY_ATTACH`, and `MODES.FAVOURITES`.
    *   **Action:** For each mode, *rigorously* repeat the actions and assertions from step 3, adjusting for the specific mode being tested.

5.  **Test Case: Clicking the same button twice:**
    *   **Action:** Write a `test` block.
    *   **Action:** Call `simulateClick(MODES.ALL)`.
    *   **Action:** Call `simulateClick(MODES.ALL)` again.
    *   **Assertion:** Assert that `setCurrentMode`, `saveState`, and `applyFilter` were called *exactly twice*.
    *   **Assertion:** Assert that the `MODES.ALL` button *remains* `aria-pressed="true"`.

6.  **Test Case: Live region updates on subsequent clicks:**
    *   **Action:** Write a `test` block.
    *   **Action:** Call `simulateClick(MODES.ALL)`.
    *   **Action:** Call `simulateClick(MODES.HIDE)`.
    *   **Assertion:** Assert that the live region `textContent` *correctly and precisely* reflects the *last* clicked mode (`MODES.HIDE`). This verifies that the live region is dynamically updated.

7.  **Test Case: No action when clicking outside buttons:**
    *   **Action:** Write a `test` block.
    *   **Action:** Simulate a click on an element that is *not* a filter button within the toolbar (e.g., the toolbar wrapper itself, or a generic `div`).
    *   **Assertion:** Assert that `setCurrentMode`, `saveState`, and `applyFilter` were *never* called (i.e., their mock call counts are zero).
    *   **Assertion:** Assert that `aria-pressed` states remain unchanged from their initial state (or previous state if a mode was set before this test).

**5. Verification**
*   Upon completion, you *must* run the tests using `npm test`.
*   All tests in `tests/toolbar.test.js` *must* pass.
*   You *must* provide the full output of `npm test` as proof.

**6. Failure Conditions**
*   Any test failure.
*   Incomplete test coverage as specified above.
*   Incorrect mocking of `chrome.storage.sync`, `applyFilter`, or `chrome.i18n.getMessage`.
*   Deviation from the prescribed DOM structure or assertion values.
*   Introduction of new dependencies without explicit approval.
*   Modification of any file outside `tests/toolbar.test.js`.

**7. Reporting**
*   Once complete, report "PRD 3 Implementation Complete."
*   Attach the full `npm test` output.
*   Do not proceed to other tasks until this one is signed off.