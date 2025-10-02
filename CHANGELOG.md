# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.2.1] - 2025-10-02

### Changed
- **UI Polish**: Improved options page spacing
  - Changed fieldset padding from all sides to top-only (`padding-top: 1em`)
  - Added bottom margin to fieldsets (`margin-bottom: 1rem`)
  - Removed font-size override from experimental description text for consistency

## [2.2.0] - 2025-10-02

### Added
- **Experimental Features Section**: Added new "Experimental" section to options page
  - Empty section with descriptive text indicating features are in active testing
  - Localized with `experimental_legend` and `experimental_description` i18n keys
  - CSS styling for experimental description text
  - Prepares UI for upcoming experimental feature toggles (Phase 4)

### Changed
- **Documentation**: Added JSDoc `@stable` annotations to all existing features in preparation for experimental feature introduction
  - Annotated storage keys, enums, and configuration objects in `constants.js`
  - Annotated state variables and storage keys in `state.js`
  - Annotated filter detection functions in `filter.js`
- **Documentation**: Added Future Enhancements section to CLAUDE.md documenting proposed feature flag system for when experimental features scale beyond 3+ features

## [2.1.0] - 2025-10-02

### Changed
- **UI Update**: Changed active button color from Google Blue to Gmail Red (#d93025 in light mode, #f28b82 in dark mode) for better brand consistency

## [2.0.1] - 2025-10-01

### Changed
- **Branding Update**: Rebranded extension from "Gmail Calendar Options" to "Gmail Filter Toolbar" to better reflect expanded functionality
  - Updated extension name, description, and all user-facing strings
  - Package name updated to `gmail-filter-toolbar`
  - Emphasizes email filtering capabilities (calendar invites, attachments, starred messages, regular mail)
- **Documentation**: Updated README.md and CLAUDE.md with improved descriptions of filtering functionality and cross-browser compatibility

## [2.0.0] - 2025-10-01

### Added
- **Firefox Support**: Full Mozilla Firefox compatibility (Firefox ≥ 121)
  - Firefox-specific manifest with gecko ID `gmail-calendar-options@kevinjohngallagher.com`
  - Dual background script declaration (service_worker + scripts)
  - Cross-browser build system with environment-based manifest selection
- **Multi-Browser Build System**:
  - `npm run build:chrome` - Build Chrome/Edge version
  - `npm run build:firefox` - Build Firefox version
  - `npm run firefox:run` - Launch Firefox with extension for testing
  - `npm run firefox:lint` - Validate Firefox extension
  - `npm run firefox:package` - Create AMO-ready ZIP package
- **Distribution Scripts**:
  - `npm run release:build` - Build packages for both browsers
  - `npm run version:major/minor/patch` - Automated version management
  - Dual-browser release packaging with validation
- **Development Tools**:
  - `web-ext` integration for Firefox development workflow
  - `cross-env` for cross-platform environment variables
  - Automated manifest switching based on target browser

### Changed
- **Build System**: Vite config now uses `BROWSER` environment variable to select appropriate manifest
- **Pre-commit Hooks**: Now only run in WSL environment (skip on Windows Git GUI)
- **Test Coverage**: Excluded optional `browser-polyfill.js` from coverage requirements
- **Documentation**: Comprehensive Firefox support documentation in README.md and CLAUDE.md

### Technical
- All `chrome.*` APIs verified compatible with Firefox (no code changes required)
- Firefox uses background scripts instead of service workers (transparent to functionality)
- Optional browser API polyfill created for future compatibility
- Firefox manifest excludes Chrome-specific properties (`type: "module"` in content_scripts, CSP sandbox)

### Breaking Changes
- Major version bump due to significant new browser support and build system changes
- No breaking changes to existing Chrome/Edge functionality

## [1.1.1] - 2025-09-30
- docs: add `AGENTS.md` contributor guide for automation collaborators.
- i18n: add Hindi, Arabic, and Simplified Chinese locales; complete translations across existing language bundles.
- chore: bump extension version to 1.1.1.

## [1.1.0] - 2025-09-30
- feat: Dynamically set HTML lang attribute based on browser locale in options page.
- docs: Add future i18n roadmap items for completing translations and adding language switching UI.

## [1.0.0] - 2025-09-30
- chore: Major version bump to 1.0.0 marking stable release.
- test: Complete E2E test suite with 7 specs and Page Object Model pattern.
- test: Add WSL2-aware test infrastructure with automatic skip detection.
- test: Achieve 98.67% unit test coverage across 106 tests.
- chore: Implement automated pre-commit hooks (ESLint + unit tests).
- fix: Resolve ESLint errors in test files.
- fix: Update Husky pre-commit hook for v10 compatibility.
- fix: Make pre-commit hook resilient to npm PATH issues.
- chore: Add test artifacts to .gitignore.

## [0.1.0] - 2025-07-08
- feat: Implement granular attachment filtering (images, PDFs, documents, spreadsheets, presentations).
- feat: Move Favourites button to the end of the toolbar.
- fix: Refine Google Drive attachment identification to prevent false positives.
- fix: Include Google Docs in the general attachment filter.
- refactor: Remove "only" from all button labels in locales JSON.

## [0.0.13] - 2025-07-07
- feat: Add option to show/hide text on filter buttons.
- chore: Version bump to 0.0.13

## [0.0.12] - 2025-07-07
- chore: Version bump to 0.0.12

## [0.0.11] - 2025-07-07
- feat: Add new languages and linting for language files.
- refactor: Remove redundant files and clean up CSS.
- docs: Enhance contribution and security guidelines.

## [0.0.10] - 2025-07-05
- feat: Implement CTO review feedback up to Section 7 and revert Section 8 changes.

## [0.0.9] - 2025-07-05
- feat: Improve accessibility and fix pagination filter bug

## [0.0.5] - 2025-07-03
- chore(release): prepare for v0.0.5 release

## [0.0.4] - 2025-07-03
- chore: Update version to 0.0.4

## [0.0.3] - 2025-07-03
- fix: Correct manifest version to 0.0.3 (Chrome Web Store compatible)

## [0.0.2] - 2025-07-02
- refactor: Modularise contentScript.js

## [0.0.1] - 2025-07-02
- docs: Update and enhance README

## [0.0.0] - 2025-06-20
- Initial release.
