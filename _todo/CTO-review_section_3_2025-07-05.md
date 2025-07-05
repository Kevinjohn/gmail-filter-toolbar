# PRD: Observers Module Enhancements

## What we're trying to achieve

This section aims to improve the robustness, testability, and maintainability of the observer functions within `src/modules/observers.js`. This includes extracting a common utility, adding timeout mechanisms for critical polling functions, preventing duplicate observer instances, and parameterizing document access for better testability.

## Detailed Task List

### Task 3.1: Extract debounce utility

#### Sub-task 3.1.1: Create `src/modules/utils/debounce.js` containing the debounce function with JSDoc comments.

1.  **Action:** Create a new directory `src/modules/utils`.
    *   **Command:** `mkdir -p /Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/utils`
    *   **Verification:** Confirm the directory `src/modules/utils` has been created.

2.  **Action:** Create a new file `debounce.js` inside `src/modules/utils` and add the debounce function with JSDoc comments.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/utils/debounce.js`
    *   **Content:**

        ```javascript
        /**
         * Creates a debounced function that delays invoking `func` until after `delay` milliseconds have elapsed
         * since the last time the debounced function was invoked.
         * @param {Function} func The function to debounce.
         * @param {number} delay The number of milliseconds to delay.
         * @returns {Function} Returns the new debounced function.
         */
        export function debounce(func, delay) {
          let timeout;
          return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
          };
        }
        ```

    *   **Verification:** Confirm the file `src/modules/utils/debounce.js` exists and contains the specified content.
[x]

#### Sub-task 3.1.2: Replace the debounce implementation in `src/modules/observers.js` with an import from `./utils/debounce.js`.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Remove the local `debounce` function definition and add an import statement.

        ```javascript
        // BEFORE:
        // function debounce(func, delay) {
        //   let timeout;
        //   return function(...args) {
        //     const context = this;
        //     clearTimeout(timeout);
        //     timeout = setTimeout(() => func.apply(context, args), delay);
        //   };
        // }

        // AFTER:
        import { debounce } from './utils/debounce.js';
        ```

    *   **Verification:** Confirm that the `debounce` function is no longer defined locally in `src/modules/observers.js` and the import statement is present.
[x]

### Task 3.2: Add timeout to `waitForGmailChrome`

#### Sub-task 3.2.1: Modify `waitForGmailChrome` in `src/modules/observers.js` to reject after 10 seconds if no toolbar is found.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Add a timeout mechanism to the `waitForGmailChrome` function.

        ```javascript
        export function waitForGmailChrome() {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Gmail toolbar not found within 10 seconds.'));
                }, 10000); // 10 seconds timeout

                (function poll() {
                    const toolbar = document.querySelector(SELECTORS.gmailToolbar) ||
                                    document.querySelector(SELECTORS.gmailToolbarLegacy) ||
                                    document.querySelector(SELECTORS.gmailToolbarAria);

                    if (toolbar) {
                        clearTimeout(timeoutId); // Clear timeout if toolbar is found
                        const header = toolbar.closest(SELECTORS.gmailToolbarHeader);
                        if (header) {
                            console.log('[GCO] injecting into header →', header);
                            resolve(header);
                        } else {
                            requestAnimationFrame(poll);
                        }
                    } else {
                        requestAnimationFrame(poll);
                    }
                })();
            });
        }
        ```

    *   **Verification:** Review the `waitForGmailChrome` function to ensure the `setTimeout` and `clearTimeout` calls are correctly implemented.
[x]

#### Sub-task 3.2.2: Remove the `console.log` statement from `waitForGmailChrome`.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Remove the `console.log` statement from `waitForGmailChrome`.

        ```javascript
        // BEFORE:
        // console.log('[GCO] injecting into header →', header);

        // AFTER:
        // (remove the line entirely)
        ```

    *   **Verification:** Confirm that the `console.log` statement is no longer present in `waitForGmailChrome`.
[x]

### Task 3.3: Prevent duplicate observers

#### Sub-task 3.3.1: Store the `MutationObserver` instance created in `observeMessageList` and `setupGmailToolbarObserver` in a module-level variable and disconnect it before creating a new one.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Modify `observeMessageList` and `setupGmailToolbarObserver` to store and manage `MutationObserver` instances.

        ```javascript
        // Add these module-level variables at the top of the file, after imports
        let messageListObserver = null;
        let gmailToolbarObserver = null;

        export function observeMessageList(doc = document) {
          const target = doc.querySelector(SELECTORS.emailList);
          if (!target) return;

          // Disconnect existing observer if it exists
          if (messageListObserver) {
            messageListObserver.disconnect();
          }

          const debouncedApplyFilter = debounce(() => {
            if (currentMode !== MODES.ALL) applyFilter();
          }, 200);

          messageListObserver = new MutationObserver(debouncedApplyFilter);
          messageListObserver.observe(target, { childList: true });
        }

        export function setupGmailToolbarObserver(doc = document) {
          // Disconnect existing observer if it exists
          if (gmailToolbarObserver) {
            gmailToolbarObserver.disconnect();
          }

          gmailToolbarObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList') {
                const gmailToolbarHeader = doc.querySelector(SELECTORS.gmailToolbarHeader);
                const filterWrapper = doc.querySelector(SELECTORS.filterWrapper);

                if (gmailToolbarHeader && !filterWrapper) {
                  injectToolbar(doc, gmailToolbarHeader);
                }
                observeMessageList(doc);
                applyFilter();
              }
            }
          });
          gmailToolbarObserver.observe(doc.body, { childList: true, subtree: true });
        }
        ```

    *   **Verification:** Review `observeMessageList` and `setupGmailToolbarObserver` to ensure that `messageListObserver` and `gmailToolbarObserver` are declared at the module level, and `disconnect()` is called before creating new instances.
[x]

### Task 3.4: Parameterize document access

#### Sub-task 3.4.1: Update `observeMessageList` in `src/modules/observers.js` to accept an optional `doc` parameter defaulting to `document`.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Modify the function signature of `observeMessageList`.

        ```javascript
        // BEFORE:
        // export function observeMessageList() {

        // AFTER:
        export function observeMessageList(doc = document) {
        ```

    *   **Verification:** Confirm the function signature of `observeMessageList` has been updated.
[x]

#### Sub-task 3.4.2: Update `setupGmailToolbarObserver` in `src/modules/observers.js` to accept an optional `doc` parameter defaulting to `document`.

1.  **Action:** Open the `src/modules/observers.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/observers.js`
    *   **Code Change:** Modify the function signature of `setupGmailToolbarObserver`.

        ```javascript
        // BEFORE:
        // export function setupGmailToolbarObserver() {

        // AFTER:
        export function setupGmailToolbarObserver(doc = document) {
        ```

    *   **Verification:** Confirm the function signature of `setupGmailToolbarObserver` has been updated.
[x]
