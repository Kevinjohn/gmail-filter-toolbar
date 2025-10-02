# Filename: /_todo/CTO-Review_human_2025-07-08.md
# [ ] Section 1: Constants and Configuration
## [ ] Task 1.1: Update `src/modules/constants.js`
### [ ] Sub-Task 1.1.1: In `src/modules/constants.js`, create a new exported constant `ATTACHMENT_TYPE_CONFIG`. It must be an object.
### [ ] Sub-Task 1.1.2: In `src/modules/constants.js`, add a key `IMAGE` to the `ATTACHMENT_TYPE_CONFIG` object. The value must be an object with three keys: `extensions` (an array `['jpg', 'jpeg', 'png', 'gif']`), `icon` (a string `'image'`), and `labelKey` (a string `'button_filter_images'`).
### [ ] Sub-Task 1.1.3: In `src/modules/constants.js`, add a key `PDF` to the `ATTACHMENT_TYPE_CONFIG` object. The value must be an object with three keys: `extensions` (an array `['pdf']`), `icon` (a string `'picture_as_pdf'`), and `labelKey` (a string `'button_filter_pdfs'`).
### [ ] Sub-Task 1.1.4: In `src/modules/constants.js`, add a key `DOCUMENT` to the `ATTACHMENT_TYPE_CONFIG` object. The value must be an object with three keys: `extensions` (an array `['doc', 'docx', 'gdoc']`), `icon` (a string `'article'`), and `labelKey` (a string `'button_filter_documents'`).
### [ ] Sub-Task 1.1.5: In `src/modules/constants.js`, add a key `SPREADSHEET` to the `ATTACHMENT_TYPE_CONFIG` object. The value must be an object with three keys: `extensions` (an array `['xls', 'xlsx', 'gsheet']`), `icon` (a string `'table_chart'`), and `labelKey` (a string `'button_filter_spreadsheets'`).
### [ ] Sub-Task 1.1.6: In `src/modules/constants.js`, add a key `PRESENTATION` to the `ATTACHMENT_TYPE_CONFIG` object. The value must be an object with three keys: `extensions` (an array `['ppt', 'pptx', 'gslides']`), `icon` (a string `'slideshow'`), and `labelKey` (a string `'button_filter_presentations'`).
### [ ] Sub-Task 1.1.7: In `src/modules/constants.js`, within the `SELECTORS` object, add a new key-value pair: `attachmentRow: 'div.brd'`.
### [ ] Sub-Task 1.1.8: In `src/modules/constants.js`, verify that the `SELECTORS` object contains the key-value pairs `attachmentChip: 'div.brc'` and `attachmentChipTitle: 'span.brg'`.

## [ ] Task 1.2: Update `src/modules/state.js`
### [ ] Sub-Task 1.2.1: In `src/modules/state.js`, locate the `FILTER_MODES` constant.
### [ ] Sub-Task 1.2.2: In `src/modules/state.js`, add the following string values to the `FILTER_MODES` array: `'IMAGE'`, `'PDF'`, `'DOCUMENT'`, `'SPREADSHEET'`, `'PRESENTATION'`.

# [ ] Section 2: Internationalisation
## [ ] Task 2.1: Update `src/_locales/en/messages.json`
### [ ] Sub-Task 2.1.1: In `src/_locales/en/messages.json`, add a new key `button_filter_images`. The value must be an object `{ "message": "Images Only" }`.
### [ ] Sub-Task 2.1.2: In `src/_locales/en/messages.json`, add a new key `button_filter_pdfs`. The value must be an object `{ "message": "PDFs Only" }`.
### [ ] Sub-Task 2.1.3: In `src/_locales/en/messages.json`, add a new key `button_filter_documents`. The value must be an object `{ "message": "Documents Only" }`.
### [ ] Sub-Task 2.1.4: In `src/_locales/en/messages.json`, add a new key `button_filter_spreadsheets`. The value must be an object `{ "message": "Spreadsheets Only" }`.
### [ ] Sub-Task 2.1.5: In `src/_locales/en/messages.json`, add a new key `button_filter_presentations`. The value must be an object `{ "message": "Presentations Only" }`.

