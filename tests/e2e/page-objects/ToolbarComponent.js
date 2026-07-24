/**
 * Component-level assertions for the Gmail toolbar.
 */
export class ToolbarComponent {
  constructor(toolbar) {
    this.toolbar = toolbar;
  }

  /**
   * Asserts the toolbar has a specific alignment class.
   * @param {string} alignment - 'start' or 'center'
   */
  async assertAlignment(alignment) {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).toHaveClass(new RegExp(`gcal-align-${alignment}`));
  }

  /**
   * Asserts the toolbar shows icons only (no text).
   */
  async assertIconOnly() {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).toHaveClass(/show-icon-only/);
  }

  /**
   * Asserts the toolbar shows both icons and text.
   */
  async assertIconAndText() {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).not.toHaveClass(/show-icon-only/);
  }

  /**
   * Asserts the button order matches the expected sequence.
   * @param {string[]} expectedOrder - Array of mode names
   * @param {Function} getButtonOrderFn - Function that returns button order
   */
  async assertButtonOrder(expectedOrder, getButtonOrderFn) {
    const { expect } = await import('@playwright/test');
    const actualOrder = await getButtonOrderFn();
    const baseOrder = actualOrder.slice(0, expectedOrder.length);
    expect(baseOrder).toEqual(expectedOrder);
  }
}
