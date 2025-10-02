# PRD: Granular Attachment Filtering

**Status:** In Progress
**Author:** Gemini
**Date:** 2025-07-08

## 1. Overview

This document outlines the requirements for a new feature that allows users to filter their Gmail inbox by specific attachment types. This will provide a more granular level of control beyond the existing "Attachments Only" filter.

The new filter categories are:
*   Images
*   PDFs
*   Documents
*   Spreadsheets
*   Presentations

## 2. User Stories

*   **As a user,** I want to filter my inbox to show only emails containing specific attachment types (like PDFs, images, or documents) so I can find files more quickly and efficiently.
*   **As a user,** I want the new filter buttons to be clearly labelled and visually distinct so I can easily understand their function.
*   **As a user,** I expect the new filters to work seamlessly with keyboard navigation and screen readers, consistent with the existing accessibility standards of the extension.

## 3. UI/UX Requirements

### 3.1. Toolbar Changes

*   Five new filter buttons will be added to the main toolbar, appearing after the existing "Attachments Only" button.
*   The button order will be: `...`, `Attachments Only`, `Images`, `PDFs`, `Documents`, `Spreadsheets`, `Presentations`.

### 3.2. Button Behaviour

*   All filter buttons (including the new ones) will function as a single "radio group". Only one filter can be active at any given time.
*   Clicking a new filter button will deactivate any currently active filter and apply the new one.

### 3.3. Icons & Labels

*   Each new button will display a unique Material Icon to represent its file type.
    *   **Images:** `image`
    *   **PDFs:** `picture_as_pdf`
    *   **Documents:** `article`
    *   **Spreadsheets:** `table_chart`
    *   **Presentations:** `slideshow`
*   Button labels will be internationalised using the `chrome.i18n` API. New keys will be added to `_locales/en/messages.json` and other language files.
    *   `button_filter_images`: "Images Only"
    *   `button_filter_pdfs`: "PDFs Only"
    *   `button_filter_documents`: "Documents Only"
    *   `button_filter_spreadsheets`: "Spreadsheets Only"
    *   `button_filter_presentations`: "Presentations Only"

### 3.4. Accessibility

*   New buttons must be fully keyboard accessible (navigable via Tab key).
*   The `aria-pressed` attribute must be correctly toggled to reflect the active state.
*   The `Escape` key behaviour (focusing the message list) must be maintained.

## 4. Technical Implementation

### 4.1. Modularity

*   The implementation should be modular to facilitate the addition of new attachment categories in the future. This suggests using a configuration object or similar structure to define the filters.

### 4.2. Selector Constants

*   New constants will be added to `src/modules/constants.js` to define the selectors for each attachment category.
*   Each category will be an array of strings, allowing for multiple file types (e.g., `.xls`, `.xlsx`).

```javascript
// src/modules/constants.js

export const ATTACHMENT_TYPE_SELECTORS = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif'],
  PDF: ['pdf'],
  DOCUMENT: ['doc', 'docx', 'gdoc'],
  SPREADSHEET: ['xls', 'xlsx', 'gsheet'],
  PRESENTATION: ['ppt', 'pptx', 'gslides'],
};

export const SELECTORS = {
  // ... existing selectors
  attachmentChip: 'div.brc',
  attachmentChipTitle: 'span.brg',
  // ...
};
```

### 4.3. Filtering Logic

*   The core `applyFilter` function in `filter.js` will be updated to handle the new filter modes.
*   A new helper function, `hasSpecificAttachmentType(row, attachmentType)`, will be created.
*   The logic will be:
    1.  The main `applyFilter` function iterates through email rows.
    2.  For the new filter modes, it first calls the existing `hasAttachmentRow(row)` function.
    3.  If `true`, it then calls `hasSpecificAttachmentType(row, 'PDF')` (for example).
    4.  `hasSpecificAttachmentType` will check the attachment row for any of the selectors defined in the corresponding array in `ATTACHMENT_TYPE_SELECTORS`.

