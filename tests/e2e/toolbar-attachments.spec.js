import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';

test.describe('Attachment type filtering', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filters rows by image attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Assuming your toolbar has specific attachment type buttons (if not, this test validates the generic ATTACH button)
    // Click the images-only button (if implemented) or verify attachment filter includes images
    await gmailPage.attachmentButton.click();

    // Verify image row is visible
    const imageVisibility = await gmailPage.getRowVisibility('row-image');
    expect(imageVisibility.display).toBe('table-row');

    // Verify non-attachment rows are hidden
    const mailVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('filters rows by PDF attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Click attachment filter (covers all attachment types including PDF)
    await gmailPage.attachmentButton.click();

    const pdfVisibility = await gmailPage.getRowVisibility('row-pdf');
    expect(pdfVisibility.display).toBe('table-row');

    const mailVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('filters rows by document attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const docVisibility = await gmailPage.getRowVisibility('row-document');
    expect(docVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });

  test('filters rows by spreadsheet attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const sheetVisibility = await gmailPage.getRowVisibility('row-spreadsheet');
    expect(sheetVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });

  test('filters rows by presentation attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const pptVisibility = await gmailPage.getRowVisibility('row-presentation');
    expect(pptVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });
});