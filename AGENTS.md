# Repository Guidelines

## Project Structure & Module Organization
The extension source lives under `src/`, with feature logic in `src/modules/` (e.g., `background.js`, `filter.js`, `toolbar.js`) and shared helpers in `src/modules/utils/`. UI assets such as icons, styles, and option markup sit in `src/icons/`, `src/styles.css`, and `src/options.html`. Localized strings are versioned in `src/_locales/`. Jest specs mirror module names in `tests/` (for example `tests/filter.test.js`) with common bootstrapping in `tests/setup.js`. Production bundles are emitted to browser-specific directories: `dist/chrome/` and `dist/firefox/` via Vite.

## Build, Test, and Development Commands
Use `npm run build` to produce both Chrome and Firefox bundles in `dist/chrome/` and `dist/firefox/`. Use `npm run build:chrome` or `npm run build:firefox` to build a single browser. Run `npm test` for the Jest unit suite with preconfigured JSDOM shims. Execute `npm run e2e` for Playwright flows that exercise extension UI; install browsers once using `npx playwright install`. Lint code with `npm run lint`, and normalize formatting through `npm run format` before committing. When loading the extension in browsers, use `dist/chrome/` for Chrome/Edge and `dist/firefox/` for Firefox.

## Coding Style & Naming Conventions
Write ES2022 modules with top-level `import`/`export` syntax. Follow two-space indentation, single quotes, and 100-character lines enforced by Prettier. Use camelCase for variables and functions, PascalCase for exported factories, and kebab-case for asset filenames. Keep files organized by feature so `toolbar.js` pairs with `toolbar.test.js` and relevant assets.

## Testing Guidelines
Place new Jest specs beside their modules in `tests/`, wrapping suites in `describe('<module>')`. Stub DOM APIs through `tests/setup.js` instead of ad-hoc globals. Add at least one Playwright spec whenever a feature crosses background, content, or UI boundaries. Aim to keep unit tests deterministic and fast to support `npm test --watch` during development.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes such as `fix:`, `feat:`, or `chore:` with focused scope (e.g., `fix: adjust toolbar toggle`). Reference manual migration steps in the body when required. Pull requests should summarize the change, link relevant issues or tasks, and provide evidence of testing (command output or screenshots). Request review and wait for CI to pass before performing a squash merge.
