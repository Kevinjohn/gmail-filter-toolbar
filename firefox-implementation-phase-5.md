# Firefox Implementation - Phase 5: Distribution Setup

## Overview
Set up local build scripts for Firefox distribution and prepare for Mozilla Add-ons (AMO) submission. GitHub Actions CI/CD is optional and not covered in this phase.

## Prerequisites
- Phase 1-4 completed
- Firefox extension tested and working
- Mozilla Add-ons (AMO) account created (or will create in this phase)

## Duration Estimate
45-60 minutes (without CI/CD setup)

---

## Step 1: Mozilla Add-ons (AMO) Account Setup

### 1.1 Create AMO Developer Account

1. Visit https://addons.mozilla.org/developers/
2. Sign in with Firefox Account (or create one)
3. Accept Developer Agreement
4. Complete profile information

### 1.2 API Credentials (Optional - Skip for Now)

API credentials are only needed for automated CI/CD submissions. Since we're doing manual submissions, **skip this step** for now.

If you want automated submissions in the future, you can generate API credentials later at:
https://addons.mozilla.org/developers/addon/api/key/

---

## Step 2: Update .gitignore for Distribution

### 2.1 Review Current .gitignore

```bash
cat .gitignore
```

### 2.2 Add Firefox-Specific Entries

**Add to `.gitignore`**:

```
# Distribution artifacts
artifacts/
dist/
dist-chrome/
dist-firefox/

# Build outputs
*.zip
*.xpi

# Firefox profiles
*.gmail-calendar-test/
web-ext-artifacts/

# Build logs
npm-debug.log*
web-ext.log
```

---

## Step 3: Create Distribution Scripts

### 3.1 Create Release Build Script

Create `scripts/build-release.sh`:

```bash
#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
echo "🚀 Building release v${VERSION}"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ artifacts/

# Build Chrome version
echo "🏗️  Building Chrome version..."
npm run build:chrome
mkdir -p artifacts/chrome
cp -r dist artifacts/chrome/
cd artifacts/chrome/dist
zip -r "../gmail-calendar-options-chrome-v${VERSION}.zip" .
cd ../../..
echo "✅ Chrome package: artifacts/chrome/gmail-calendar-options-chrome-v${VERSION}.zip"

# Build Firefox version
echo "🦊 Building Firefox version..."
npm run build:firefox
mkdir -p artifacts/firefox
cp -r dist artifacts/firefox/
cd artifacts/firefox/dist
zip -r "../gmail-calendar-options-firefox-v${VERSION}.zip" .
cd ../../..
echo "✅ Firefox package: artifacts/firefox/gmail-calendar-options-firefox-v${VERSION}.zip"

# Validate Firefox package
echo "🔍 Validating Firefox package..."
npx web-ext lint --source-dir artifacts/firefox/dist

echo "✨ Release build complete!"
echo "Chrome:  artifacts/chrome/gmail-calendar-options-chrome-v${VERSION}.zip"
echo "Firefox: artifacts/firefox/gmail-calendar-options-firefox-v${VERSION}.zip"
```

### 3.2 Make Script Executable
```bash
chmod +x scripts/build-release.sh
```

### 3.3 Add Release Script to package.json

**Add to scripts section**:
```json
  "release:build": "bash scripts/build-release.sh",
```

### 3.4 Test Release Build
```bash
npm run release:build
```

**Verify**:
- [ ] Both ZIP files created in artifacts/
- [ ] Chrome ZIP contains Chrome manifest (no gecko ID)
- [ ] Firefox ZIP contains Firefox manifest (with gecko ID)
- [ ] Firefox package validates without errors

---

## Step 4: Prepare Store Listings

### 4.1 Create Store Listing Document

Create `docs/store-listings.md`:

