# PRD: Documentation Improvements

## What we're trying to achieve

This section aims to enhance the project's documentation by providing clear guidance on maintaining selectors and improving the clarity of existing selectors within the code. This will make the project easier to understand and maintain for future developers, especially when Gmail's DOM structure changes.

## Detailed Task List

### Task 1.1: Add update strategy

#### Sub-task 1.1.1: In `README.md`, insert a new `## Update Strategy` section immediately after the `## Project Structure` heading explaining how to maintain selectors when Gmail changes its DOM.

1.  **Action:** Open the `README.md` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/README.md`
    *   **Code Change:** Locate the line `## Project Structure` and insert the new section immediately after it.

        ```markdown
        ## Project Structure

        ```
        src/
        ├─ background.js          # MV3 service worker
        ├─ contentScript.js       # injects toolbar & filters rows
        ├─ styles.css             # toolbar styling
        ├─ colours.css            # light/dark/high-contrast theme variables
        ├─ options.html           # debug-mode checkbox
        ├─ icons/                 # 16 / 32 / 48 / 128 px PNGs (for extension icon)
        └─ manifest.json          # extension manifest (MV3)

        _locales/                 # message bundles for i18n
        tests/                    # Jest unit tests
        dist/                     # build output (ignored in Git)
        docs/                     # screenshots & diagrams
        ```

        ## Update Strategy

        Gmail's user interface (UI) is dynamic and can change without notice. This extension relies on specific DOM selectors to inject its toolbar and filter email rows. If the extension stops working after a Gmail update, it's likely that one or more of these selectors have changed.

        To update the selectors:

        1.  **Inspect Gmail's DOM:** Open Gmail in your browser, right-click on the element that is no longer being targeted correctly (e.g., the main toolbar, an email row, or an attachment icon), and select "Inspect" or "Inspect Element".
        2.  **Identify New Selectors:** In the browser's developer tools, examine the HTML structure around the element. Look for unique `id` attributes, `class` names, or `data-*` attributes that are stable and unlikely to change frequently.
        3.  **Update `src/modules/constants.js`:** Open `src/modules/constants.js` and update the corresponding selector string in the `SELECTORS` object with the new, identified selector.
        4.  **Test:** Rebuild the extension (`npm run build`) and load it unpacked in Chrome (`chrome://extensions`). Verify that the functionality is restored.
        5.  **Consider Alternatives:** If a selector proves to be highly unstable, consider alternative approaches such as using `MutationObserver` to detect structural changes or relying on more general, less specific selectors combined with content analysis.

        ---

        ## How It Works
        ```

    *   **Verification:** After the change, open `README.md` and confirm that the "Update Strategy" section is present and correctly positioned after "Project Structure".
[x]

### Task 1.2: Annotate selectors

#### Sub-task 1.2.1: In `src/modules/constants.js`, add a comment above each property of the `SELECTORS` object stating the Gmail element or attribute it refers to.

1.  **Action:** Open the `src/modules/constants.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/constants.js`
    *   **Code Change:** Add JSDoc-style comments above each property in the `SELECTORS` object.

        ```javascript
        export const SELECTORS = {
          /**
           * Selector for the primary Gmail toolbar (newer versions).
           * Targets the main action bar where buttons like "Archive", "Report spam" are located.
           */
          gmailToolbar: '.G-atb .G6[role="toolbar"]',
          /**
           * Selector for the Gmail toolbar (older versions/fallback).
           * Targets the main action bar where buttons like "Archive", "Report spam" are located.
           */
          gmailToolbarLegacy: '.G-atb[role="toolbar"]',
          /**
           * Selector for the Gmail toolbar using ARIA label (alternative fallback).
           * Targets the main action bar where buttons like "Archive", "Report spam" are located.
           */
          gmailToolbarAria: 'div[aria-label="Main toolbar"]',
          /**
           * Selector for the header element containing the Gmail toolbar.
           * This is typically the parent container that wraps the toolbar.
           */
          gmailToolbarHeader: '.aeH',
          /**
           * Selector for individual email rows in the Gmail message list.
           * Targets the `<tr>` elements that represent each email in the inbox.
           */
          emailRow: '.UI tr.zA',
          /**
           * Selector for the email subject line within an email row.
           * Targets the element displaying the subject of an email.
           */
          emailSubject: '.bog',
          /**
           * Selector for the main email list container.
           * This is the `div` element that holds all the email rows.
           */
          emailList: '.UI',
          /**
           * Selector for the attachment icon within an email row.
           * Targets the `img` element that indicates an email has an attachment.
           */
          attachmentIcon: 'img.aSK',
          /**
           * CSS class applied to email rows that have attachments.
           * This class is used by Gmail to style rows with attachments.
           */
          attachmentRowClass: 'byw',
          /**
           * Selector for the tooltip indicating an email has an attachment.
           * Targets elements with a `data-tooltip` attribute set to "Has attachment".
           */
          attachmentTooltip: '[data-tooltip="Has attachment"]',
          /**
           * Selector for the image indicating an ICS (calendar) attachment.
           * Targets `img` elements whose `alt` attribute contains ".ics".
           */
          icsImage: 'img[alt*=".ics"]',
          /**
           * Selector for the custom filter bar injected by the extension.
           * This is the main container for the extension's toolbar.
           */
          filterBar: '.gcal-filter-bar',
          /**
           * Selector for the wrapper element around the custom filter bar.
           * This element helps with positioning the toolbar within Gmail's UI.
           */
          filterWrapper: '.gcal-filter-wrapper',
          /**
           * Selector for the filter buttons within the custom toolbar.
           * Targets all buttons that have a `data-mode` attribute.
           */
          filterButtons: '.gcal-filter-bar button[data-mode]',
          /**
           * Selector for the ARIA live region used for accessibility announcements.
           * This region is used to announce filter status updates to screen readers.
           */
          liveRegion: '.gcal-live-region',
        };
        ```

    *   **Verification:** After the change, open `src/modules/constants.js` and confirm that each property in the `SELECTORS` object has a descriptive comment above it.
[x]
