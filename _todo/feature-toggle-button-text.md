### Product Requirements Document (PRD)

*   **Title:** Feature: Toggle Text Visibility on Filter Buttons
*   **Author:** Gemini
*   **Date:** 2025-07-07
*   **Status:** Proposed
*   **Objective:** Provide users with a configuration option to display only icons on the filter buttons, allowing for a more compact and minimalist user interface.
*   **User Story:** As a user, I want the ability to hide the text labels on the filter buttons so that I can reduce the space the toolbar uses and achieve a cleaner look in my Gmail interface.

#### Functional Requirements

1.  **New Option:** A new binary toggle/checkbox option shall be added to the extension's options page (`options.html`).
2.  **Option Label:** The label for this new option will be "Show text on filter buttons". This text must be internationalized and sourced from the `_locales/` message bundles.
3.  **Default State:** The option will be **enabled (ON)** by default, meaning the filter buttons will show both an icon and a text label, preserving the current behaviour for all users upon installation or update.
4.  **"OFF" State Behaviour:** When the option is disabled (OFF), the text portion of the filter buttons (`.gcal-text-label`) will be hidden. The buttons should shrink in width to fit only the icon, creating a more compact toolbar.
5.  **Persistence:** The user's selection for this option must be saved and persist across browser sessions using `chrome.storage.sync`.
6.  **Dynamic Updates:** The change in setting should be reflected on the Gmail page immediately without requiring a page reload.

#### Technical Implementation

*   **State:** A new key (e.g., `showButtonText`) will be added to the extension's state, stored in `chrome.storage.sync`, with a default value of `true`.
*   **CSS Class Toggling:** The visibility of the button text will be controlled by adding or removing a CSS class (e.g., `show-icon-only`) on the main filter bar container (`.gcal-filter-bar`).
*   **Styling:** A new CSS rule will be defined in `styles.css` to hide the `.gcal-text-label` element when the `show-icon-only` class is present on its parent container.

---

### Detailed Implementation Task List

#### 1. State Management (`src/modules/state.js`)

*   [ ]  In `constants.js`, add a new export `export const SHOW_BUTTON_TEXT_KEY = 'showButtonText';`.
*   [ ]  In `state.js`, update the `DEFAULT_STATE` object to include `[SHOW_BUTTON_TEXT_KEY]: true`.

#### 2. Internationalization (`src/_locales/`)

*   [ ]  Add a new key-value pair to `src/_locales/en/messages.json`:
    ```json
    "optionShowButtonText": {
      "message": "Show text on filter buttons",
      "description": "Label for the option to show or hide text on the filter buttons."
    }
    ```
*   [ ]  Propagate this new key to all other `messages.json` files in the `_locales` directory. The message can be the English version initially, to be replaced by translators.

#### 3. Options Page (`src/options.html` & `src/modules/options.js`)

*   [ ]  **`options.html`**:
    *   Add a new `div` section for the option.
    *   Inside, create a `<label>` and an `<input type="checkbox">`.
    *   **Accessibility:** Ensure the `<label>` has a `for` attribute that exactly matches the `id` of the `<input>` (e.g., `<label for="show-button-text-checkbox">` and `<input id="show-button-text-checkbox">`). This is critical for screen readers and improves usability.
    *   Use the `__MSG_optionShowButtonText__` placeholder for the label's text.
    *   Assign a unique `id` to the checkbox (e.g., `show-button-text-checkbox`).
*   [ ]  **`options.js`**:
    *   In `save_options`, get the value from the new checkbox and save it to `chrome.storage.sync` using the `SHOW_BUTTON_TEXT_KEY`.
    *   In `restore_options`, retrieve the saved value for `showButtonText` and set the `checked` property of the new checkbox accordingly.
    *   Ensure the event listener for saving options is attached to the new checkbox.

#### 4. Styling (`src/styles.css`)

*   [ ]  Add a new CSS rule to hide the text label when the parent container has the `show-icon-only` class:
    ```css
    .gcal-filter-bar.show-icon-only .gcal-text-label {
      display: none;
    }
    ```
*   [ ]  Review and adjust any related button padding or margin styles to ensure the buttons shrink gracefully without layout issues.

#### 5. Content Script (`src/modules/toolbar.js` & `contentScript.js`)

*   [ ]  **`toolbar.js`**:
    *   Create a new function, `updateButtonTextView(showText)`, which takes a boolean.
    *   This function will get the `.gcal-filter-bar` element and use `classList.toggle('show-icon-only', !showText)` to apply the class based on the setting.
*   [ ]  **`contentScript.js`**:
    *   On initial load, after the toolbar is injected, retrieve the `showButtonText` setting from `chrome.storage.sync`.
    *   Call the `updateButtonTextView` function with the retrieved value.
    *   Set up a `chrome.storage.onChanged` listener. Inside the listener, check if the `showButtonText` key has changed. If it has, call `updateButtonTextView` with the `newValue` to update the UI dynamically.

#### 6. Testing

*   [ ]  **Unit Tests (`tests/options.test.js`):**
    *   Write a new test to verify that the `showButtonText` option is correctly saved to the mock `chrome.storage.sync`.
    *   Write a test to verify that the checkbox on the options page is correctly checked/unchecked based on the value loaded from storage.
*   [ ]  **Manual End-to-End Testing:**
    *   **Default State:** Load the extension and confirm the filter buttons display both icon and text.
    *   **Options Page:** Open the options page and confirm the new "Show text on filter buttons" option is present and enabled.
    *   **Toggle OFF:** Disable the option. Go back to Gmail and verify the button text is now hidden and the buttons are smaller.
    *   **Accessibility Check (Icon-Only):** With the text hidden, use browser dev tools to inspect the buttons and confirm that they retain their `aria-label` and `data-tooltip` attributes to ensure they are still accessible.
    *   **Toggle ON:** Re-enable the option and verify the button text reappears.
    *   **Persistence:** Disable the option, then reload the Gmail tab. Verify the text remains hidden.
    *   **Localization:** Switch the browser language to another supported language (e.g., Spanish) and verify the option label is translated on the options page.