```markdown
# Store Listings

## Extension Name
Gmail Calendar Options

## Short Description (132 chars max)
Filter Gmail emails by type: calendar invites, attachments, regular mail. Toggle visibility with one click.

## Full Description

### For Chrome Web Store

Toggle the visibility of calendar-related emails directly inside Gmail's web interface with one click.

**Features:**
- Filter emails by type: All Mail, Mail Only, Calendar Only, Attachments Only, Favourites Only
- Material Design icons for clean, modern interface
- Multiple themes: System, Light, Dark
- Toolbar positioning: Top or Bottom
- Debug mode for development
- Fully keyboard accessible (WCAG 2.1 AA compliant)
- Zero network calls - all filtering happens client-side
- Supports multiple languages and RTL layouts

**Privacy:**
This extension operates entirely within your browser. No data is collected, transmitted, or stored externally. All filtering is performed locally using Gmail's DOM.

**Permissions:**
- `storage`: Save your filter preferences
- `mail.google.com`: Access Gmail page to inject toolbar and filter emails

**Open Source:**
MIT License - View source code at [GitHub URL]

---

### For Mozilla Add-ons (AMO)

Toggle the visibility of calendar-related emails directly inside Gmail's web interface with one click.

**Features:**
- Filter emails by type: All Mail, Mail Only, Calendar Only, Attachments Only, Favourites Only
- Material Design icons for clean, modern interface
- Multiple themes: System, Light, Dark
- Toolbar positioning: Top or Bottom
- Debug mode for development
- Fully keyboard accessible (WCAG 2.1 AA compliant)
- Zero network calls - all filtering happens client-side
- Supports multiple languages and RTL layouts

**Firefox-Specific Notes:**
When first visiting Gmail, Firefox will prompt you to grant permissions to mail.google.com. This is required for the extension to inject its toolbar and filter emails.

**Privacy:**
This extension operates entirely within your browser. No data is collected, transmitted, or stored externally. All filtering is performed locally using Gmail's DOM.

**Permissions Explained:**
- `storage`: Save your filter preferences across browser sessions
- `host_permissions` for `mail.google.com`: Required to access Gmail's page content for toolbar injection and email filtering

**Open Source:**
MIT License - View source code at [GitHub URL]

## Categories

**Chrome Web Store:**
- Primary: Productivity
- Secondary: Accessibility

**Mozilla Add-ons:**
- Primary: Productivity
- Secondary: Other

## Tags/Keywords
gmail, calendar, filter, email, productivity, attachments, inbox, organization

## Support URL
https://github.com/Kevinjohn/chome-extension-gmail-calendar-options/issues

## Homepage URL
https://github.com/Kevinjohn/chome-extension-gmail-calendar-options

## Privacy Policy URL
[Create if required by stores, or state "No privacy policy required - extension collects no data"]
```

### 4.2 Prepare Screenshots

Ensure these screenshots exist in `docs/`:

```bash
ls docs/*.png
```

**Required screenshots**:
- [ ] `firefox-installation.png` - Extension icon in toolbar
- [ ] `firefox-toolbar.png` - Toolbar on Gmail with all buttons
- [ ] `firefox-debug-mode.png` - Debug mode active (blue tint)
- [ ] `firefox-rtl.png` - RTL layout (if applicable)
- [ ] `screenshot_default.png` - Default theme toolbar
- [ ] `screenshot_debug.png` - Debug mode comparison

**Optional but recommended**:
- Options page screenshot
- Different filter modes comparison
- Light vs Dark theme comparison

### 4.3 Optimize Screenshots for Stores

**Chrome Web Store requirements**:
- Dimensions: 1280x800 or 640x400
- Format: PNG or JPEG
- Max file size: 2MB

**Mozilla Add-ons requirements**:
- Minimum width: 400px
- Aspect ratio: 1:1 to 2:1 recommended
- Format: PNG or JPEG
- Max file size: 5MB

```bash
# Create optimized versions (requires ImageMagick)
mkdir -p docs/store-screenshots

# Resize for Chrome Web Store (1280x800)
for img in docs/screenshot*.png docs/firefox*.png; do
  convert "$img" -resize 1280x800 -background white -gravity center -extent 1280x800 "docs/store-screenshots/$(basename "$img")"
done
```

---

## Step 5: AMO Submission Preparation

### 5.1 Create AMO Submission Checklist

Create `docs/amo-submission-checklist.md`:

