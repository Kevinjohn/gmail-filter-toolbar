# PRD: State Module Refactoring

## What we're trying to achieve

This section focuses on refactoring the state management functions (`loadState` and `saveState`) in `src/modules/state.js` to use Promises instead of callbacks. This modernization will improve the readability, maintainability, and error handling of asynchronous operations within the extension, aligning with contemporary JavaScript best practices.

## Detailed Task List

### Task 2.1: Refactor `loadState`

#### Sub-task 2.1.1: Rewrite `loadState` in `src/modules/state.js` so it returns a `Promise` instead of using a callback parameter.

1.  **Action:** Open the `src/modules/state.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/state.js`
    *   **Code Change:** Modify the `loadState` function to return a `Promise`.

        ```javascript
        export function loadState() {
          return new Promise((resolve, reject) => {
            chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
              if (chrome.runtime.lastError) {
                console.error("Error retrieving storage data:", chrome.runtime.lastError);
                currentMode = MODES.ALL;
                debugOn = false;
                reject(chrome.runtime.lastError); // Reject the promise on error
              } else {
                currentMode = res[KEY_MODE] || MODES.ALL;
                debugOn = !!res[KEY_DEBUG];
                resolve(); // Resolve the promise on success
              }
            });
          });
        }
        ```

    *   **Verification:** After the change, ensure that any calls to `loadState` are updated to handle the returned Promise (e.g., using `.then()` and `.catch()`).
[x]

### Task 2.2: Refactor `saveState`

#### Sub-task 2.2.1: Rewrite `saveState` in `src/modules/state.js` so it returns a `Promise` that resolves when `chrome.storage.sync.set` completes.

1.  **Action:** Open the `src/modules/state.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/state.js`
    *   **Code Change:** Modify the `saveState` function to return a `Promise`.

        ```javascript
        export function saveState() {
          return new Promise((resolve, reject) => {
            chrome.storage.sync.set({ [KEY_MODE]: currentMode }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error saving mode:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError); // Reject the promise on error
              } else {
                resolve(); // Resolve the promise on success
              }
            });
          });
        }
        ```

    *   **Verification:** After the change, ensure that any calls to `saveState` are updated to handle the returned Promise (e.g., using `.then()` and `.catch()`).
[x]