```javascript
// src/modules/filter.js

import { ATTACHMENT_TYPE_SELECTORS, SELECTORS } from './constants.js';
// ...

export function hasSpecificAttachmentType(row, attachmentType) {
  const attachmentChips = row.querySelectorAll(SELECTORS.attachmentChip);
  if (!attachmentChips.length) {
    return false;
  }

  const fileExtensions = ATTACHMENT_TYPE_SELECTORS[attachmentType];
  if (!fileExtensions) {
    return false;
  }

  for (const chip of attachmentChips) {
    const title = chip.getAttribute('title') || '';
    const titleSpan = chip.querySelector(SELECTORS.attachmentChipTitle);
    const textContent = titleSpan ? titleSpan.textContent : '';

    const fileName = title || textContent;
    if (fileName) {
      const extension = fileName.split('.').pop().toLowerCase();
      if (fileExtensions.includes(extension)) {
        return true;
      }
    }
  }

  return false;
}

// ... updated FILTER_CONFIG
```

## 5. Testing Plan

*   New unit tests will be added to `tests/filter.test.js`.
*   **Comprehensive Coverage:** Tests must be created for each individual file extension within a category to ensure all are correctly identified.
    *   Example: For Spreadsheets, there should be separate tests for emails containing only `.xls`, only `.xlsx`, and only Google Sheets attachments.
*   Manual smoke tests must be updated to include verification of all new filter buttons.

## 6. Open Questions

1.  **DOM Structure:** What is the precise DOM relationship between a main email row (`<tr>`) and its corresponding attachment row? Is the attachment row a direct sibling (`nextElementSibling`) or is it nested differently? This needs to be investigated to finalize the implementation of `hasSpecificAttachmentType`.

    *   **Resolution (2025-07-08):** Based on the provided HTML, the attachments are located within the main email row (`<tr class="zA yO byw">`). Specifically, they are in `div.brd`, which is a sibling to the `div.xS` containing the subject. Inside `div.brd`, each attachment is represented by a `div.brc` element. The filename can be extracted from the `title` attribute of `div.brc` or the `textContent` of its child `span.brg`. The implementation will proceed based on this structure.

2.  **Google Docs/Sheets/Slides:** How are Google Drive attachments represented in the DOM? Do they have a consistent file extension or a unique CSS class?

    *   **Resolution (2025-07-08):** Google Drive attachments are identified by specific `data-tooltip` values on the attachment chip. For example, a Google Doc has `data-tooltip="Google Doc"`. The `ATTACHMENT_TYPE_SELECTORS` will be updated to include these identifiers, and the `hasSpecificAttachmentType` function will be modified to check both file extensions and `data-tooltip` attributes.
3.  **Multiple Attachments:** To ensure the filtering logic correctly handles emails with multiple attachments (of the same or different types), the complete HTML for a `<tr>` element containing several `div.brc` chips is required for testing.

## 7. Verbose Development Plan

This section outlines the step-by-step plan to implement the granular attachment filtering feature.

### Phase 1: Constants and Configuration

1.  **Update `src/modules/constants.js`:**
    *   Introduce a new exported object `ATTACHMENT_TYPE_CONFIG`. This object will be the single source of truth for the new filters. Each key will represent a filter mode (e.g., `IMAGE`, `PDF`) and the value will be an object containing:
        *   `extensions`: An array of file extensions (e.g., `['jpg', 'jpeg', 'png', 'gif']`).
        *   `icon`: The Material Icon name (e.g., `'image'`).
        *   `labelKey`: The `messages.json` key for the button label (e.g., `'button_filter_images'`).
    *   This centralized configuration will make adding or modifying filters in the future much easier.
2.  **Update `SELECTORS` in `src/modules/constants.js`:**
    *   Add `attachmentRow: 'div.brd'` to easily select the container of all attachment chips.
    *   Confirm `attachmentChip: 'div.brc'` and `attachmentChipTitle: 'span.brg'` are correct based on the provided HTML.

### Phase 2: Internationalisation (i18n)

1.  **Update `src/_locales/en/messages.json`:**
    *   Add the new button labels as specified in the "UI/UX Requirements" section.
    *   For each new filter, add a corresponding message:
        *   `"button_filter_images": { "message": "Images Only" }`
        *   `"button_filter_pdfs": { "message": "PDFs Only" }`
        *   `"button_filter_documents": { "message": "Documents Only" }`
        *   `"button_filter_spreadsheets": { "message": "Spreadsheets Only" }`
        *   `"button_filter_presentations": { "message": "Presentations Only" }`

### Phase 3: Toolbar UI Generation

