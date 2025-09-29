/**
 * Extracts the extension ID from a loaded service worker.
 * @param {BrowserContext} context - Browser context with extension loaded
 * @returns {Promise<string>} Extension ID
 */
export async function getExtensionId(context) {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const url = serviceWorker.url();
  const extensionId = url.split('/')[2];
  return extensionId;
}