# [ ] Section 3: Core Logic Implementation
## [ ] Task 3.1: Update `src/modules/filter.js`
### [ ] Sub-Task 3.1.1: In `src/modules/filter.js`, create a new exported function `hasSpecificAttachmentType` that accepts two arguments: `row` and `attachmentType`.
### [ ] Sub-Task 3.1.2: Inside `hasSpecificAttachmentType`, query the `row` element for all nodes matching the `SELECTORS.attachmentChip` selector.
### [ ] Sub-Task 3.1.3: Inside `hasSpecificAttachmentType`, retrieve the array of file extensions from `ATTACHMENT_TYPE_CONFIG[attachmentType].extensions`.
### [ ] Sub-Task 3.1.4: Inside `hasSpecificAttachmentType`, iterate through each found attachment chip. For each chip, extract the filename from its `title` attribute or, as a fallback, the `textContent` of the element matching `SELECTORS.attachmentChipTitle`.
### [ ] Sub-Task 3.1.5: Inside the loop in `hasSpecificAttachmentType`, extract the file extension from the filename. Check if this extension is included in the array of target extensions.
### [ ] Sub-Task 3.1.6: Inside the loop in `hasSpecificAttachmentType`, check the chip's `data-tooltip` attribute for Google Drive file type identifiers.
### [ ] Sub-Task 3.1.7: Inside the loop in `hasSpecificAttachmentType`, if a match is found in either the file extension or the `data-tooltip`, the function must immediately return `true`.
### [ ] Sub-Task 3.1.8: If the loop in `hasSpecificAttachmentType` completes without finding any matches, the function must return `false`.
### [ ] Sub-Task 3.1.9: In `src/modules/filter.js`, modify the `applyFilter` function to handle the new attachment filter modes.
### [ ] Sub-Task 3.1.10: In `applyFilter`, for each new mode (e.g., `IMAGE`, `PDF`), first check if the row has any attachments using `hasAttachmentRow(row)`.
### [ ] Sub-Task 3.1.11: In `applyFilter`, if `hasAttachmentRow(row)` returns true, then call `hasSpecificAttachmentType(row, mode)` to determine if the row matches the specific filter.
### [ ] Sub-Task 3.1.12: In `applyFilter`, toggle the row's visibility based on the boolean result of the filtering logic.

## [ ] Task 3.2: Update `src/modules/toolbar.js`
### [ ] Sub-Task 3.2.1: In `src/modules/toolbar.js`, modify the `createToolbar` function to import `ATTACHMENT_TYPE_CONFIG` from `constants.js`.
### [ ] Sub-Task 3.2.2: In `createToolbar`, add logic to iterate over the `ATTACHMENT_TYPE_CONFIG` object.
### [ ] Sub-Task 3.2.3: In the `createToolbar` loop, for each key-value pair in `ATTACHMENT_TYPE_CONFIG`, create a new button element.
### [ ] Sub-Task 3.2.4: In the `createToolbar` loop, set the new button's `id` to `filter-KEY` (e.g., `filter-IMAGE`).
### [ ] Sub-Task 3.2.5: In the `createToolbar` loop, set the new button's inner text to the `icon` value from the config object.
### [ ] Sub-Task 3.2.6: In the `createToolbar` loop, set the new button's `title` and `aria-label` attributes by calling `chrome.i18n.getMessage` with the `labelKey` from the config object.
### [ ] Sub-Task 3.2.7: In `createToolbar`, append the newly created buttons to the toolbar element after the existing "Attachments Only" button.

# [ ] Section 4: Testing
## [ ] Task 4.1: Update `tests/filter.test.js`
### [ ] Sub-Task 4.1.1: In `tests/filter.test.js`, add a new `describe` block for the `hasSpecificAttachmentType` function.
### [ ] Sub-Task 4.1.2: In the new `describe` block, write a distinct test case for each individual file extension specified in `ATTACHMENT_TYPE_CONFIG` to confirm it is correctly identified.
### [ ] Sub-Task 4.1.3: In the new `describe` block, write test cases to verify that Google Drive file types are correctly identified via their `data-tooltip` attribute.
### [ ] Sub-Task 4.1.4: In the new `describe` block, write a test case for an email row containing multiple attachments, where at least one matches the filter, to ensure the function returns `true`.
### [ ] Sub-Task 4.1.5: In the new `describe` block, write a test case for an email row with non-matching attachments to ensure the function returns `false`.

## [ ] Task 4.2: Update `tests/toolbar.test.js`
### [ ] Sub-Task 4.2.1: In `tests/toolbar.test.js`, add a new test case to verify that the `createToolbar` function dynamically creates and appends the five new filter buttons.
### [ ] Sub-Task 4.2.2: In the new test case, mock `chrome.i18n.getMessage` and assert that the correct `title` and `aria-label` are set for each new button.