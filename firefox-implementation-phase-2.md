# Firefox Implementation - Phase 2: Build System Update

## Overview
Modify the Vite build configuration and npm scripts to support building separate Chrome and Firefox distributions from the same codebase.

## Prerequisites
- Phase 1 completed (Firefox manifest exists)
- Basic understanding of Node.js/npm
- Familiarity with reading JavaScript files

## Duration Estimate
60-90 minutes

---

## Step 1: Understand Current Build System

### 1.1 Review Current Build Script
```bash
# View current package.json scripts
cat package.json | grep -A 5 '"scripts"'
```

**Current behavior**: `npm run build` creates `dist/` folder with Chrome manifest.

### 1.2 Review Vite Configuration
```bash
# View current Vite config
cat vite.config.mjs
```

**Key observation**: Line 22 copies `src/manifest.json` to `dist/`

---

## Step 2: Install Firefox Development Tools

### 2.1 Add web-ext Dependency
```bash
npm install --save-dev web-ext
```

**Purpose**: `web-ext` is Mozilla's official tool for:
- Running Firefox with temporary extension
- Validating extension packages
- Building extension ZIP files

### 2.2 Verify Installation
```bash
npx web-ext --version
```

Expected output: `[version number]`

---

## Step 3: Create Separate Build Configurations

### 3.1 Read Current Vite Config

Open `vite.config.mjs` and understand its structure:

**Current structure**:
```javascript
export default defineConfig({
  build: { ... },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json', dest: '.' },
        // ... other files
      ]
    })
  ]
});
```

### 3.2 Create Parameterized Build Function

**Replace the entire `vite.config.mjs` file** with this:

```javascript
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Determine which manifest to use based on environment variable
const browser = process.env.BROWSER || 'chrome';
const manifestFile = browser === 'firefox'
  ? 'src/manifest.firefox.json'
  : 'src/manifest.json';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      /* ONE real entry stops the error */
      input: { background: 'src/modules/background.js', contentScript: 'src/contentScript.js' },
      /* keep the default file-naming */
      output: { entryFileNames: '[name].js' }
    },

    copyPublicDir: false
  },

  plugins: [
    viteStaticCopy({
      targets: [
        // Use dynamic manifest based on browser target
        { src: manifestFile, dest: '.', rename: 'manifest.json' },

        { src: 'src/styles.css',        dest: '.' },
        { src: 'src/colours.css',      dest: '.' },
        { src: 'src/options.html',      dest: '.' },
        { src: 'src/options.css',       dest: '.' },
        { src: 'src/modules/options.js', dest: 'modules' },
        { src: 'src/modules/constants.js', dest: 'modules' },
        { src: 'src/modules/theme.js', dest: 'modules' },
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' }, // if present
        { src: 'src/assets/fonts',          dest: '.' }
      ]
    })
  ]
});
```

**Key changes**:
- Line 4-7: Reads `BROWSER` environment variable
- Line 6: Selects Firefox manifest when `BROWSER=firefox`
- Line 21: Renames copied manifest to `manifest.json` in dist/

---

## Step 4: Update Package.json Scripts

### 4.1 Locate Scripts Section

Open `package.json` and find the `"scripts"` object.

### 4.2 Rename Existing Build Script

**Find**:
```json
  "build": "vite build",
```

**Replace with**:
```json
  "build": "vite build",
  "build:chrome": "vite build",
  "build:firefox": "BROWSER=firefox vite build",
```

**Why**:
- `npm run build` - defaults to Chrome (backward compatible)
- `npm run build:chrome` - explicitly builds Chrome version
- `npm run build:firefox` - builds Firefox version with Firefox manifest

### 4.3 Add Firefox Development Scripts

**After the build scripts**, add:

```json
  "firefox:run": "npm run build:firefox && web-ext run --source-dir dist --firefox-preview",
  "firefox:lint": "web-ext lint --source-dir dist",
  "firefox:package": "npm run build:firefox && web-ext build --source-dir dist --artifacts-dir artifacts/firefox",
```

**Scripts explained**:
- `firefox:run` - Builds and opens Firefox with extension loaded
- `firefox:lint` - Validates Firefox extension in dist/
- `firefox:package` - Creates distributable ZIP for AMO