```markdown
# Mozilla Add-ons (AMO) Submission Checklist

## Pre-Submission

### Build
- [ ] Version number incremented in `package.json`
- [ ] Version number updated in `src/manifest.firefox.json`
- [ ] CHANGELOG.md updated with release notes
- [ ] Run `npm run release:build`
- [ ] Firefox package validates: `npm run firefox:lint`

### Testing
- [ ] Tested in Firefox ≥ 121
- [ ] All filter modes working
- [ ] Options page functional
- [ ] Keyboard navigation working
- [ ] No console errors
- [ ] Settings persist across restarts

### Documentation
- [ ] README.md up to date
- [ ] Store listing text prepared
- [ ] Screenshots captured and optimized
- [ ] Support/issue URL confirmed

## Submission Process

### 1. Log In to AMO
URL: https://addons.mozilla.org/developers/

### 2. Submit New Add-on
1. Click "Submit a New Add-on"
2. Choose "On this site" (AMO) not "On your own"
3. Upload: `artifacts/firefox/gmail-calendar-options-firefox-v[VERSION].zip`

### 3. Add-on Information

**Name:** Gmail Calendar Options

**Add-on URL:** gmail-calendar-options (auto-generated from gecko ID)

**Summary:** (132 chars)
Filter Gmail emails by type: calendar invites, attachments, regular mail. Toggle visibility with one click.

**Description:** [Paste from docs/store-listings.md]

**Categories:**
- Primary: Productivity
- Secondary: Other

**Tags:** gmail, calendar, filter, email, productivity, attachments

**Support Email:** [Your email]

**Support Website:** https://github.com/Kevinjohn/chome-extension-gmail-calendar-options/issues

**Homepage:** https://github.com/Kevinjohn/chome-extension-gmail-calendar-options

**License:** MIT License

### 4. Upload Screenshots
Upload all files from `docs/store-screenshots/`:
- Toolbar default view (set as primary)
- Debug mode
- Options page
- RTL (if applicable)

### 5. Technical Details

**Does this add-on work offline?**
Yes - all functionality is client-side

**Does this add-on have any privacy policies or EULA?**
No - extension collects no data

**Experimental?**
No

**Requires payment?**
No

**Is this a conversion from another browser?**
Yes - Originally developed for Chrome, now adapted for Firefox

### 6. Reviewer Notes

```
This extension injects a custom toolbar into Gmail's web interface to filter emails by type.

Key technical points:
1. Background script uses both service_worker and scripts declarations for cross-browser compatibility
2. Content script injects toolbar using insertAdjacentElement for stability
3. Uses MutationObserver to maintain filter state during Gmail's dynamic content updates
4. No external network calls - all filtering is DOM-based
5. Gmail selectors in src/modules/constants.js may need updates if Gmail changes its DOM

Source code available at: https://github.com/Kevinjohn/chome-extension-gmail-calendar-options

Chrome Web Store listing: [URL when available]

Please test on Gmail with a Google account. The toolbar appears below Gmail's native action bar.
```

### 7. Submit for Review

Click "Submit Version" and wait for automated validation.

## Post-Submission

### Automated Validation
- [ ] Passes automated linter
- [ ] No security warnings
- [ ] Manifest valid

### Manual Review (Wait Time: 1-7 days typically)
- [ ] Respond promptly to reviewer questions
- [ ] Make requested changes if any
- [ ] Resubmit if needed

### Once Approved
- [ ] Update README.md with AMO listing URL
- [ ] Announce on GitHub Releases
- [ ] Share on social media (optional)

### Future Updates
- [ ] Increment version number
- [ ] Update CHANGELOG.md
- [ ] Rebuild: `npm run release:build`
- [ ] Submit update through AMO dashboard
- [ ] Add "Changes in this version" notes
```

### 5.2 Review Firefox Policies

Read important AMO policies:

```bash
# Create policy summary
cat > docs/amo-policies-summary.md << 'EOF'
# AMO Policy Summary

## Key Policies to Follow

### 1. No Obfuscation
All code must be readable. Don't minify production builds for AMO submission.

**Action:** Ensure Vite build does NOT minify for Firefox:
- Check vite.config.mjs
- Verify dist/ files are readable

### 2. Source Code
May be requested if build process is complex.

**Action:** Link to GitHub repository in reviewer notes.

### 3. Host Permissions
Must clearly explain why mail.google.com access is needed.

**Action:** Included in listing description.

### 4. Remote Code Execution
Absolutely prohibited - no eval(), Function(), or remote script loading.

**Action:** Extension doesn't use any remote code - verified ✓

### 5. Data Collection
If collecting ANY data, must have privacy policy.

**Action:** Extension collects nothing - no policy needed ✓

### 6. Respect User Consent
Don't make changes user didn't request.

**Action:** All features are opt-in or toggleable ✓

## Links
- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Review Policies](https://extensionworkshop.com/documentation/publish/review-policies/)
EOF
```

---

## Step 6: Update Version Management

### 6.1 Create Version Bump Script

Create `scripts/bump-version.sh`:

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/bump-version.sh [major|minor|patch]"
  exit 1
fi

TYPE=$1

echo "🔢 Bumping $TYPE version..."

# Bump version in package.json
npm version $TYPE --no-git-tag-version

