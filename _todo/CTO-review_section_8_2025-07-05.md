# PRD: Test Suite Expansion

## What we're trying to achieve

This section aims to enhance the project's test coverage by adding specific test cases for edge scenarios and critical asynchronous operations. This will improve the overall reliability and stability of the extension by catching potential bugs early and ensuring that key functionalities behave as expected under various conditions.

## Detailed Task List

### Task 8.1: Test toolbar polling timeout

#### Sub-task 8.1.1: Add a Jest test in `tests/observers.test.js` asserting that `waitForGmailChrome` rejects after the timeout period.

1.  **Action:** Create a new test file `observers.test.js` in the `tests/` directory.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/tests/observers.test.js`
    *   **Content:**

        ```javascript
        import { waitForGmailChrome } from '../src/modules/observers.js';
        import { SELECTORS } from '../src/modules/constants.js';

        describe('waitForGmailChrome', () => {
          let originalQuerySelector;

          beforeEach(() => {
            // Mock document.querySelector to simulate no toolbar found
            originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn((selector) => {
              if (selector === SELECTORS.gmailToolbar || selector === SELECTORS.gmailToolbarLegacy || selector === SELECTORS.gmailToolbarAria) {
                return null; // Simulate toolbar not found
              }
              return originalQuerySelector.call(document, selector);
            });

            // Mock requestAnimationFrame to execute immediately for testing purposes
            global.requestAnimationFrame = jest.fn(cb => cb());
            jest.useFakeTimers(); // Use fake timers for setTimeout
          });

          afterEach(() => {
            document.querySelector = originalQuerySelector; // Restore original
            global.requestAnimationFrame.mockRestore();
            jest.runOnlyPendingTimers(); // Clear any pending timers
            jest.useRealTimers(); // Restore real timers
          });

          test('should reject after 10 seconds if toolbar is not found', async () => {
            const promise = waitForGmailChrome();
            jest.advanceTimersByTime(10000); // Advance timers by 10 seconds
            await expect(promise).rejects.toThrow('Gmail toolbar not found within 10 seconds.');
          });

          test('should resolve if toolbar is found before timeout', async () => {
            // Simulate toolbar being found after 5 seconds
            document.querySelector.mockImplementationOnce((selector) => {
              if (selector === SELECTORS.gmailToolbar) {
                return { closest: () => ({}) }; // Return a mock toolbar element
              }
              return originalQuerySelector.call(document, selector);
            });

            const promise = waitForGmailChrome();
            jest.advanceTimersByTime(5000); // Advance timers by 5 seconds
            await expect(promise).resolves.toBeDefined();
          });
        });
        ```

    *   **Verification:** After creating the file, run `npm test` and ensure the new test passes.

### Task 8.2: Test filtering with no rows

#### Sub-task 8.2.1: Add a Jest test in `tests/filter.test.js` that calls `applyFilter` when no elements match `SELECTORS.emailRow` and expects no exception.

1.  **Action:** Open the `tests/filter.test.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/tests/filter.test.js`
    *   **Code Change:** Add a new test case within the `describe('applyFilter comprehensive tests', ...)` block.

        ```javascript
        // ... existing tests ...

        test('should not throw an error when no email rows are present', () => {
            // Clear the messageList to ensure no email rows are present
            messageList.innerHTML = '';
            setCurrentMode(MODES.EMAIL); // Set any mode other than ALL
            expect(() => applyFilter()).not.toThrow();
        });
        ```

    *   **Verification:** After adding the test, run `npm test` and ensure all tests, including the new one, pass.
