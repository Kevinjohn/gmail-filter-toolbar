# Options Page Problem Solving

This document outlines the common issues encountered and their solutions during the development and integration of the options page for the Gmail Calendar Options extension.

## 1. Content Security Policy (CSP) Violations

**Problem:** Inline `<style>` blocks in `options.html` cause CSP violations, preventing the extension from loading or functioning correctly.

**Solution:** Extract all CSS rules from inline `<style>` tags into a new external CSS file (e.g., `options.css`). Link this external stylesheet in `options.html` using a `<link>` tag.

**Steps:**
1. Create `src/options.css`.
2. Move CSS rules from `<style>` block in `src/options.html` to `src/options.css`.
3. Replace the `<style>` block in `src/options.html` with `<link rel="stylesheet" href="options.css" />`.
4. Update `vite.config.mjs` to ensure `options.css` is copied to the `dist` directory during the build process.

## 2. Localization Issues (`__MSG_...__` placeholders)

**Problem:** `__MSG_...__` placeholders in `options.html` are not correctly replaced with localized strings, or the associated JavaScript logic fails to retrieve them.

**Solution:** Ensure that the HTML elements intended to display localized messages have unique IDs, and that `chrome.i18n.getMessage()` is explicitly called in `options.js` to set their `textContent`.

**Steps:**
1. Add a unique `id` attribute to the HTML element (e.g., `<label id="myLabel">`).
2. In `src/modules/options.js`, use `document.getElementById('myLabel').textContent = chrome.i18n.getMessage('your_message_key');`.
3. Verify that the message key exists in all `src/_locales/*/messages.json` files.

## 3. JavaScript Module Loading Errors (`Uncaught SyntaxError: Cannot use import statement outside a module`)

**Problem:** When `options.js` uses `import` statements, the browser throws a `SyntaxError` because it's not treated as a JavaScript module.

**Solution:** Explicitly declare `options.js` as a module in `options.html` by adding `type="module"` to its `<script>` tag.

**Steps:**
1. In `src/options.html`, change `<script src="modules/options.js"></script>` to `<script type="module" src="modules/options.js"></script>`.

## 4. Missing JavaScript or CSS Files in Build Output

**Problem:** After making changes, the extension fails to load or function because `options.js`, `options.css`, or their dependencies (like `constants.js`) are not present in the `dist` directory.

**Solution:** Update `vite.config.mjs` to ensure all necessary files are copied to the correct locations in the `dist` directory.

**Steps:**
1. Review `vite.config.mjs` under the `viteStaticCopy` plugin's `targets` array.
2. Add entries for any missing files or directories, ensuring the `dest` path matches the expected structure (e.g., `{ src: 'src/options.css', dest: '.' }`, `{ src: 'src/modules/options.js', dest: 'modules' }`, `{ src: 'src/modules/constants.js', dest: 'modules' }`).
3. Rebuild the project (`npm run build`) after modifying `vite.config.mjs`.
