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

If you are not comfortable creating a pull request, download the current
[`src/_locales/en/messages.json`](https://github.com/Kevinjohn/gmail-filter-toolbar/blob/main/src/_locales/en/messages.json), translate every `message`
value without changing its keys or placeholders, and attach the complete translated file here.
Using the current base file ensures the submission includes every required message as the extension
evolves.

## Additional Context

Add any other context or notes about the translation here.
