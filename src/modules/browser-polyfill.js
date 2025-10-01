/**
 * Lightweight browser API polyfill
 * Ensures chrome.* APIs work consistently across Chrome and Firefox
 *
 * Firefox supports chrome.* namespace natively, but this provides
 * a safety net for future API changes.
 */

// Firefox natively supports chrome.* so this is mostly a no-op
// but provides a safety layer for future compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export default browserAPI;
