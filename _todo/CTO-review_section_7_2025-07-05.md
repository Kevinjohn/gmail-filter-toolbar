# PRD: Code Style Enforcement

## What we're trying to achieve

This section aims to enforce consistent code styling across the entire codebase, specifically focusing on the use of single quotes for strings. By running Prettier, an opinionated code formatter, we ensure that all JavaScript/TypeScript files adhere to a uniform style, improving readability and reducing cognitive load for developers. This also helps in maintaining a clean and consistent codebase, which is crucial for collaborative development.

## Detailed Task List

### Task 7.1: Apply Prettier

#### Sub-task 7.1.1: Run `npm run format` to enforce single quotes across the codebase.

1.  **Action:** Open your terminal or command prompt.

2.  **Action:** Navigate to the root directory of the project.
    *   **Command:** `cd /Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options`
    *   **Verification:** Ensure you are in the correct directory by listing its contents (`ls` or `dir`) and verifying that `package.json` is present.

3.  **Action:** Execute the Prettier formatting command.
    *   **Command:** `npm run format`
    *   **Explanation:** This command is defined in the `package.json` file and typically executes Prettier to reformat all supported files in the project according to the configuration in `.prettierrc.json`. This will automatically change double quotes to single quotes where applicable, among other formatting rules.

    *   **Expected Output:** The command will run and may output a list of files that were formatted. If no files needed formatting, it might indicate that all files are already correctly formatted.

    *   **Verification:** After the command completes, you can use `git status` to see which files have been modified by Prettier. Review some of the modified files (e.g., `src/contentScript.js`, `src/modules/state.js`) to visually confirm that string literals now primarily use single quotes.
[x]
