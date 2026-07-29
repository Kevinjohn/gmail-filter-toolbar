import { test, expect } from './fixtures/extension.js';

/**
 * WHY: AGENTS.md requires a Playwright spec whenever a feature crosses background, content, or UI
 * boundaries. Clicking the real browser-action icon is not something Playwright can drive, so this
 * spec pins the three conditions that make the click work, against the loaded extension rather than
 * a mock: the manifest declares an action with no popup (a popup suppresses onClicked entirely), the
 * service worker actually registered an onClicked listener, and openOptionsPage opens the page.
 */
test.describe('Toolbar icon action', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  const getServiceWorker = async (context) => {
    const [existing] = context.serviceWorkers();
    return existing ?? (await context.waitForEvent('serviceworker'));
  };

  test('declares a popup-free action so onClicked can fire', async ({ context }) => {
    const serviceWorker = await getServiceWorker(context);

    const action = await serviceWorker.evaluate(() => chrome.runtime.getManifest().action ?? null);

    expect(action).not.toBeNull();
    // A default_popup would make Chrome open the popup and never dispatch onClicked, silently
    // turning the toolbar icon back into a dead click.
    expect(action.default_popup).toBeUndefined();
  });

  test('registers an onClicked listener in the service worker', async ({ context }) => {
    const serviceWorker = await getServiceWorker(context);

    const hasListener = await serviceWorker.evaluate(() => chrome.action.onClicked.hasListeners());

    expect(hasListener).toBe(true);
  });

  test("opens this extension's options page", async ({ context, extensionId }) => {
    const serviceWorker = await getServiceWorker(context);

    await serviceWorker.evaluate(() => chrome.runtime.openOptionsPage());

    // WHY poll rather than waitForEvent('page'): with options_ui.open_in_tab false, Chrome does not
    // open a page at options.html. It navigates to chrome://extensions/?options=<id> and embeds the
    // options document in an iframe, so the observable proof that the call routed to this extension
    // is that query parameter.
    await expect
      .poll(() => context.pages().map((candidate) => candidate.url()))
      .toContain(`chrome://extensions/?options=${extensionId}`);
  });
});
