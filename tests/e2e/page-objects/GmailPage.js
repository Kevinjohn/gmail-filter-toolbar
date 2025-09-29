/**
 * Page Object Model for Gmail pages with extension toolbar.
 */
export class GmailPage {
  constructor(page) {
    this.page = page;
    this.url = 'https://mail.google.com/mail/u/0/#inbox';
  }

  // Navigation
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForSelector('.gcal-filter-bar');
  }

  // Element getters
  get toolbar() {
    return this.page.locator('.gcal-filter-bar');
  }

  get allButton() {
    return this.page.locator('#filter-ALL');
  }

  get emailButton() {
    return this.page.locator('#filter-EMAIL');
  }

  get calendarButton() {
    return this.page.locator('#filter-CALENDAR');
  }

  get attachmentButton() {
    return this.page.locator('#filter-ATTACH');
  }

  get favouritesButton() {
    return this.page.locator('#filter-FAVOURITES');
  }

  // Row getters by test ID
  getRow(testId) {
    return this.page.locator(`tr[data-testid="${testId}"]`);
  }

  get mailRow() {
    return this.getRow('row-mail');
  }

  get calendarRow() {
    return this.getRow('row-calendar');
  }

  get attachmentRow() {
    return this.getRow('row-attachment');
  }

  get favouriteRow() {
    return this.getRow('row-favourite');
  }

  get imageRow() {
    return this.getRow('row-image');
  }

  // Actions
  async setDirection(direction) {
    await this.page.evaluate((dir) => {
      document.body.setAttribute('dir', dir);
    }, direction);
  }

  async setLocaleSpecificTooltips() {
    await this.page.evaluate(() => {
      const favouriteTooltip = chrome.i18n.getMessage('alt_starred');
      const favourite = document.querySelector('tr[data-testid="row-favourite"] span[data-tooltip]');
      if (favourite && favouriteTooltip) {
        favourite.setAttribute('data-tooltip', favouriteTooltip);
      }
    });
  }

  /**
   * Gets computed display style and hidden attribute for a row.
   * @param {string} testId - data-testid value
   * @returns {Promise<{display: string, hidden: boolean}>}
   */
  async getRowVisibility(testId) {
    return this.page.locator(`tr[data-testid="${testId}"]`).evaluate((row) => {
      return {
        display: getComputedStyle(row).display,
        hidden: row.hidden,
      };
    });
  }

  /**
   * Gets the button order from the toolbar.
   * @returns {Promise<string[]>} Array of mode names (e.g., ['ALL', 'EMAIL', ...])
   */
  async getButtonOrder() {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll('.gcal-btn-group button[data-mode]')).map(
        (btn) => btn.dataset.mode
      )
    );
  }

  /**
   * Checks if toolbar buttons wrap to multiple lines.
   * @returns {Promise<boolean>}
   */
  async toolbarWraps() {
    return this.page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('.gcal-btn-group button[role="radio"]')
      );
      const topOffsets = buttons.map((btn) => btn.getBoundingClientRect().top);
      return new Set(topOffsets.map((value) => Math.round(value))).size > 1;
    });
  }
}