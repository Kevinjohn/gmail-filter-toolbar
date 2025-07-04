### PRD 1: Comprehensive `applyFilter` Tests (Revised)

**Product Requirement Document: Comprehensive `applyFilter` Function Testing**

**1. Introduction**
This document outlines the *non-negotiable* requirements for enhancing the unit tests for the `applyFilter` function, located in `src/modules/filter.js`. The current test suite is insufficient. `applyFilter` directly manipulates the DOM to filter email rows; therefore, its testing *must* be robust and comprehensive to ensure correct behaviour across all filter modes and debug states. *Failure to adhere to these specifications will result in immediate rejection.*

**2. Goals**
*   **Precision:** Ensure `applyFilter` *exactly* hides or shows email rows based on the selected filter mode. No discrepancies.
*   **Debug Mode Verification:** Verify `applyFilter`'s behaviour when `debugOn` is enabled. Rows *must* be semi-transparent, not fully hidden. This is a critical visual debugging feature.
*   **Comprehensive Coverage:** Confirm the correct application of filters to a *diverse and exhaustive* set of email types (calendar, attachment, regular, starred, and combinations thereof).

**3. Scope**
*   All new tests *will be added exclusively* to `tests/filter.test.js`. Do not modify other test files unless explicitly instructed.
*   The tests *must* mock the DOM environment using JSDOM to precisely simulate Gmail's email list structure.
*   The tests *must* cover all `MODES` defined in `src/modules/state.js`: `ALL`, `HIDE`, `ONLY`, `ONLY_ATTACH`, and `FAVOURITES`. Every mode, every permutation.

**4. Detailed Task List for Implementation**

**Task: Implement Comprehensive `applyFilter` Tests in `tests/filter.test.js`**

**Sub-tasks:**

1.  **Setup Test Environment:**
    *   **Action:** Open `tests/filter.test.js`.
    *   **Action:** *Verify* `jest.mock('chrome')` is present at the top of the file. This is *mandatory* for mocking the Chrome API, as `applyFilter` (via `isCalendarRow`) uses `chrome.i18n.getMessage`. Do not proceed without this.
    *   **Action:** Import `applyFilter`, `MODES`, `setCurrentMode`, and `setDebugOn` from their respective modules (`../src/modules/filter.js`, `../src/modules/state.js`). Use named imports only.
    *   **Action:** Create a `beforeEach` block. This block *must* rigorously reset the DOM and state before *every single test*. This includes:
        *   `document.body.innerHTML = '';` (Clear the DOM completely).
        *   `document.body.innerHTML = '<div id="message-list"></div>';` (Establish a clean, consistent parent element for email rows. Use this exact ID).
        *   `setCurrentMode(MODES.ALL);` (Reset the filter mode to default).
        *   `setDebugOn(false);` (Ensure debug mode is off by default).

2.  **Helper Function for Creating Mock Email Rows:**
    *   **Action:** Implement a robust helper function, `createEmailRow(id, options)`, that generates a mock `<tr>` element representing an email row. This function *must* be reusable and flexible.
    *   **Details:** This function *must* accept `id` (for unique identification and easy selection in assertions) and an `options` object with boolean flags: `isCalendar`, `hasAttachment`, `isFavourite`, and a `text` content string.
    *   **Critical Requirement:** The generated `<tr>` elements *must* accurately reflect the DOM structure and classes that `applyFilter` expects to find in Gmail. This includes `classList.add('zA')` for all rows, and `classList.add('byw')` for attachment rows. The `<img>` tags for `.ics` and `Starred` *must* have the correct `alt` attributes and classes as used by `isCalendarRow` and `isFavouriteRow`.
    *   **Example (Do not deviate without explicit approval):**
        ```javascript
        function createEmailRow(id, { isCalendar = false, hasAttachment = false, isFavourite = false, text = 'Test Email' } = {}) {
            const row = document.createElement('tr');
            row.classList.add('zA'); // Gmail's class for email rows
            row.dataset.testId = id; // Custom data attribute for easy selection
            row.innerHTML = `<td>${text}</td>`;
            if (isCalendar) {
                row.innerHTML += `<td><img class="aXk" alt=".ics" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
            }
            if (hasAttachment) {
                row.classList.add('byw'); // Gmail's class for attachment rows
                row.innerHTML += `<td><img class="aXk" alt="Attachment" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
            }
            if (isFavourite) {
                row.innerHTML += `<td><img alt="Starred" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
            }
            return row;
        }
        ```

3.  **Test Case: `MODES.ALL` (Show All)**
    *   **Action:** Write a `test` block with a clear, concise description.
    *   **Action:** Add a minimum of *five* diverse mock email rows (e.g., one calendar, one attachment, one favourite, one calendar+attachment, one plain) to the DOM using `createEmailRow` and append them to `#message-list`.
    *   **Action:** Call `setCurrentMode(MODES.ALL)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** *Strictly* assert that `row.style.display` is `''` (empty string, indicating visible) for *every single* email row.
    *   **Assertion:** *Strictly* assert that `row.style.background` is `''` and `row.style.opacity` is `''` for *every single* email row. No exceptions.

4.  **Test Case: `MODES.HIDE` (Mail Only - Hide Calendar)**
    *   **Action:** Write a `test` block.
    *   **Action:** Add a minimum of *five* diverse mock email rows, ensuring a mix of calendar and non-calendar types.
    *   **Action:** Call `setCurrentMode(MODES.HIDE)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For all calendar rows, assert `row.style.display` is `'none'`.
    *   **Assertion:** For all non-calendar rows, assert `row.style.display` is `''`.
    *   **Assertion:** For all rows, assert `row.style.background` is `''` and `row.style.opacity` is `''`.

