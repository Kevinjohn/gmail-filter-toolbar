### PRD 2: `MutationObserver` Behavior Tests (Revised)

**Product Requirement Document: `MutationObserver` Behaviour Testing**

**1. Introduction**
This document outlines the *absolute requirements* for enhancing the unit tests for the `MutationObserver` functionality within `src/contentScript.js` (which leverages `src/modules/observers.js`). The `MutationObserver` is a *critical component* for the extension's stability in Gmail's Single Page Application (SPA) environment. It *must* correctly re-apply filters when the DOM changes dynamically. Comprehensive tests are *non-negotiable* to verify that `applyFilter` is triggered precisely and that filters are re-applied to new or modified email lists without fail. *Any deviation from these instructions will not be tolerated.*

**2. Goals**
*   **Detection Accuracy:** Confirm that the `MutationObserver` *flawlessly* detects DOM changes within the email list container.
*   **Trigger Reliability:** Verify that `applyFilter` is *always* invoked when relevant DOM changes occur, ensuring filters are re-applied immediately and correctly.
*   **Re-application Integrity:** Ensure the re-application of filters *perfectly* affects newly added or modified email rows, maintaining consistent UI state.

**3. Scope**
*   All new tests *will be added exclusively* to `tests/contentScript.test.js`. Do not touch other files.
*   The tests *must* involve mocking the `MutationObserver` API to simulate its behaviour and control its callbacks with absolute precision.
*   The tests *must* focus on `childList` mutations within the observed email list container. No other mutation types are relevant here.

**4. Detailed Task List for Implementation**

**Task: Implement `MutationObserver` Behaviour Tests in `tests/contentScript.test.js`**

**Sub-tasks:**

1.  **Setup Test Environment:**
    *   **Action:** Open `tests/contentScript.test.js`.
    *   **Action:** Import `applyFilter` from `../src/modules/filter.js` and `observeMessageList` from `../src/modules/observers.js`.
    *   **Action:** Mock `applyFilter` using `jest.fn()`. This is *essential* for tracking its calls.
    *   **Action:** Mock `chrome.storage.sync.get` and `chrome.storage.sync.set` using `jest.fn()` as they are used in `contentScript.js`'s `main` function and event listeners. Ensure these mocks return sensible defaults or resolve promises as needed.
    *   **Action:** Create a `beforeEach` block. This block *must* rigorously reset the DOM and mocks before *every single test*. This includes:
        *   `document.body.innerHTML = '';` (Clear the DOM completely).
        *   `document.body.innerHTML = '<table role="grid" class="F cf zt"><tbody></tbody></table>';` (Establish a clean, consistent Gmail-like message table structure. Use this exact HTML).
        *   `applyFilter.mockClear();` (Reset the mock call count for `applyFilter`).

2.  **Mock `MutationObserver`:**
    *   **Action:** Create a *robust* mock `MutationObserver` class. This mock *must*:
        *   Store the callback function passed to its constructor.
        *   Have a mock `observe` method that stores the target element and options.
        *   Have a mock `disconnect` method.
    *   **Action:** Replace the global `MutationObserver` with your mock in a `beforeAll` block and restore it in `afterAll`. This ensures test isolation.
    *   **Example Mock (Do not deviate without explicit approval):**
        ```javascript
        let mockMutationObserverCallback;
        const mockMutationObserver = jest.fn((callback) => {
            mockMutationObserverCallback = callback;
            return {
                observe: jest.fn(),
                disconnect: jest.fn(),
            };
        });
        global.MutationObserver = mockMutationObserver;
        ```

3.  **Test Case: `applyFilter` is called on initial observation:**
    *   **Action:** Write a `test` block with a clear description.
    *   **Action:** Call `observeMessageList()`.
    *   **Assertion:** Assert that `mockMutationObserver` (the constructor) was called *exactly once*.
    *   **Assertion:** Assert that `applyFilter` was called *at least once* (as `observeMessageList` calls it initially).

4.  **Test Case: `applyFilter` is called when new rows are added:**
    *   **Action:** Write a `test` block.
    *   **Action:** Call `observeMessageList()`.
    *   **Action:** Get a reference to the `<tbody>` element within the mock message table.
    *   **Action:** Simulate adding a new email row to the `<tbody>` (e.g., `tbody.appendChild(document.createElement('tr'))`).
    *   **Action:** *Manually trigger* the `MutationObserver` callback. The `MutationRecord` array passed to the callback *must* accurately indicate a `childList` change with `addedNodes`.
    *   **Example Trigger (Do not deviate):**
        ```javascript
        mockMutationObserverCallback([{ type: 'childList', addedNodes: [document.createElement('tr')] }]);
        ```
    *   **Assertion:** Assert that `applyFilter` was called *again* after the mutation (total call count should be 2 if called once initially).

5.  **Test Case: `applyFilter` is called when rows are removed:**
    *   **Action:** Write a `test` block.
    *   **Action:** Add an initial email row to the `<tbody>`.
    *   **Action:** Call `observeMessageList()`.
    *   **Action:** Remove the email row from the `<tbody>`.
    *   **Action:** *Manually trigger* the `MutationObserver` callback with a mock `MutationRecord` indicating a `childList` change with `removedNodes`.
    *   **Assertion:** Assert that `applyFilter` was called *again*.

6.  **Test Case: Debouncing of `applyFilter` (if applicable):**
    *   **Note:** You *must* review `src/modules/observers.js` to determine if `applyFilter` is debounced after a `MutationObserver` trigger. If it is, this test is *critical*.
    *   **Action:** Write a `test` block.
    *   **Action:** Call `observeMessageList()`.
    *   **Action:** Simulate *multiple rapid* DOM changes (e.g., add several rows in quick succession, triggering the callback multiple times).
    *   **Action:** Use `jest.runAllTimers()` if a `setTimeout` or `debounce` function is used within the `MutationObserver` callback.
    *   **Assertion:** Assert that `applyFilter` is called *only once* (or the *exact* expected debounced number of times) after all mutations, not for each individual mutation. This verifies the debounce logic.

7.  **Test Case: Filters are re-applied correctly to new rows:**
    *   **Action:** This test combines the `MutationObserver` trigger with actual DOM verification.
    *   **Action:** Set `setCurrentMode` to a specific filter (e.g., `MODES.HIDE`).
    *   **Action:** Call `observeMessageList()`.
    *   **Action:** Add a new *calendar* email row to the `<tbody>` (using the `createEmailRow` helper from PRD 1, if applicable, or a similar mock).
    *   **Action:** Trigger the `MutationObserver` callback.
    *   **Assertion:** Assert that the newly added calendar row has `style.display` set to `'none'`.
    *   **Action:** Add a new *regular* email row to the `<tbody>`.
    *   **Action:** Trigger the `MutationObserver` callback.
    *   **Assertion:** Assert that the newly added regular email row has `style.display` set to `''`.

**5. Verification**
*   Upon completion, you *must* run the tests using `npm test`.
*   All tests in `tests/contentScript.test.js` *must* pass.
*   You *must* provide the full output of `npm test` as proof.

**6. Failure Conditions**
*   Any test failure.
*   Incomplete test coverage as specified above.
*   Incorrect mocking of `MutationObserver` or `applyFilter`.
*   Deviation from the prescribed DOM structure or assertion values.
*   Introduction of new dependencies without explicit approval.
*   Modification of any file outside `tests/contentScript.test.js`.

**7. Reporting**
*   Once complete, report "PRD 2 Implementation Complete."
*   Attach the full `npm test` output.
*   Do not proceed to other tasks until this one is signed off.