1.  **Modify `src/modules/toolbar.js`:**
    *   Refactor the `createToolbar` function to dynamically generate the new filter buttons.
    *   It will import `ATTACHMENT_TYPE_CONFIG` from `constants.js`.
    *   It will iterate over the `ATTACHMENT_TYPE_CONFIG` object. For each entry, it will create a new button element.
    *   The button's `id` will be derived from the key (e.g., `filter-IMAGE`).
    *   The button's text content (the icon) will be set to the `icon` value.
    *   The button's `title` and `aria-label` will be set using `chrome.i18n.getMessage(labelKey)`.
    *   The new buttons will be appended to the toolbar in the correct order.

### Phase 4: Core Filtering Logic

1.  **Create `src/modules/filter.js` (if it doesn't exist) or update it:**
    *   This file will contain the core logic for filtering emails.
2.  **Implement `hasSpecificAttachmentType(row, attachmentType)`:**
    *   This function will take an email row element and an `attachmentType` (e.g., `'IMAGE'`) as arguments.
    *   It will query for all attachment chips within the row using `row.querySelectorAll(SELECTORS.attachmentChip)`.
    *   It will retrieve the list of target file extensions from `ATTACHMENT_TYPE_CONFIG[attachmentType].extensions`.
    *   It will iterate through each chip:
        *   It will get the filename primarily from the `title` attribute of the chip (`div.brc`).
        *   As a fallback, it will use the `textContent` of the `span.brg` element.
        *   It will extract the file extension from the filename.
        *   It will check if the extracted extension is present in the target extensions array.
        *   It will also check the `data-tooltip` attribute for Google Drive file types.
        *   If a match is found, the function will return `true` immediately.
    *   If the loop completes without finding a match, it will return `false`.
3.  **Update `applyFilter(mode)`:**
    *   The `applyFilter` function will be modified to handle the new filter modes.
    *   It will use a `switch` statement or `if/else if` chain to check the `mode`.
    *   For the new attachment filter modes, it will first check if the row has any attachments at all using the existing `hasAttachmentRow` logic.
    *   If it does, it will then call `hasSpecificAttachmentType(row, mode)` to determine if it matches the specific filter.
    *   The row's visibility will be toggled based on the return values of these functions.

### Phase 5: State Management

1.  **Update `src/modules/state.js`:**
    *   The `FILTER_MODES` constant will be updated to include the new filter modes (e.g., `IMAGE`, `PDF`, etc.).
    *   The initial state setup in `background.js` does not need to change, as the default filter is `ALL`.

### Phase 6: Testing

1.  **Update `tests/filter.test.js`:**
    *   Add a new `describe` block for `hasSpecificAttachmentType`.
    *   Create mock email row elements based on the HTML provided.
    *   Write individual `it` blocks to test each file extension for each category (e.g., a test for `.jpg`, a test for `.png`, etc.).
    *   Write tests for Google Drive file types based on `data-tooltip`.
    *   Write tests to ensure that a row with multiple attachments is correctly identified if at least one attachment matches the filter.
    *   Write tests to ensure that the function returns `false` for rows with no attachments or with non-matching attachments.
2.  **Update `tests/toolbar.test.js`:**
    *   Add tests to verify that the new buttons are created and appended to the toolbar correctly.
    *   Mock `chrome.i18n.getMessage` to ensure the correct labels are being applied.

### Phase 7: Final Integration and Review

1.  **Review all changes:**
    *   Ensure all new code adheres to the project's coding style and conventions.
    *   Manually test the extension in a browser to confirm all functionality works as expected.
    *   Run `npm test` and `npm run lint` to ensure all checks pass.
    *   Update the `CHANGELOG.md` file.

## 8. Future Considerations

*   **Google Drive Attachments:** The current plan relies on `data-tooltip` to identify Google Drive files. This needs to be robustly tested to ensure it covers all cases and is resilient to potential UI changes by Google. The distinction between a "linked" Google Drive file and a "true" attachment is a critical edge case.
*   **Custom Filters:** In a future release, we could allow users to define their own custom attachment filters (e.g., "Audio Files" with `.mp3`, `.wav`). The modular design of this feature should facilitate such an extension.
*   **Filter by Size:** Another potential enhancement is to filter attachments by size (e.g., "> 5MB"). This would require a more complex DOM analysis.

---
**End of Document**