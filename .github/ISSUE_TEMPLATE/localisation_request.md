---
name: Localisation Request
about: Contribute translations for a new language
labels: 'localisation, enhancement'
assignees: ''
---

## Language

**Language Name:** [e.g., French, German, Spanish]
**Locale Code:** [e.g., fr, de, es]

---

## Translation Method

Please choose one of the following methods to contribute:

### Option 1: Pull Request (Preferred)

1.  **Copy the `en` messages:** Make a copy of the file at `src/_locales/en/messages.json`.
2.  **Create a new locale folder:** Create a new folder under `src/_locales/` named with the new **Locale Code** (e.g., `src/_locales/fr/`).
3.  **Add the new file:** Place your copied `messages.json` inside the new folder.
4.  **Translate the values:** In your new `messages.json` file, translate the `"message"` value for each key. Do not change the key names.
5.  **Submit a Pull Request:** Create a pull request with your changes.

### Option 2: Issue Submission

If you are not comfortable with creating a pull request, please provide the translations below. Copy the following template for each key-value pair from `src/_locales/en/messages.json`.

```json
{
  "extension_name": {
    "message": "YOUR TRANSLATION HERE"
  },
  "extension_description": {
    "message": "YOUR TRANSLATION HERE"
  },
  "label_toolbar": {
    "message": "YOUR TRANSLATION HERE"
  },
  "label_options": {
    "message": "YOUR TRANSLATION HERE"
  },
  "btn_all": {
    "message": "YOUR TRANSLATION HERE"
  },
  "btn_mail": {
    "message": "YOUR TRANSLATION HERE"
  },
  "btn_cal": {
    "message": "YOUR TRANSLATION HERE"
  },
  "btn_attach": {
    "message": "YOUR TRANSLATION HERE"
  },
  "btn_fav": {
    "message": "YOUR TRANSLATION HERE"
  },
  "page_title": {
    "message": "YOUR TRANSLATION HERE"
  },
  "options_debug": {
    "message": "YOUR TRANSLATION HERE"
  },
  "options_page_description": {
    "message": "YOUR TRANSLATION HERE"
  },
  "options_debug_legend": {
    "message": "YOUR TRANSLATION HERE"
  },
  "options_debug_label": {
    "message": "YOUR TRANSLATION HERE"
  },
  "alt_calendar_event": {
    "message": "YOUR TRANSLATION HERE"
  },
  "filter_status_update": {
    "message": "YOUR TRANSLATION HERE"
  },
  "extension_action_title": {
    "message": "YOUR TRANSLATION HERE"
  },
  "alt_starred": {
    "message": "YOUR TRANSLATION HERE"
  }
}
```

## Additional Context

Add any other context or notes about the translation here.