### 4.4 Verify Scripts Section

Your scripts section should now look like:

```json
  "scripts": {
    "build": "vite build",
    "build:chrome": "vite build",
    "build:firefox": "BROWSER=firefox vite build",
    "firefox:run": "npm run build:firefox && web-ext run --source-dir dist --firefox-preview",
    "firefox:lint": "web-ext lint --source-dir dist",
    "firefox:package": "npm run build:firefox && web-ext build --source-dir dist --artifacts-dir artifacts/firefox",
    "lint": "eslint src tests --fix",
    "test": "node --experimental-vm-modules --experimental-json-modules node_modules/jest/bin/jest.js",
    // ... rest of existing scripts
  },
```

---

## Step 5: Handle Windows Compatibility

The `BROWSER=firefox` syntax works on Linux/macOS but fails on Windows.

### 5.1 Install cross-env

```bash
npm install --save-dev cross-env
```

**Purpose**: Sets environment variables in a cross-platform way.

### 5.2 Update Firefox Build Scripts

**In `package.json`, update these scripts**:

**Find**:
```json
  "build:firefox": "BROWSER=firefox vite build",
  "firefox:run": "npm run build:firefox && web-ext run --source-dir dist --firefox-preview",
  "firefox:package": "npm run build:firefox && web-ext build --source-dir dist --artifacts-dir artifacts/firefox",
```

**Replace with**:
```json
  "build:firefox": "cross-env BROWSER=firefox vite build",
  "firefox:run": "npm run build:firefox && cross-env web-ext run --source-dir dist --firefox-preview",
  "firefox:package": "npm run build:firefox && cross-env web-ext build --source-dir dist --artifacts-dir artifacts/firefox",
```

---

## Step 6: Create Artifacts Directory

### 6.1 Create Directory Structure
```bash
mkdir -p artifacts/firefox
```

### 6.2 Update .gitignore

**Open `.gitignore`** and add:

```
# Build artifacts
artifacts/
dist-firefox/
```

**Purpose**: Prevents build artifacts from being committed to Git.

---

## Step 7: Test the Build System

### 7.1 Test Chrome Build (Baseline)
```bash
npm run build:chrome
```

**Expected outcome**:
- `dist/` folder created
- `dist/manifest.json` contains Chrome manifest (no gecko ID)

**Verify**:
```bash
grep -q "browser_specific_settings" dist/manifest.json && echo "ERROR: Contains Firefox settings" || echo "✓ Chrome manifest correct"
```

### 7.2 Clean Build Directory
```bash
rm -rf dist/
```

### 7.3 Test Firefox Build
```bash
npm run build:firefox
```

**Expected outcome**:
- `dist/` folder created
- `dist/manifest.json` contains Firefox manifest (with gecko ID)

**Verify**:
```bash
grep -q "browser_specific_settings" dist/manifest.json && echo "✓ Firefox manifest correct" || echo "ERROR: Missing Firefox settings"
grep -q "gmail-calendar-options" dist/manifest.json && echo "✓ Gecko ID present" || echo "ERROR: Missing Gecko ID"
```

### 7.4 Validate Firefox Extension
```bash
npm run firefox:lint
```

**Expected outcome**:
- "Validation Summary" appears
- 0 errors
- Possible warnings (acceptable)

---

## Step 8: Test Firefox Launch (Optional)

### 8.1 Ensure Firefox is Installed

**Windows**: Download from https://www.mozilla.org/firefox/
**Linux**: `sudo apt install firefox` or `sudo snap install firefox`
**macOS**: Download from https://www.mozilla.org/firefox/

### 8.2 Launch Firefox with Extension
```bash
npm run firefox:run
```

**Expected outcome**:
- Firefox opens in a new profile
- Extension is loaded temporarily
- Console shows no errors

**Note**: Extension won't work yet (Gmail UI interaction needs Phase 3), but it should load without errors.

### 8.3 Close Firefox

Press `Ctrl+C` in terminal to stop the web-ext process.

---

## Step 9: Documentation Updates

### 9.1 Update README.md

**Find the "Building for Production" section** (around line 84).

**Add after the existing content**:

