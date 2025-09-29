/**
 * Waits for a specific key in chrome.storage.sync to have a specific value.
 * @param {Page} page - Playwright page object
 * @param {string} key - Storage key to check
 * @param {*} expectedValue - Expected value (will use JSON.stringify for comparison)
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 */
export async function waitForStorageValue(page, key, expectedValue, timeout = 5000) {
  await page.waitForFunction(
    ({ key, expectedValue }) => {
      return new Promise((resolve) => {
        chrome.storage.sync.get([key], (result) => {
          const matches = JSON.stringify(result[key]) === JSON.stringify(expectedValue);
          resolve(matches);
        });
      });
    },
    { key, expectedValue },
    { timeout }
  );
}

/**
 * Gets the current value from chrome.storage.sync.
 * @param {Page} page - Playwright page object
 * @param {string} key - Storage key to retrieve
 * @returns {Promise<*>} The stored value
 */
export async function getStorageValue(page, key) {
  return page.evaluate((key) => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }, key);
}