5.  **Test Case: `MODES.ONLY` (Calendar Only - Show Only Calendar)**
    *   **Action:** Write a `test` block.
    *   **Action:** Add a minimum of *five* diverse mock email rows, ensuring a mix of calendar and non-calendar types.
    *   **Action:** Call `setCurrentMode(MODES.ONLY)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For all calendar rows, assert `row.style.display` is `''`.
    *   **Assertion:** For all non-calendar rows, assert `row.style.display` is `'none'`.
    *   **Assertion:** For all rows, assert `row.style.background` is `''` and `row.style.opacity` is `''`.

6.  **Test Case: `MODES.ONLY_ATTACH` (Attachments Only - Show Only Attachments)**
    *   **Action:** Write a `test` block.
    *   **Action:** Add a minimum of *five* diverse mock email rows, including rows with attachments, without attachments, and calendar rows (which should be hidden by this filter).
    *   **Action:** Call `setCurrentMode(MODES.ONLY_ATTACH)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For rows with attachments *and not calendar*, assert `row.style.display` is `''`.
    *   **Assertion:** For rows without attachments *or* calendar rows, assert `row.style.display` is `'none'`.
    *   **Assertion:** For all rows, assert `row.style.background` is `''` and `row.style.opacity` is `''`.

7.  **Test Case: `MODES.FAVOURITES` (Favourites Only - Show Only Starred)**
    *   **Action:** Write a `test` block.
    *   **Action:** Add a minimum of *five* diverse mock email rows, including favourite and non-favourite types.
    *   **Action:** Call `setCurrentMode(MODES.FAVOURITES)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For all favourite rows, assert `row.style.display` is `''`.
    *   **Assertion:** For all non-favourite rows, assert `row.style.display` is `'none'`.
    *   **Assertion:** For all rows, assert `row.style.background` is `''` and `row.style.opacity` is `''`.

8.  **Test Case: `debugOn` Functionality (Semi-transparent)**
    *   **Action:** Write a `test` block specifically for `debugOn` behaviour.
    *   **Action:** Add a mix of mock email rows (e.g., one calendar, one regular, one attachment).
    *   **Action:** Call `setDebugOn(true)`.
    *   **Action:** Call `setCurrentMode(MODES.HIDE)` (or any mode that hides rows).
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For rows that *would have been hidden* (e.g., calendar rows in `MODES.HIDE`), assert:
        *   `row.style.display` is `''`.
        *   `row.style.background` is `'rgba(0,123,255,.15)'`.
        *   `row.style.opacity` is `'0.5'`.
    *   **Assertion:** For rows that *would have been shown*, assert:
        *   `row.style.display` is `''`.
        *   `row.style.background` is `''`.
        *   `row.style.opacity` is `''`.

9.  **Test Case: `debugOn` Toggled Off (Back to Hidden)**
    *   **Action:** Write a `test` block to ensure `debugOn` correctly reverts.
    *   **Action:** Set up a scenario where `debugOn` was `true` and rows were semi-transparent (e.g., by calling `setDebugOn(true)` and `applyFilter()` with a hiding mode).
    *   **Action:** Call `setDebugOn(false)`.
    *   **Action:** Execute `applyFilter()`.
    *   **Assertion:** For rows that *were* semi-transparent, assert `row.style.display` is `'none'` and their `background` and `opacity` styles are `''`.
    *   **Assertion:** For rows that were *always* visible, assert their styles remain `''`.

**5. Verification**
*   Upon completion, you *must* run the tests using `npm test`.
*   All tests in `tests/filter.test.js` *must* pass.
*   You *must* provide the full output of `npm test` as proof.

**6. Failure Conditions**
*   Any test failure.
*   Incomplete test coverage as specified above.
*   Deviation from the prescribed DOM structure or assertion values.
*   Introduction of new dependencies without explicit approval.
*   Modification of any file outside `tests/filter.test.js`.

**7. Reporting**
*   Once complete, report "PRD 1 Implementation Complete."
*   Attach the full `npm test` output.
*   Do not proceed to other tasks until this one is signed off.