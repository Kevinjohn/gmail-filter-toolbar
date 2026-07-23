/**
 * Page Object Model for the extension's options page.
 */
export class OptionsPage {
  constructor(page, extensionId) {
    this.page = page;
    this.extensionId = extensionId;
    this.url = `chrome-extension://${extensionId}/options.html`;
  }

  // Navigation
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForSelector('#alignment-select');
  }

  // Element getters
  get alignmentSelect() {
    return this.page.locator('#alignment-select');
  }

  get showFavouritesCheckbox() {
    return this.page.locator('#show-favourites-checkbox');
  }

  get showButtonTextCheckbox() {
    return this.page.locator('#show-button-text-checkbox');
  }

  get themeSelect() {
    return this.page.locator('#theme-select');
  }

  get debugCheckbox() {
    return this.page.locator('#debug');
  }

  get pageTitle() {
    return this.page.locator('#pageTitle');
  }

  get debugLegend() {
    return this.page.locator('#debugLegend');
  }

  get alignmentLegend() {
    return this.page.locator('#alignmentLegend');
  }

  get showFavouritesLabel() {
    return this.page.locator('#showFavouritesLabel');
  }

  // Actions
  async setAlignment(alignment) {
    await this.alignmentSelect.selectOption(alignment);
  }

  async enableFavourites() {
    await this.showFavouritesCheckbox.check();
  }

  async disableFavourites() {
    await this.showFavouritesCheckbox.uncheck();
  }

  async showButtonText() {
    await this.showButtonTextCheckbox.check();
  }

  async hideButtonText() {
    await this.showButtonTextCheckbox.uncheck();
  }

  async setTheme(theme) {
    await this.themeSelect.selectOption(theme);
  }

  async enableDebug() {
    await this.debugCheckbox.check();
  }

  async disableDebug() {
    await this.debugCheckbox.uncheck();
  }

  async waitForStorageValue(key, expected) {
    await this.page.waitForFunction(
      async ({ storageKey, expectedValue }) => {
        const stored = await chrome.storage.sync.get(storageKey);
        return stored[storageKey] === expectedValue;
      },
      { storageKey: key, expectedValue: expected },
    );
  }
}