```markdown
### Building for Firefox

```bash
npm run build:firefox        # Build Firefox version to dist/
npm run firefox:lint         # Validate Firefox extension
npm run firefox:run          # Test in Firefox (opens browser)
npm run firefox:package      # Create .zip for Mozilla Add-ons
```

The Firefox build includes:
- `browser_specific_settings.gecko.id` for AMO submission
- Dual background script declaration (service_worker + scripts)
- Same host permissions (requires user approval in Firefox)

Upload the generated ZIP from `artifacts/firefox/` to:
- **Mozilla Add-ons (AMO)**: https://addons.mozilla.org/developers/
```

### 9.2 Update CLAUDE.md

**Add to the "Common Commands" section** (after npm run build):

```markdown
npm run build:chrome      # Build Chrome version (default)
npm run build:firefox     # Build Firefox version with gecko ID
npm run firefox:run       # Launch Firefox with extension loaded
npm run firefox:lint      # Validate Firefox extension
npm run firefox:package   # Create AMO-ready ZIP file
```

---

## Step 10: Create Distribution Scripts

### 10.1 Create Build Script for Both Browsers

Create `scripts/build-all.sh`:

```bash
#!/bin/bash
set -e

echo "🏗️  Building Chrome version..."
npm run build:chrome
mkdir -p artifacts/chrome
cp -r dist artifacts/chrome/

echo "🦊 Building Firefox version..."
npm run build:firefox
mkdir -p artifacts/firefox
cp -r dist artifacts/firefox/dist

echo "✅ Builds complete!"
echo "Chrome: artifacts/chrome/"
echo "Firefox: artifacts/firefox/"
```

### 10.2 Make Script Executable
```bash
chmod +x scripts/build-all.sh
```

### 10.3 Add Script to package.json

**Add to scripts section**:
```json
  "build:all": "bash scripts/build-all.sh",
```

---

## Verification Checklist

Before moving to Phase 3, verify:

- [ ] `web-ext` and `cross-env` installed in devDependencies
- [ ] `vite.config.mjs` uses environment variable to select manifest
- [ ] `npm run build:chrome` creates Chrome manifest in dist/
- [ ] `npm run build:firefox` creates Firefox manifest in dist/
- [ ] `npm run firefox:lint` passes with 0 errors
- [ ] `artifacts/firefox/` directory exists
- [ ] `.gitignore` excludes artifacts/
- [ ] README.md documents Firefox build commands
- [ ] CLAUDE.md updated with Firefox commands

---

## Files Created/Modified

**Modified Files**:
- `vite.config.mjs` - Added browser parameter and dynamic manifest
- `package.json` - Added build:firefox, firefox:run, firefox:lint, firefox:package scripts
- `.gitignore` - Added artifacts/ exclusion
- `README.md` - Added Firefox build documentation
- `CLAUDE.md` - Added Firefox commands

**New Files**:
- `scripts/build-all.sh` - Convenience script for building both versions

**New Directories**:
- `artifacts/firefox/` - Firefox build artifacts

---

## Next Steps

After completing Phase 2:
1. Proceed to **Phase 3: API Compatibility Layer**
2. Test both Chrome and Firefox builds work correctly
3. Verify no Chrome functionality was broken

---

## Troubleshooting

### Issue: "BROWSER" environment variable not working on Windows
**Solution**: Ensure `cross-env` is installed:
```bash
npm install --save-dev cross-env
```

### Issue: web-ext command not found
**Solution**: Use npx:
```bash
npx web-ext --version
```

### Issue: Firefox build creates Chrome manifest
**Solution**: Check environment variable is set:
```bash
# Linux/macOS
BROWSER=firefox npm run build

# Windows
cross-env BROWSER=firefox npm run build
```

### Issue: Validation errors about background.scripts
**Solution**: This is expected - Firefox will use `scripts`, Chrome will use `service_worker`. Both can coexist.

### Issue: Can't find Firefox browser
**Solution**: Specify Firefox path:
```bash
npx web-ext run --source-dir dist --firefox=/path/to/firefox
```

---

## References

- [web-ext documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [cross-env documentation](https://www.npmjs.com/package/cross-env)
