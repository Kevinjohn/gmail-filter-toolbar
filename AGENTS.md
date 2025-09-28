# Repository Guidelines

## Project Structure & Module Organization
The extension code resides in `src/`. `src/modules/` hosts logic modules like `background.js`, `filter.js`, and `toolbar.js`, with shared helpers under `utils/`. UI assets (icons, CSS, HTML) live in `src/icons/`, `options.html`, and `styles.css`, while localized strings are in `src/_locales/`. Built artifacts output to `dist/`. Tests for each module are in `tests/` (for example `filter.test.js`) with shared setup in `tests/setup.js`.

## Build, Test, and Development Commands
Use `npm run build` to generate the production bundle via Vite into `dist/`. `npm test` runs Jest unit suites with the experimental module flags already configured. `npm run e2e` invokes Playwright UI checks—run `npx playwright install` once if browsers are missing. `npm run lint` applies ESLint recommendations, and `npm run format` formats JS/CSS/HTML/JSON under `src/`.

## Coding Style & Naming Conventions
Write ES2022 modules with top-level `import`/`export`. Prefer camelCase for variables and functions, PascalCase for exported factories, and kebab-case for asset filenames. Keep files scoped by feature (`toolbar.js` pairs with `toolbar.test.js`). The project uses ESLint (`.eslintrc.cjs`) with the `eslint:recommended` ruleset and Prettier configured for single quotes and 100-character lines. Adopt two-space indentation, matching existing files.

## Testing Guidelines
Write Jest unit tests beside equivalent module names in `tests/`, using `describe('<module>')` blocks. Stub DOM APIs through `tests/setup.js` and prefer data attributes when targeting nodes. Add Playwright specs for user flows that cross background/content boundaries. Ensure new features include at least one Jest test and update localization fixtures when adding new strings.

## Commit & Pull Request Guidelines
Commits should follow Conventional Commits (e.g., `fix: adjust toolbar toggle`) as seen in `git log`. Keep commits focused and document manual migration steps in the body if required. Pull requests need a concise summary, testing evidence (command output or UI screenshots), and linked issue or task IDs. Request review before merging and wait for CI checks to pass prior to squash-merging.
