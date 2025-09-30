import { expect } from '@playwright/test';

/**
 * Custom matcher: Asserts a chrome.storage.sync key has a specific value.
 * Usage: await expect(page).toHaveStorageValue('debugOn', true);
 */
expect.extend({
  async toHaveStorageValue(page, key, expectedValue) {
    const actualValue = await page.evaluate((key) => {
      return new Promise((resolve) => {
        chrome.storage.sync.get([key], (result) => {
          resolve(result[key]);
        });
      });
    }, key);

    const pass = JSON.stringify(actualValue) === JSON.stringify(expectedValue);

    if (pass) {
      return {
        message: () => `Expected storage key "${key}" not to have value ${JSON.stringify(expectedValue)}, but it does`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected storage key "${key}" to have value ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher: Asserts an element has a specific ARIA attribute value.
   * Usage: await expect(button).toHaveARIAState('checked', 'true');
   */
  async toHaveARIAState(locator, attribute, expectedValue) {
    const actualValue = await locator.getAttribute(`aria-${attribute}`);
    const pass = actualValue === expectedValue;

    if (pass) {
      return {
        message: () => `Expected aria-${attribute} not to be "${expectedValue}", but it is`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected aria-${attribute} to be "${expectedValue}", but got "${actualValue}"`,
        pass: false,
      };
    }
  },
});