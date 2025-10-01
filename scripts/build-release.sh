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
