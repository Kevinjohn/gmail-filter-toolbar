export const SELECTORS = {
  /**
   * Selector for the primary Gmail toolbar (newer versions).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbar: '.G-atb .G6[role="toolbar"]',
  /**
   * Selector for the Gmail toolbar (older versions/fallback).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbarLegacy: '.G-atb[role="toolbar"]',
  /**
   * Selector for the Gmail toolbar using ARIA label (alternative fallback).
   * Targets the main action bar where buttons like "Archive", "Report spam" are located.
   */
  gmailToolbarAria: 'div[aria-label="Main toolbar"]',
  /**
   * Selector for the header element containing the Gmail toolbar.
   * This is typically the parent container that wraps the toolbar.
   */
  gmailToolbarHeader: '.aeH',
  /**
   * Selector for individual email rows in the Gmail message list.
   * Targets the `<tr>` elements that represent each email in the inbox.
   */
  emailRow: '.UI tr.zA',
  /**
   * Selector for the email subject line within an email row.
   * Targets the element displaying the subject of an email.
   */
  emailSubject: '.bog',
  /**
   * Selector for the main email list container.
   * This is the `div` element that holds all the email rows.
   */
  emailList: '.UI',
  /**
   * Selector for the attachment icon within an email row.
   * Targets the `img` element that indicates an email has an attachment.
   */
  attachmentIcon: 'img.aSK',
  /**
   * CSS class applied to email rows that have attachments.
   * This class is used by Gmail to style rows with attachments.
   */
  attachmentRowClass: 'byw',
  /**
   * Selector for the tooltip indicating an email has an attachment.
   * Targets elements with a `data-tooltip` attribute set to "Has attachment".
   */
  attachmentTooltip: '[data-tooltip="Has attachment"]',
  /**
   * Selector for the image indicating an ICS (calendar) attachment.
   * Targets `img` elements whose `alt` attribute contains ".ics".
   */
  icsImage: 'img[alt*=".ics"]',
  /**
   * Selector for the custom filter bar injected by the extension.
   * This is the main container for the extension's toolbar.
   */
  filterBar: '.gcal-filter-bar',
  /**
   * Selector for the wrapper element around the custom filter bar.
   * This element helps with positioning the toolbar within Gmail's UI.
   */
  filterWrapper: '.gcal-filter-wrapper',
  /**
   * Selector for the filter buttons within the custom toolbar.
   * Targets all buttons that have a `data-mode` attribute.
   */
  filterButtons: '.gcal-filter-bar button[data-mode]',
  /**
   * Selector for the ARIA live region used for accessibility announcements.
   * This region is used to announce filter status updates to screen readers.
   */
  liveRegion: '.gcal-live-region',
};
