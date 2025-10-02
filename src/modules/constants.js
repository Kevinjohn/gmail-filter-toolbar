/**
 * Storage key for button text visibility preference.
 * @stable
 */
export const SHOW_BUTTON_TEXT_KEY = 'showButtonText';

/**
 * Storage key for favourites button visibility.
 * @stable
 */
export const SHOW_FAVOURITES_KEY = 'showFavourites';

/**
 * Storage key for AI & Transcription button visibility.
 * @experimental
 * @since 2.3.0
 */
export const SHOW_AI_NOTETAKERS_KEY = 'showAiNotetakers';

/**
 * Storage key for toolbar alignment preference.
 * @stable
 */
export const ALIGNMENT_KEY = 'toolbarAlignment';

/**
 * Storage key for theme preference.
 * @stable
 */
export const THEME_KEY = 'gmailCalTheme';

/**
 * Theme options enum.
 * @stable
 */
export const THEMES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Toolbar alignment options enum.
 * @stable
 */
export const ALIGNMENTS = {
  START: 'start',
  CENTER: 'center',
};

/**
 * Configuration for different attachment types.
 * Each key represents a filter mode.
 * - extensions: List of file extensions for standard attachments.
 * - gdriveIdentifier: String to identify Google Drive file types from the icon src.
 * - icon: Material Icon name for the filter button.
 * - labelKey: i18n message key for the button's label.
 * @stable
 */
export const ATTACHMENT_TYPE_CONFIG = {
  IMAGE: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    gdriveIdentifier: 'icon_1_image',
    icon: 'image',
    labelKey: 'button_filter_images',
  },
  PDF: {
    extensions: ['pdf'],
    gdriveIdentifier: 'icon_1_pdf',
    icon: 'picture_as_pdf',
    labelKey: 'button_filter_pdfs',
  },
  DOCUMENT: {
    extensions: ['doc', 'docx', 'rtf', 'txt', 'odt'],
    gdriveIdentifier: 'icon_1_document',
    icon: 'article',
    labelKey: 'button_filter_documents',
  },
  SPREADSHEET: {
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    gdriveIdentifier: 'icon_1_spreadsheet',
    icon: 'assessment',
    labelKey: 'button_filter_spreadsheets',
  },
  PRESENTATION: {
    extensions: ['ppt', 'pptx', 'odp'],
    gdriveIdentifier: 'icon_1_presentation',
    icon: 'slideshow',
    labelKey: 'button_filter_presentations',
  },
};

/**
 * Regex patterns to match AI services and transcription tools.
 * Patterns are case-insensitive and match against sender display name.
 * @experimental
 * @since 2.3.0
 */
export const AI_NOTETAKER_PATTERNS = [
  /gemini/i,         // Google Gemini AI
  /chatgpt/i,        // OpenAI ChatGPT
  /claude/i,         // Anthropic Claude
  /copilot/i,        // Microsoft Copilot
  /otter\.ai/i,      // Otter.ai transcription service
  /fathom/i,         // Fathom video transcription
  /fireflies\.ai/i,  // Fireflies.ai transcription service
];

/**
 * DOM selectors for Gmail elements.
 * @stable
 */
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
   * Selector for the container of all attachments in a row.
   * Note: A fallback to the second div in the parent td may be needed.
   */
  attachmentRow: 'div.brd',
  /**
   * Selector for an individual attachment "chip" within an attachment row.
   */
  attachmentChip: 'div.brc',
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
  /**
   * Selector for the sender name element within an email row.
   * Targets the span containing the sender's display name.
   * @experimental - Used by AI & Transcription filter
   */
  senderName: '.yW span.zF[name]',
};
