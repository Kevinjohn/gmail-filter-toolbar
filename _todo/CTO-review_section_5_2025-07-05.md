# PRD: Filtering Logic Localization

## What we're trying to achieve

This section aims to improve the internationalization (i18n) of the filtering logic by localizing the selector used to identify "favourite" or "starred" email rows. Currently, this selector uses a hard-coded string, which can break in different language versions of Gmail. By using `chrome.i18n.getMessage`, the extension will be more robust and adaptable to various locales.

## Detailed Task List

### Task 5.1: Localise favourite selector

#### Sub-task 5.1.1: In `src/modules/filter.js`, replace the hard-coded selector `img[alt="Starred"]` with `img[alt="${chrome.i18n.getMessage('alt_starred')}"]`.

1.  **Action:** Open the `src/modules/filter.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/filter.js`
    *   **Code Change:** Locate the `isFavouriteRow` function and modify the selector within it.

        ```javascript
        // BEFORE:
        // export function isFavouriteRow(row) {
        //   return !!row.querySelector('span[data-tooltip="Starred"]');
        // }

        // AFTER:
        export function isFavouriteRow(row, chromeApi = chrome) {
          const starredAltText = chromeApi.i18n.getMessage('alt_starred');
          return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
        }
        ```

    *   **Verification:** After the change, ensure that the `isFavouriteRow` function now uses `chrome.i18n.getMessage('alt_starred')` to construct the selector.
[x]

2.  **Action:** Add the `alt_starred` message key to the `_locales/en/messages.json` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/_locales/en/messages.json`
    *   **Code Change:** Add a new entry for `alt_starred`.

        ```json
        {
          // ... existing messages ...
          "alt_starred": {
            "message": "Starred",
            "description": "Alt text for the starred icon/tooltip"
          }
        }
        ```

    *   **Verification:** Confirm that the `alt_starred` key is present in `src/_locales/en/messages.json`.
[x]

3.  **Action:** Add the `alt_starred` message key to the `_locales/en_GB/messages.json` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/_locales/en_GB/messages.json`
    *   **Code Change:** Add a new entry for `alt_starred`.

        ```json
        {
          // ... existing messages ...
          "alt_starred": {
            "message": "Starred",
            "description": "Alt text for the starred icon/tooltip"
          }
        }
        ```

    *   **Verification:** Confirm that the `alt_starred` key is present in `src/_locales/en_GB/messages.json`.
[x]