# Get new version
VERSION=$(node -p "require('./package.json').version")
echo "New version: $VERSION"

# Update Firefox manifest
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src/manifest.firefox.json
rm src/manifest.firefox.json.bak

# Update Chrome manifest
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src/manifest.json
rm src/manifest.json.bak

echo "✅ Version bumped to $VERSION"
echo "Next steps:"
echo "1. Update CHANGELOG.md"
echo "2. Commit changes: git commit -am 'chore: bump version to $VERSION'"
echo "3. Create tag: git tag v$VERSION"
echo "4. Push: git push && git push --tags"
```

### 6.2 Make Script Executable
```bash
chmod +x scripts/bump-version.sh
```

### 6.3 Add to package.json

**Add to scripts**:
```json
  "version:major": "bash scripts/bump-version.sh major",
  "version:minor": "bash scripts/bump-version.sh minor",
  "version:patch": "bash scripts/bump-version.sh patch",
```

---

## Step 7: Create Release Documentation

### 7.1 Create Release Process Guide

Create `docs/release-process.md`:

```markdown
# Release Process

## Prerequisites
- All tests passing
- CHANGELOG.md updated
- Firefox and Chrome builds tested manually

## Steps

### 1. Version Bump
```bash
# Choose one:
npm run version:patch  # Bug fixes (1.1.1 -> 1.1.2)
npm run version:minor  # New features (1.1.2 -> 1.2.0)
npm run version:major  # Breaking changes (1.2.0 -> 2.0.0)
```

### 2. Update CHANGELOG.md
Move items from "Unreleased" to new version section:

```markdown
## [1.2.0] - 2025-10-15

### Added
- Firefox support
- New filter mode

### Fixed
- Bug with pagination
```

### 3. Commit Version Bump
```bash
git add package.json src/manifest.json src/manifest.firefox.json CHANGELOG.md
git commit -m "chore: release v1.2.0"
```

### 4. Create Git Tag
```bash
git tag v1.2.0
```

### 5. Build Release Packages
```bash
npm run release:build
```

This creates distribution-ready ZIP files in `artifacts/` folder.

### 6. Push to GitHub
```bash
git push origin main
git push origin v1.2.0
```

### 7. Create GitHub Release (Manual)
1. Go to https://github.com/YOUR_USERNAME/chome-extension-gmail-calendar-options/releases
2. Click "Draft a new release"
3. Choose tag: `v1.2.0`
4. Release title: `v1.2.0`
5. Add release notes from CHANGELOG.md
6. Attach files from `artifacts/`:
   - `gmail-calendar-options-chrome-v1.2.0.zip`
   - `gmail-calendar-options-firefox-v1.2.0.zip`
7. Publish release

### 8. Submit to Stores

#### Chrome Web Store
1. Go to Chrome Developer Dashboard
2. Upload `artifacts/chrome/gmail-calendar-options-chrome-v1.2.0.zip`
3. Update listing if needed
4. Submit for review

#### Mozilla Add-ons
1. Go to https://addons.mozilla.org/developers/
2. Select extension
3. Click "Upload New Version"
4. Upload `artifacts/firefox/gmail-calendar-options-firefox-v1.2.0.zip`
5. Add version notes
6. Submit for review

### 9. Post-Release
- [ ] Update README.md with store links (if first release)
- [ ] Announce on GitHub Discussions/Releases
- [ ] Monitor review status on both stores

## Troubleshooting

### Build Script Fails
Check `npm run release:build` output. Common issues:
- Missing dependencies: Run `npm ci`
- Vite errors: Check `vite.config.mjs`
- Permission errors: Check file permissions on `scripts/`

### Store Rejection
Read reviewer feedback carefully:
- Update code as requested
- Bump version again (patch)
- Resubmit

### Version Mismatch
If manifests and package.json versions don't match:
```bash
# Manually sync
VERSION=$(node -p "require('./package.json').version")
# Update manifests to match
```
```

---

## Step 8: Document Deployment

### 8.1 Update README.md

**Add new section after "## Road-map"**:

```markdown
## Distribution

### Official Stores
- **Chrome Web Store**: [Coming Soon / Link when published]
- **Mozilla Add-ons**: [Coming Soon / Link when published]
- **Edge Add-ons**: Compatible with Chrome version

### Manual Installation

