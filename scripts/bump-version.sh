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
