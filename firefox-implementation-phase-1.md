# Firefox Implementation - Phase 1: Manifest Adaptation

## Overview
Create a Firefox-compatible manifest file that works with Firefox's Manifest V3 implementation while maintaining Chrome compatibility.

## Prerequisites
- Understanding of JSON file structure
- Basic knowledge of browser extension manifests
- Text editor

## Duration Estimate
30-45 minutes

---

## Step 1: Create Firefox Manifest File

### 1.1 Read the Chrome Manifest
```bash
# Open and read the existing Chrome manifest
cat src/manifest.json
```

**Purpose**: Understand the current Chrome manifest structure before adapting it.

### 1.2 Create Firefox Manifest
```bash
# Copy Chrome manifest as starting point
cp src/manifest.json src/manifest.firefox.json
```

---

## Step 2: Add Firefox-Specific Settings

### 2.1 Generate a Gecko ID
Firefox requires a unique identifier. Choose ONE of these formats:

**Option A - GUID Format (Recommended)**:
```
{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
```

**Option B - Email-like Format**:
```
gmail-calendar-options@kevinjohngallagher.com
```

### 2.2 Edit `src/manifest.firefox.json`

Open the file and add the `browser_specific_settings` key **after** the `default_locale` line:

**Find this section**:
```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "1.1.1",
  "manifest_version": 3,
  "default_locale": "en",
```

**Add after `"default_locale": "en",`**:
```json
  "browser_specific_settings": {
    "gecko": {
      "id": "gmail-calendar-options@kevinjohngallagher.com",
      "strict_min_version": "121.0"
    }
  },
```

**Result should look like**:
```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "1.1.1",
  "manifest_version": 3,
  "default_locale": "en",
  "browser_specific_settings": {
    "gecko": {
      "id": "gmail-calendar-options@kevinjohngallagher.com",
      "strict_min_version": "121.0"
    }
  },
```

---

## Step 3: Adapt Background Script Configuration

Firefox doesn't fully support service workers yet. We need to declare BOTH service_worker and scripts.

### 3.1 Locate Background Section

**Find this section** in `src/manifest.firefox.json`:
```json
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
```

### 3.2 Replace with Dual Declaration

**Replace with**:
```json
  "background": {
    "service_worker": "background.js",
    "scripts": ["background.js"],
    "type": "module"
  },
```

**Why**: This allows the extension to work in both Chrome (which uses service_worker) and Firefox (which uses scripts array).

---

## Step 4: Verify Content Security Policy

Firefox has slightly different CSP handling. Review the CSP section.

### 4.1 Locate CSP Section

**Find**:
```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;",
    "sandbox": "sandbox allow-scripts; script-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; object-src 'self';"
  }
```

### 4.2 Verify Firefox Compatibility

**No changes needed** - this CSP is already compatible with Firefox. Keep as-is.

---

## Step 5: Review Host Permissions

Firefox handles host permissions differently - users must manually grant them.

### 5.1 Verify Current Settings

**Find**:
```json
  "permissions": ["storage"],
  "host_permissions": ["https://mail.google.com/*"],
```

### 5.2 No Changes Required

**Keep as-is** but note: Firefox users will see a permission prompt when first visiting Gmail.

---

## Step 6: Validation

### 6.1 Check JSON Syntax

Validate the JSON file:
```bash
# Use Node.js to validate JSON
node -e "JSON.parse(require('fs').readFileSync('src/manifest.firefox.json', 'utf8'))"
```

If no error appears, the JSON is valid.

### 6.2 Visual Comparison

Create a side-by-side comparison:
```bash
# View both manifests
diff -u src/manifest.json src/manifest.firefox.json
```

**Expected differences**:
- `+ browser_specific_settings` section added
- `+ "scripts": ["background.js"]` added to background object

---

## Step 7: Document the Gecko ID

### 7.1 Create Documentation

Create a note file:
```bash
echo "Firefox Gecko ID: gmail-calendar-options@kevinjohngallagher.com" > .firefox-gecko-id.txt
```

**Purpose**: Keep track of the ID for future reference and AMO submission.

---

## Verification Checklist

Before moving to Phase 2, verify:

- [ ] `src/manifest.firefox.json` exists
- [ ] `browser_specific_settings.gecko.id` is present
- [ ] `browser_specific_settings.gecko.strict_min_version` is set to "121.0"
- [ ] Background section has BOTH `service_worker` AND `scripts` fields
- [ ] JSON validates without syntax errors
- [ ] Gecko ID is documented in `.firefox-gecko-id.txt`

---

## Files Created/Modified

**New Files**:
- `src/manifest.firefox.json` - Firefox-specific manifest

**New Documentation**:
- `.firefox-gecko-id.txt` - Gecko ID reference

**Files NOT Modified**:
- `src/manifest.json` - Original Chrome manifest remains unchanged

---

## Next Steps

After completing Phase 1:
1. Proceed to **Phase 2: Build System Update**
2. Do NOT attempt to load the extension yet - build system updates are required first

---

## Troubleshooting

### Issue: JSON Validation Fails
**Solution**: Use a JSON validator (jsonlint.com) to find syntax errors. Common issues:
- Missing comma after a key-value pair
- Extra comma before closing brace
- Mismatched brackets

### Issue: Unsure About Gecko ID Format
**Solution**: Use the email-like format: `gmail-calendar-options@kevinjohngallagher.com`
- This format is easier to read and remember
- Must be unique to your extension
- Cannot be changed after AMO submission

### Issue: Can't Find Background Section
**Solution**: Search for `"background"` in the file:
```bash
grep -n "background" src/manifest.firefox.json
```

---

## References

- [Firefox Manifest V3 Migration Guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- [Firefox browser_specific_settings Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
- [Firefox Background Scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
