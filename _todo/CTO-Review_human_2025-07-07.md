# Filename: /_todo/CTO-Review_human_2025-07-07.md
# [ ] Section 1: State Management Configuration
## [ ] Task 1.1: Add State Key Constant
### [ ] Sub-Task 1.1.1: In the file `src/modules/constants.js`, add the following line of code: `export const SHOW_BUTTON_TEXT_KEY = 'showButtonText';`.
## [ ] Task 1.2: Update Default State
### [ ] Sub-Task 1.2.1: In the file `src/modules/state.js`, locate the `DEFAULT_STATE` object and add the following key-value pair to it: `[SHOW_BUTTON_TEXT_KEY]: true`.

# [ ] Section 2: Internationalization
## [ ] Task 2.1: Add English Locale String
### [ ] Sub-Task 2.1.1: In the file `src/_locales/en/messages.json`, add the following JSON object as a new key:
```json
"optionShowButtonText": {
  "message": "Show text on filter buttons",
  "description": "Label for the option to show or hide text on the filter buttons."
}
```
## [ ] Task 2.2: Propagate Locale String to All Other Languages
### [ ] Sub-Task 2.2.1: In `src/_locales/cs_CZ/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.2: In `src/_locales/da_DK/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.3: In `src/_locales/de_DE/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.4: In `src/_locales/el_GR/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.5: In `src/_locales/en_GB/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.6: In `src/_locales/es_ES/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.7: In `src/_locales/es_MX/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.8: In `src/_locales/fi_FI/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.9: In `src/_locales/fr_CA/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.10: In `src/_locales/fr_FR/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.11: In `src/_locales/hu_HU/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.12: In `src/_locales/it_IT/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.13: In `src/_locales/nb_NO/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.14: In `src/_locales/nl_NL/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.15: In `src/_locales/pl_PL/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.16: In `src/_locales/pt/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.17: In `src/_locales/pt_BR/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.18: In `src/_locales/pt_PT/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.19: In `src/_locales/ro_RO/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.20: In `src/_locales/ru_RU/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.21: In `src/_locales/sv_SE/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.22: In `src/_locales/tr_TR/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.
### [ ] Sub-Task 2.2.23: In `src/_locales/uk_UA/messages.json`, add the key `"optionShowButtonText"` with the English message as a placeholder.

# [ ] Section 3: Options Page User Interface
## [ ] Task 3.1: Update HTML Structure
### [ ] Sub-Task 3.1.1: In `src/options.html`, add a new `div` element to contain the new checkbox option.
### [ ] Sub-Task 3.1.2: Inside the new `div`, add a `<label for="show-button-text-checkbox">` containing the text `__MSG_optionShowButtonText__`.
### [ ] Sub-Task 3.1.3: Inside the new `div`, after the label, add an `<input type="checkbox" id="show-button-text-checkbox">`.
## [ ] Task 3.2: Update Options Page Logic
### [ ] Sub-Task 3.2.1: In `src/modules/options.js`, modify the `save_options` function to read the `checked` property of the `#show-button-text-checkbox` element.
### [ ] Sub-Task 3.2.2: In `src/modules/options.js`, within the `save_options` function, add a call to `chrome.storage.sync.set` to save the value from the checkbox using the `SHOW_BUTTON_TEXT_KEY` constant.
### [ ] Sub-Task 3.2.3: In `src/modules/options.js`, modify the `restore_options` function to retrieve the value for `showButtonText` from `chrome.storage.sync`.
### [ ] Sub-Task 3.2.4: In `src/modules/options.js`, within the `restore_options` function, set the `checked` property of the `#show-button-text-checkbox` element based on the retrieved value.
### [ ] Sub-Task 3.2.5: In `src/modules/options.js`, ensure an event listener is attached to the `change` event of the `#show-button-text-checkbox` element, which calls the `save_options` function.

# [ ] Section 4: Styling
## [ ] Task 4.1: Add Styling Rule for Icon-Only View
### [ ] Sub-Task 4.1.1: In `src/styles.css`, add the following CSS rule: `.gcal-filter-bar.show-icon-only .gcal-text-label { display: none; }`.
## [ ] Task 4.2: Verify Button Layout
### [ ] Sub-Task 4.2.1: Review all padding and margin styles associated with the filter buttons to ensure the layout adjusts correctly when the text label is hidden.

# [ ] Section 5: Content Script Implementation
## [ ] Task 5.1: Create Toolbar Update Function
### [ ] Sub-Task 5.1.1: In `src/modules/toolbar.js`, create and export a new function named `updateButtonTextView` that accepts one boolean argument, `showText`.
### [ ] Sub-Task 5.1.2: Implement `updateButtonTextView` to select the `.gcal-filter-bar` element and call `classList.toggle('show-icon-only', !showText)` on it.
## [ ] Task 5.2: Integrate State with Content Script
### [ ] Sub-Task 5.2.1: In `src/contentScript.js`, upon initial execution, retrieve the `showButtonText` setting from `chrome.storage.sync`.
### [ ] Sub-Task 5.2.2: In `src/contentScript.js`, after retrieving the setting, call the `updateButtonTextView` function, passing the retrieved value.
### [ ] Sub-Task 5.2.3: In `src/contentScript.js`, add a listener for `chrome.storage.onChanged`.
### [ ] Sub-Task 5.2.4: The listener must check if the `showButtonText` key has changed in storage.
### [ ] Sub-Task 5.2.5: If `showButtonText` has changed, the listener must call `updateButtonTextView` with the `newValue` from the change object.

# [ ] Section 6: Quality Assurance
## [ ] Task 6.1: Write Unit Tests
### [ ] Sub-Task 6.1.1: In `tests/options.test.js`, add a new test case to verify that the `showButtonText` option is correctly saved to the mock `chrome.storage.sync` when the checkbox is changed.
### [ ] Sub-Task 6.1.2: In `tests/options.test.js`, add a new test case to verify that the options page checkbox is correctly checked or unchecked based on the value loaded from storage during `restore_options`.
## [ ] Task 6.2: Perform Manual End-to-End Testing
### [ ] Sub-Task 6.2.1: [ ] **Default State:** Load the extension and confirm the filter buttons display both icon and text by default.
### [ ] Sub-Task 6.2.2: [ ] **Options Page:** Open the options page and confirm the "Show text on filter buttons" option is present and enabled.
### [ ] Sub-Task 6.2.3: [ ] **Toggle OFF:** Disable the option. Navigate to Gmail and verify the button text is hidden and the buttons have reduced in size.
### [ ] Sub-Task 6.2.4: [ ] **Accessibility Check:** With text hidden, use browser developer tools to inspect the buttons and confirm they retain their `aria-label` and `data-tooltip` attributes.
### [ ] Sub-Task 6.2.5: [ ] **Toggle ON:** Re-enable the option on the options page and verify the button text reappears on the Gmail interface.
### [ ] Sub-Task 6.2.6: [ ] **Persistence:** Disable the option, then reload the Gmail tab. Verify the text remains hidden after the reload.
### [ ] Sub-Task 6.2.7: [ ] **Localization:** Change the browser's primary language to a supported language other than English and verify the option label is translated on the options page.