#### Chrome/Edge
1. Download latest release: [GitHub Releases](https://github.com/Kevinjohn/chome-extension-gmail-calendar-options/releases)
2. Extract `gmail-calendar-options-chrome-*.zip`
3. Open `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked" → select extracted folder

#### Firefox
1. Download latest release: [GitHub Releases](https://github.com/Kevinjohn/chome-extension-gmail-calendar-options/releases)
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `gmail-calendar-options-firefox-*.zip` file

**Note**: Firefox temporary installations are removed when browser closes. Wait for AMO approval for permanent installation.
```

### 8.2 Update CONTRIBUTING.md

**Add release section**:

```markdown
## Releasing

### For Maintainers

1. **Bump version**: `npm run version:patch` (or minor/major)
2. **Update CHANGELOG.md**: Move "Unreleased" items to new version
3. **Commit**: `git commit -am "chore: release vX.Y.Z"`
4. **Tag**: `git tag vX.Y.Z`
5. **Build releases**: `npm run release:build`
6. **Create GitHub Release manually**:
   - Go to GitHub Releases
   - Draft new release
   - Choose tag vX.Y.Z
   - Attach ZIP files from `artifacts/` folder
   - Publish release
7. **Submit to stores**:
   - Chrome Web Store: Manual upload from artifacts/chrome/
   - Mozilla Add-ons: Manual upload from artifacts/firefox/

See [docs/release-process.md](docs/release-process.md) for detailed steps.
```

---

## Verification Checklist

Phase 5 complete when:

- [ ] AMO developer account created
- [ ] .gitignore updated for artifacts
- [ ] Release build script created and tested
- [ ] Store listings prepared
- [ ] Screenshots optimized
- [ ] AMO submission checklist created
- [ ] AMO policies reviewed
- [ ] Version bump script created
- [ ] Release process documented
- [ ] README.md updated with distribution info
- [ ] CONTRIBUTING.md updated with release process

---

## Files Created/Modified

**New Files**:
- `scripts/build-release.sh` - Release build script
- `scripts/bump-version.sh` - Version management script
- `docs/store-listings.md` - Store description templates
- `docs/amo-submission-checklist.md` - Submission checklist
- `docs/amo-policies-summary.md` - AMO policy summary
- `docs/release-process.md` - Release guide
- `docs/store-screenshots/` - Optimized screenshots for stores

**Modified Files**:
- `.gitignore` - Added artifacts and build outputs
- `package.json` - Added release:build, version:* scripts
- `README.md` - Added Distribution section
- `CONTRIBUTING.md` - Added Releasing section

**Optional (Not Created)**:
- `.github/workflows/` - GitHub Actions can be added later if desired

---

## Next Steps

After completing Phase 5:

1. **First Release**:
   - Run `npm run version:minor` to bump to next version
   - Update CHANGELOG.md
   - Create Git tag: `git tag vX.Y.Z && git push --tags`
   - Build release packages: `npm run release:build`
   - Create GitHub Release manually and attach artifacts
   - Submit Firefox version to AMO
   - Submit Chrome version to Chrome Web Store (if not already published)

2. **Monitor Submissions**:
   - Check AMO review status daily
   - Respond to reviewer feedback promptly
   - Update code if requested

3. **Post-Approval**:
   - Update README.md with store links
   - Announce Firefox support
   - Update documentation with Firefox-specific user instructions

4. **Optional: Set Up CI/CD Later**:
   - If desired, add GitHub Actions workflows for automated builds
   - See [GitHub Actions documentation](https://docs.github.com/actions) for guidance
   - Can automate the `npm run release:build` step

---

## Troubleshooting

### Issue: Release build script fails
**Solution**: Check that all dependencies are installed:
```bash
npm ci
npm run build:chrome
npm run build:firefox
```

### Issue: AMO validation fails
**Common causes**:
- Manifest errors: Run `npm run firefox:lint`
- Obfuscated code: Check Vite isn't minifying
- Missing permissions: Verify manifest permissions section

**Solution**: Check AMO validator output carefully and fix reported issues.

### Issue: Version bump script doesn't update all manifests
**Solution**: Manually verify all version numbers match:
```bash
grep '"version"' package.json src/manifest.json src/manifest.firefox.json
```

### Issue: Pre-commit hooks running on Windows Git GUI
**Solution**: Hooks now check for WSL environment and skip on Windows. If still running, verify `.husky/pre-commit` has the WSL detection at the top of the file.

---

## References

- [Mozilla Add-ons Submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [AMO Review Process](https://extensionworkshop.com/documentation/publish/add-on-review-process/)
- [Chrome Web Store Publish](https://developer.chrome.com/docs/webstore/publish/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases Guide](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
