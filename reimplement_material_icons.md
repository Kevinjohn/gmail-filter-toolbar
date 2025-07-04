# PRD: Re-implement Material Icons

## 1. Background

To improve the user experience and provide clearer visual cues, we will re-integrate Material Icons into the toolbar buttons. This effort follows a code rollback and aims to implement the feature in a clean, robust, and maintainable way, avoiding the issues that arose previously. The icons will be self-hosted within the extension package to ensure they work offline and are not dependent on external services.

## 2. Requirements

*   **Visual Style:** Use the "Outlined" style of the Material Symbols font.
*   **Functionality:**
    *   Each filter button in the toolbar must display an appropriate icon next to its text label.
    *   The implementation must not rely on `innerHTML` for DOM manipulation to ensure security and testability.
    *   The icon font and its corresponding CSS must be bundled with the extension.
    *   The icon CSS will be injected dynamically by the content script to ensure proper loading.
*   **Technical:**
    *   The solution must be compatible with the Vite build process.
    *   The final implementation must pass all existing and new tests.

## 3. Out of Scope

*   Adding icons to any other part of the extension (e.g., options page).
*   Using other icon sets or styles (e.g., Font Awesome, Material Symbols "Rounded").

---

## Actionable Implementation Plan

This is a low-level, step-by-step guide to re-implementing the feature.

### Task 1: Prepare Local Assets

1.  **Create Directories:** Create a new directory structure within the `src` folder: `src/assets/fonts/` and `src/assets/css/`.
2.  **Download Font Files:** Download the **Material Symbols Outlined** font files (specifically the `.woff2` format) and place them into `src/assets/fonts/`.
3.  **Create Font CSS:** Create a new file at `src/assets/css/material-symbols.css`. In this file, define the `@font-face` rule to load the local font files.
    ```css
    @font-face {
      font-family: 'Material Symbols Outlined';
      font-style: normal;
      font-weight: 400;
      src: url('../fonts/MaterialSymbolsOutlined.woff2') format('woff2');
    }
    ```

### Task 2: Configure Build and Manifest

1.  **Update Vite Config:** Edit `vite.config.mjs` to ensure the entire `src/assets/` directory is copied to the `dist` folder during the build. This can be done using `vite-plugin-copy`.
2.  **Update Manifest:** Edit `src/manifest.json`. Add the asset paths to `web_accessible_resources` to make them available to the content script.
    ```json
    "web_accessible_resources": [
      {
        "resources": [
          "assets/css/material-symbols.css",
          "assets/fonts/MaterialSymbolsOutlined.woff2"
        ],
        "matches": [
          "https://mail.google.com/*"
        ]
      }
    ]
    ```

### Task 3: Implement CSS and Dynamic Injection

1.  **Inject CSS Dynamically:** In `src/contentScript.js`, create a utility function to inject a CSS file into the document's head.
    ```javascript
    function injectCss(filePath) {
      const link = document.createElement('link');
      link.href = chrome.runtime.getURL(filePath);
      link.type = 'text/css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    ```
2.  **Call Injector:** At the start of the `main()` function in `contentScript.js`, call the new function: `injectCss('assets/css/material-symbols.css');`.
3.  **Update Component Styles:** In `src/styles.css`, add the necessary styles to align the icon and text within the buttons.
    ```css
    /* Define the icon font styles */
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 20px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
      margin-inline-end: 4px; /* Space between icon and text */
    }

    /* Update button styles for flex layout */
    .gcal-btn-group button {
      display: flex;
      align-items: center;
    }
    ```

### Task 4: Update Toolbar Creation Logic

1.  **Modify Button Creation:** In `src/modules/toolbar.js`, update the `createFilterButton` (or equivalent) function.
2.  **Use DOM Elements:** Instead of setting `button.textContent`, create and append child elements for the icon and the text label.
    ```javascript
    // Example for a single button
    const button = document.createElement('button');
    // ... set attributes ...

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'calendar_month'; // Or 'attachment', etc.

    const label = document.createElement('span');
    label.className = 'text-label';
    label.textContent = 'Button Text';

    button.appendChild(icon);
    button.appendChild(label);
    ```

### Task 5: Verification

1.  **Build:** Run `npm run build` and ensure there are no errors and that the assets are copied to `dist/assets`.
2.  **Test in Browser:** Load the unpacked extension in Chrome and navigate to Gmail. Verify that the icons appear correctly on the buttons and that all functionality works as expected.
3.  **Run Automated Tests:** Run `npm test` to ensure no existing tests have been broken by the changes.
